import { Router } from "express";
import crypto from "crypto";
import { db, shopsTable, servicesTable, bookingsTable } from "@workspace/db";
import { eq, and, inArray, gte } from "drizzle-orm";
import { generateOtp } from "../lib/auth.js";
import { assignChair, addMinutes } from "../lib/slots.js";
import { requireCustomerAuth, CustomerAuthRequest } from "../middleware/auth.js";

const router = Router();

const BUFFER_MINUTES = 10;

function serializeBooking(b: typeof bookingsTable.$inferSelect, service?: typeof servicesTable.$inferSelect) {
  const { arrivalOtp: _otp, ...rest } = b;
  return {
    ...rest,
    createdAt: b.createdAt.toISOString(),
    service: service ?? null,
  };
}

// POST /payments/create-order
// Creates a Razorpay order server-side. Amount comes from DB, not client.
router.post("/payments/create-order", requireCustomerAuth, async (req: CustomerAuthRequest, res) => {
  const { slug, serviceId, paymentType } = req.body;

  if (!slug || typeof slug !== "string") {
    return res.status(400).json({ error: "slug is required" });
  }
  if (!serviceId || typeof serviceId !== "number") {
    return res.status(400).json({ error: "serviceId is required and must be a number" });
  }
  if (!paymentType || !["token", "full"].includes(paymentType)) {
    return res.status(400).json({ error: "paymentType must be 'token' or 'full'" });
  }

  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];

  const services = await db
    .select()
    .from(servicesTable)
    .where(and(eq(servicesTable.id, Number(serviceId)), eq(servicesTable.shopId, shop.id)));

  if (services.length === 0) return res.status(404).json({ error: "Service not found" });
  const service = services[0];

  // Option C: ₹5 platform fee for token, full price as deposit for "full"
  const amountInr = paymentType === "full" ? service.price : 5;
  const amountPaisa = amountInr * 100; // Razorpay uses smallest currency unit

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // Dev mode: if no Razorpay keys, return a fake order for testing
  if (!keyId || !keySecret) {
    req.log.warn("RAZORPAY_KEY_ID/SECRET missing — returning mock order for dev mode");
    return res.json({
      orderId: `order_dev_${Date.now()}`,
      amount: amountPaisa,
      currency: "INR",
      keyId: "rzp_test_dev_mode",
      devMode: true,
    });
  }

  try {
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount: amountPaisa,
        currency: "INR",
        receipt: `booking_${slug}_${Date.now()}`,
        notes: {
          slug,
          serviceId: String(serviceId),
          paymentType,
          customerPhone: req.customerPhone,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      req.log.error({ status: response.status, body: errBody }, "Razorpay order creation failed");
      return res.status(502).json({ error: "Payment gateway error" });
    }

    const order = (await response.json()) as { id: string; amount: number; currency: string };

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (err) {
    req.log.error(err, "Razorpay API error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /payments/verify
// Verifies Razorpay signature and creates the booking only if valid.
router.post("/payments/verify", requireCustomerAuth, async (req: CustomerAuthRequest, res) => {
  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    slug,
    customerName,
    serviceId,
    slotDate,
    slotTime,
    paymentType,
  } = req.body;

  const customerPhone = req.customerPhone!;

  // --- Input validation ---
  if (!slug || typeof slug !== "string") {
    return res.status(400).json({ error: "slug is required" });
  }
  if (!customerName || typeof customerName !== "string") {
    return res.status(400).json({ error: "customerName is required" });
  }
  if (!serviceId || typeof serviceId !== "number") {
    return res.status(400).json({ error: "serviceId is required and must be a number" });
  }
  if (!slotDate || typeof slotDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(slotDate)) {
    return res.status(400).json({ error: "slotDate is required in YYYY-MM-DD format" });
  }
  if (!slotTime || typeof slotTime !== "string" || !/^\d{2}:\d{2}$/.test(slotTime)) {
    return res.status(400).json({ error: "slotTime is required in HH:MM format" });
  }
  if (!paymentType || !["token", "full"].includes(paymentType)) {
    return res.status(400).json({ error: "paymentType must be 'token' or 'full'" });
  }

  // --- Razorpay signature verification ---
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const isDevMode = !keySecret;

  if (!isDevMode) {
    // Production: verify HMAC-SHA256 signature
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing Razorpay payment details" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    // Timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(razorpay_signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      req.log.error({ razorpay_order_id, razorpay_payment_id }, "Razorpay signature verification failed");
      return res.status(400).json({ error: "Payment verification failed — invalid signature" });
    }

    req.log.info({ razorpay_order_id, razorpay_payment_id }, "Razorpay signature verified");
  } else {
    req.log.warn("RAZORPAY_KEY_SECRET missing — skipping signature verification (dev mode)");
  }

  // --- Create the booking (same logic as POST /shops/:slug/bookings) ---
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];

  if (!shop.isOpen) return res.status(400).json({ error: "Shop is currently closed" });
  if (shop.isPaused && (!shop.pausedUntil || shop.pausedUntil > new Date())) {
    return res.status(400).json({ error: "Bookings are paused" });
  }

  const services = await db
    .select()
    .from(servicesTable)
    .where(and(eq(servicesTable.id, Number(serviceId)), eq(servicesTable.shopId, shop.id)));

  if (services.length === 0) return res.status(400).json({ error: "Service not found" });
  const service = services[0];

  // Validate booking date range
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  if (slotDate < today) {
    return res.status(400).json({ error: "Cannot book for past dates" });
  }
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  if (slotDate > maxDate.toISOString().split("T")[0]) {
    return res.status(400).json({ error: "Cannot book more than 30 days in advance" });
  }

  // Check advance booking rule (2 hours in advance for same-day)
  if (slotDate === today) {
    const [h, m] = slotTime.split(":").map(Number);
    const slotMinutes = h * 60 + m;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (slotMinutes < nowMinutes + 120) {
      return res.status(400).json({ error: "Bookings must be made at least 2 hours in advance" });
    }
  }

  const totalDuration = service.durationMinutes + BUFFER_MINUTES;
  const slotEndTime = addMinutes(slotTime, totalDuration);

  // Resource exhaustion checks
  const upcomingBookings = await db
    .select()
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.customerPhone, customerPhone),
        inArray(bookingsTable.status, ["pending", "confirmed"]),
        gte(bookingsTable.slotDate, today)
      )
    );

  if (upcomingBookings.length >= 3) {
    return res.status(403).json({ error: "You have reached the global maximum limit of 3 upcoming bookings." });
  }

  const sameDayShopBookings = upcomingBookings.filter(b => b.shopId === shop.id && b.slotDate === slotDate);
  if (sameDayShopBookings.length >= 2) {
    return res.status(403).json({ error: "Maximum of 2 bookings per day per shop allowed." });
  }

  // Check for overlaps
  for (const b of sameDayShopBookings) {
    if (slotTime < b.slotEndTime && slotEndTime > b.slotTime) {
      return res.status(409).json({ error: "You already have an overlapping booking at this time." });
    }
  }

  const amountPaid = paymentType === "full" ? service.price : 5;
  const arrivalOtp = generateOtp();

  try {
    const [booking] = await db.transaction(async (tx) => {
      const chairNumber = await assignChair(tx, shop.id, shop.numChairs, slotDate, slotTime, slotEndTime);
      if (chairNumber === null) {
        throw new Error("NO_CHAIRS_AVAILABLE");
      }

      return tx
        .insert(bookingsTable)
        .values({
          shopId: shop.id,
          serviceId: service.id,
          customerName,
          customerPhone,
          slotDate,
          slotTime,
          slotEndTime,
          chairNumber,
          status: "confirmed",
          paymentType,
          amountPaid,
          totalAmount: service.price,
          arrivalOtp,
        })
        .returning();
    });

    req.log.info(
      { bookingId: booking.id, customerPhone, razorpay_order_id: razorpay_order_id || "dev" },
      "Booking created via payment verification"
    );
    const serialized = serializeBooking(booking, service);
    return res.status(201).json({ ...serialized, arrivalOtp });
  } catch (err: any) {
    if (err.message === "NO_CHAIRS_AVAILABLE") {
      return res.status(409).json({ error: "No chairs available for this slot" });
    }
    throw err;
  }
});

export default router;
