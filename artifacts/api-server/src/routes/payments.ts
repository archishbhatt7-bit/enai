import { Router } from "express";
import crypto from "crypto";
import { db, shopsTable, servicesTable, bookingsTable, paymentOrdersTable } from "@workspace/db";
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
// Creates a Razorpay order server-side and saves booking details intent.
router.post("/payments/create-order", requireCustomerAuth, async (req: CustomerAuthRequest, res) => {
  const { slug, serviceId, paymentType, customerName, slotDate, slotTime } = req.body;
  const customerPhone = req.customerPhone!;

  if (!slug || typeof slug !== "string") return res.status(400).json({ error: "slug is required" });
  if (!serviceId || typeof serviceId !== "number") return res.status(400).json({ error: "serviceId is required" });
  if (!paymentType || !["token", "full"].includes(paymentType)) return res.status(400).json({ error: "invalid paymentType" });
  if (!customerName || typeof customerName !== "string") return res.status(400).json({ error: "customerName is required" });
  if (!slotDate || typeof slotDate !== "string") return res.status(400).json({ error: "slotDate is required" });
  if (!slotTime || typeof slotTime !== "string") return res.status(400).json({ error: "slotTime is required" });

  const [shops, services] = await Promise.all([
    db.select({ id: shopsTable.id }).from(shopsTable).where(eq(shopsTable.slug, slug)),
    db.select().from(servicesTable).where(eq(servicesTable.id, Number(serviceId)))
  ]);

  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  if (services.length === 0) return res.status(404).json({ error: "Service not found" });

  const shop = shops[0];
  const service = services[0];
  if (service.shopId !== shop.id) return res.status(404).json({ error: "Service not found in this shop" });

  const amountInr = paymentType === "full" ? service.price : 5;
  const amountPaisa = amountInr * 100;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  let orderId = `order_dev_${Date.now()}`;
  let isDevMode = !keyId || !keySecret;

  if (!isDevMode) {
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
        }),
      });

      if (!response.ok) {
        req.log.error({ status: response.status, body: await response.text() }, "Razorpay order creation failed");
        return res.status(502).json({ error: "Payment gateway error" });
      }

      const order = await response.json();
      orderId = order.id;
    } catch (err) {
      req.log.error(err, "Razorpay API error");
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // Save the intent in paymentOrdersTable
  await db.insert(paymentOrdersTable).values({
    orderId,
    shopId: shop.id,
    serviceId: service.id,
    customerName,
    customerPhone,
    slotDate,
    slotTime,
    paymentType,
    amount: amountInr,
  });

  return res.json({
    orderId,
    amount: amountPaisa,
    currency: "INR",
    keyId: isDevMode ? "rzp_test_dev_mode" : keyId,
    devMode: isDevMode,
  });
});

// Idempotent fulfil function
async function fulfilBooking(orderId: string, paymentId: string, log: any) {
  // Check if it's already fulfilled
  const existing = await db.select().from(bookingsTable).where(eq(bookingsTable.razorpayOrderId, orderId));
  if (existing.length > 0) {
    log.info({ orderId, paymentId }, "Booking already fulfilled");
    return { status: 200, booking: existing[0] };
  }

  // Fetch the saved intent
  const intents = await db.select().from(paymentOrdersTable).where(eq(paymentOrdersTable.orderId, orderId));
  if (intents.length === 0) {
    return { status: 404, error: "Order details not found on server" };
  }
  const intent = intents[0];

  const [shops, services] = await Promise.all([
    db.select().from(shopsTable).where(eq(shopsTable.id, intent.shopId)),
    db.select().from(servicesTable).where(eq(servicesTable.id, intent.serviceId))
  ]);
  const shop = shops[0];
  const service = services[0];

  if (!shop || !service) return { status: 404, error: "Shop or Service not found" };
  if (!shop.isOpen) return { status: 400, error: "Shop is currently closed" };
  if (shop.isPaused && (!shop.pausedUntil || shop.pausedUntil > new Date())) {
    return { status: 400, error: "Bookings are paused" };
  }

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const slotEndTime = addMinutes(intent.slotTime, service.durationMinutes + BUFFER_MINUTES);

  // Resource exhaustion checks
  const upcomingBookings = await db
    .select()
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.customerPhone, intent.customerPhone),
        inArray(bookingsTable.status, ["pending", "confirmed"]),
        gte(bookingsTable.slotDate, today)
      )
    );

  if (upcomingBookings.length >= 3) return { status: 403, error: "Global max 3 bookings limit reached." };
  
  const sameDayShopBookings = upcomingBookings.filter(b => b.shopId === shop.id && b.slotDate === intent.slotDate);
  if (sameDayShopBookings.length >= 2) return { status: 403, error: "Max 2 bookings per day per shop." };

  for (const b of sameDayShopBookings) {
    if (intent.slotTime < b.slotEndTime && slotEndTime > b.slotTime) {
      return { status: 409, error: "Overlapping booking exists." };
    }
  }

  const arrivalOtp = generateOtp();

  try {
    const [booking] = await db.transaction(async (tx) => {
      const chairNumber = await assignChair(tx, shop.id, shop.numChairs, intent.slotDate, intent.slotTime, slotEndTime);
      if (chairNumber === null) {
        throw new Error("NO_CHAIRS_AVAILABLE");
      }

      return tx.insert(bookingsTable).values({
        shopId: shop.id,
        serviceId: service.id,
        customerName: intent.customerName,
        customerPhone: intent.customerPhone,
        slotDate: intent.slotDate,
        slotTime: intent.slotTime,
        slotEndTime,
        chairNumber,
        status: "confirmed",
        paymentType: intent.paymentType,
        amountPaid: intent.amount,
        totalAmount: service.price,
        arrivalOtp,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
      }).returning();
    });

    log.info({ bookingId: booking.id, orderId }, "Booking created via fulfil");
    return { status: 201, booking, service };
  } catch (err: any) {
    if (err.message === "NO_CHAIRS_AVAILABLE") {
      log.error({ orderId, paymentId }, "No chairs available during fulfil - Triggering automatic refund");
      
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      
      if (keyId && keySecret && paymentId && paymentId !== "dev") {
        try {
          await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
            }
          });
          log.info({ paymentId }, "Automatic refund processed");
        } catch (refundErr) {
          log.error({ paymentId, refundErr }, "Failed to process automatic refund");
        }
      }
      
      return { status: 409, error: "No chairs available for this slot" };
    }
    throw err;
  }
}

// POST /payments/verify
router.post("/payments/verify", requireCustomerAuth, async (req: CustomerAuthRequest, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
  if (!razorpay_order_id) return res.status(400).json({ error: "Missing order ID" });

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  if (keySecret) {
    if (!razorpay_payment_id || !razorpay_signature) return res.status(400).json({ error: "Missing payment details" });
    
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const sigBuffer = Buffer.from(razorpay_signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      req.log.error({ razorpay_order_id }, "Signature verification failed");
      return res.status(400).json({ error: "Invalid signature" });
    }
  }

  // Ensure this order belongs to the calling user
  const intents = await db.select().from(paymentOrdersTable).where(eq(paymentOrdersTable.orderId, razorpay_order_id));
  if (intents.length > 0 && intents[0].customerPhone !== req.customerPhone) {
    return res.status(403).json({ error: "Order belongs to a different user" });
  }

  const result = await fulfilBooking(razorpay_order_id, razorpay_payment_id || "dev", req.log);
  if (result.error) return res.status(result.status).json({ error: result.error });
  
  return res.status(result.status).json({
    ...serializeBooking(result.booking, result.service),
    arrivalOtp: result.booking.arrivalOtp,
  });
});

// POST /payments/webhook
router.post("/payments/webhook", async (req: any, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return res.status(500).send("Webhook secret not configured");

  const signature = req.headers["x-razorpay-signature"];
  if (!signature || !req.rawBody) return res.status(400).send("Invalid request");

  const expectedSignature = crypto.createHmac("sha256", secret).update(req.rawBody).digest("hex");
  if (expectedSignature !== signature) {
    req.log.error("Webhook signature mismatch");
    return res.status(400).send("Invalid signature");
  }

  const payload = req.body;
  if (payload.event === "payment.captured" || payload.event === "order.paid") {
    const payment = payload.payload.payment.entity;
    const orderId = payment.order_id;
    const paymentId = payment.id;
    
    if (!orderId || !paymentId) return res.status(400).send("Missing IDs");

    const result = await fulfilBooking(orderId, paymentId, req.log);
    if (result.error && result.status !== 409) {
      // Return 500 so Razorpay retries (e.g. DB down)
      return res.status(500).send(result.error);
    }
    // Return 200 even on 409 (No chairs) because we will handle refunds asynchronously
    return res.status(200).send("OK");
  }

  return res.status(200).send("Ignored");
});

export default router;
