import { Router } from "express";
import { db, shopsTable, servicesTable, bookingsTable } from "@workspace/db";
import { eq, and, inArray, gte } from "drizzle-orm";
import { getAvailableSlots, assignChair, addMinutes } from "../lib/slots";
import { generateOtp } from "../lib/auth";
import { requireOwnerAuth, OwnerAuthRequest, requireCustomerAuth, CustomerAuthRequest } from "../middleware/auth";

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

// GET /shops/:slug/slots/:date/:serviceId
router.get("/shops/:slug/slots/:date/:serviceId", async (req, res) => {
  const slug = req.params.slug as string;
  const date = req.params.date as string;
  const serviceId = req.params.serviceId as string;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];

  // Check if paused expiry
  let isPaused = shop.isPaused;
  if (isPaused && shop.pausedUntil && shop.pausedUntil < new Date()) {
    await db.update(shopsTable).set({ isPaused: false, pausedUntil: null }).where(eq(shopsTable.id, shop.id));
    isPaused = false;
  }

  const services = await db
    .select()
    .from(servicesTable)
    .where(and(eq(servicesTable.id, Number(serviceId)), eq(servicesTable.shopId, shop.id)));

  if (services.length === 0) return res.status(404).json({ error: "Service not found" });
  const service = services[0];

  const slots = await getAvailableSlots(
    shop.id,
    shop.numChairs,
    date,
    service.durationMinutes,
    shop.openTime,
    shop.closeTime
  );

  return res.json({
    date,
    slots,
    shopIsOpen: shop.isOpen,
    shopIsPaused: isPaused,
  });
});

// GET /shops/:slug/bookings
router.get("/shops/:slug/bookings", requireOwnerAuth, async (req: OwnerAuthRequest, res) => {
  const slug = req.params.slug as string;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];
  if (shop.ownerId !== req.ownerId) return res.status(403).json({ error: "Forbidden" });

  const rawBookings = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.shopId, shops[0].id));

  const services = await db.select().from(servicesTable).where(eq(servicesTable.shopId, shops[0].id));
  const serviceMap = new Map(services.map((s) => [s.id, s]));

  const result = rawBookings.map((b) => serializeBooking(b, serviceMap.get(b.serviceId)));
  return res.json(result);
});

// POST /shops/:slug/bookings
router.post("/shops/:slug/bookings", requireCustomerAuth, async (req: CustomerAuthRequest, res) => {
  const slug = req.params.slug as string;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];

  if (!shop.isOpen) return res.status(400).json({ error: "Shop is currently closed" });
  if (shop.isPaused && (!shop.pausedUntil || shop.pausedUntil > new Date())) {
    return res.status(400).json({ error: "Bookings are paused" });
  }

  const { customerName, serviceId, slotDate, slotTime, paymentType } = req.body;
  const customerPhone = req.customerPhone!;
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

  // Resource exhaustion checks (Fix #25)
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

  // Check for overlaps with sameDayShopBookings
  for (const b of sameDayShopBookings) {
    if (slotTime < b.slotEndTime && slotEndTime > b.slotTime) {
      return res.status(409).json({ error: "You already have an overlapping booking at this time." });
    }
  }

  const amountPaid = paymentType === "full" ? service.price : 1;
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

    req.log.info({ bookingId: booking.id, customerPhone }, "Booking created");
    const serialized = serializeBooking(booking, service);
    // Include the arrivalOtp in the creation response so the customer can see it
    return res.status(201).json({ ...serialized, arrivalOtp });
  } catch (err: any) {
    if (err.message === "NO_CHAIRS_AVAILABLE") {
      return res.status(409).json({ error: "No chairs available for this slot" });
    }
    throw err;
  }
});

// POST /shops/:slug/bookings/:bookingId/verify-otp
router.post("/shops/:slug/bookings/:bookingId/verify-otp", requireOwnerAuth, async (req: OwnerAuthRequest, res) => {
  const slug = req.params.slug as string;
  const bookingId = req.params.bookingId as string;
  const { otp } = req.body;

  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];
  if (shop.ownerId !== req.ownerId) return res.status(403).json({ error: "Forbidden" });

  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(and(eq(bookingsTable.id, Number(bookingId)), eq(bookingsTable.shopId, shops[0].id)));

  if (bookings.length === 0) return res.status(404).json({ error: "Booking not found" });
  const booking = bookings[0];

  if (booking.arrivalOtp !== otp) {
    return res.status(400).json({ error: "Invalid OTP" });
  }

  const [updated] = await db
    .update(bookingsTable)
    .set({ status: "active", arrivalOtp: null })
    .where(eq(bookingsTable.id, booking.id))
    .returning();

  const services = await db.select().from(servicesTable).where(eq(servicesTable.id, booking.serviceId));
  return res.json(serializeBooking(updated, services[0]));
});

// POST /shops/:slug/bookings/:bookingId/no-show
router.post("/shops/:slug/bookings/:bookingId/no-show", requireOwnerAuth, async (req: OwnerAuthRequest, res) => {
  const slug = req.params.slug as string;
  const bookingId = req.params.bookingId as string;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];
  if (shop.ownerId !== req.ownerId) return res.status(403).json({ error: "Forbidden" });

  const [updated] = await db
    .update(bookingsTable)
    .set({ status: "no_show" })
    .where(and(eq(bookingsTable.id, Number(bookingId)), eq(bookingsTable.shopId, shops[0].id)))
    .returning();

  if (!updated) return res.status(404).json({ error: "Booking not found" });
  const services = await db.select().from(servicesTable).where(eq(servicesTable.id, updated.serviceId));
  return res.json(serializeBooking(updated, services[0]));
});

// POST /shops/:slug/bookings/:bookingId/undo-no-show
router.post("/shops/:slug/bookings/:bookingId/undo-no-show", requireOwnerAuth, async (req: OwnerAuthRequest, res) => {
  const slug = req.params.slug as string;
  const bookingId = req.params.bookingId as string;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];
  if (shop.ownerId !== req.ownerId) return res.status(403).json({ error: "Forbidden" });

  const [updated] = await db
    .update(bookingsTable)
    .set({ status: "confirmed" })
    .where(and(eq(bookingsTable.id, Number(bookingId)), eq(bookingsTable.shopId, shops[0].id), eq(bookingsTable.status, "no_show")))
    .returning();

  if (!updated) return res.status(404).json({ error: "Booking not found or not a no-show" });
  const services = await db.select().from(servicesTable).where(eq(servicesTable.id, updated.serviceId));
  return res.json(serializeBooking(updated, services[0]));
});

// POST /shops/:slug/bookings/:bookingId/complete
router.post("/shops/:slug/bookings/:bookingId/complete", requireOwnerAuth, async (req: OwnerAuthRequest, res) => {
  const slug = req.params.slug as string;
  const bookingId = req.params.bookingId as string;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];
  if (shop.ownerId !== req.ownerId) return res.status(403).json({ error: "Forbidden" });

  const [updated] = await db
    .update(bookingsTable)
    .set({ status: "completed" })
    .where(and(eq(bookingsTable.id, Number(bookingId)), eq(bookingsTable.shopId, shops[0].id)))
    .returning();

  if (!updated) return res.status(404).json({ error: "Booking not found" });
  const services = await db.select().from(servicesTable).where(eq(servicesTable.id, updated.serviceId));
  return res.json(serializeBooking(updated, services[0]));
});

// GET /shops/:slug/timeline/:date
router.get("/shops/:slug/timeline/:date", requireOwnerAuth, async (req: OwnerAuthRequest, res) => {
  const slug = req.params.slug as string;
  const date = req.params.date as string;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];
  if (shop.ownerId !== req.ownerId) return res.status(403).json({ error: "Forbidden" });

  const rawBookings = await db
    .select()
    .from(bookingsTable)
    .where(and(eq(bookingsTable.shopId, shop.id), eq(bookingsTable.slotDate, date)));

  const services = await db.select().from(servicesTable).where(eq(servicesTable.shopId, shop.id));
  const serviceMap = new Map(services.map((s) => [s.id, s]));

  const chairs: Array<{ chairNumber: number; bookings: ReturnType<typeof serializeBooking>[] }> = [];
  for (let c = 1; c <= shop.numChairs; c++) {
    const chairBookings = rawBookings
      .filter((b) => b.chairNumber === c && !["cancelled"].includes(b.status))
      .map((b) => serializeBooking(b, serviceMap.get(b.serviceId)));
    chairs.push({ chairNumber: c, bookings: chairBookings });
  }

  return res.json({
    date,
    chairs,
    openTime: shop.openTime,
    closeTime: shop.closeTime,
  });
});

// GET /shops/:slug/activity
router.get("/shops/:slug/activity", requireOwnerAuth, async (req: OwnerAuthRequest, res) => {
  const slug = req.params.slug as string;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  if (shops[0].ownerId !== req.ownerId) return res.status(403).json({ error: "Forbidden" });

  const rawBookings = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.shopId, shops[0].id));

  const services = await db.select().from(servicesTable).where(eq(servicesTable.shopId, shops[0].id));
  const serviceMap = new Map(services.map((s) => [s.id, s]));

  // Build activity feed from bookings
  const activities = rawBookings
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10)
    .map((b) => {
      let type: string;
      switch (b.status) {
        case "active": type = "arrival"; break;
        case "no_show": type = "no_show"; break;
        case "completed": type = "completed"; break;
        case "cancelled": type = "cancelled"; break;
        default: type = "new_booking";
      }
      return {
        id: b.id,
        type,
        customerName: b.customerName,
        serviceName: serviceMap.get(b.serviceId)?.name ?? "Service",
        slotTime: b.slotTime,
        createdAt: b.createdAt.toISOString(),
      };
    });

  return res.json(activities);
});

// GET /shops/:slug/revenue
router.get("/shops/:slug/revenue", requireOwnerAuth, async (req: OwnerAuthRequest, res) => {
  const slug = req.params.slug as string;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  if (shops[0].ownerId !== req.ownerId) return res.status(403).json({ error: "Forbidden" });

  const allBookings = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.shopId, shops[0].id));

  const weeksAgoStr = req.query.weeksAgo as string;
  const weeksAgo = parseInt(weeksAgoStr) || 0;

  const result: Array<{ date: string; bookings: number; revenue: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i - (weeksAgo * 7));
    const dateStr = d.toISOString().split("T")[0];
    const dayBookings = allBookings.filter(
      (b) =>
        b.slotDate === dateStr &&
        b.status === "completed"
    );
    result.push({
      date: dateStr,
      bookings: dayBookings.length,
      revenue: dayBookings.reduce((sum, b) => sum + b.amountPaid, 0),
    });
  }

  return res.json(result);
});

// POST /customer/bookings/:bookingId/cancel
router.post("/customer/bookings/:bookingId/cancel", requireCustomerAuth, async (req: any, res: any) => {
  const authReq = req as CustomerAuthRequest;
  const phone = authReq.customerPhone;
  const bookingId = req.params.bookingId as string;
  if (!phone) return res.status(400).json({ error: "phone required" });

  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, Number(bookingId)));

  if (bookings.length === 0) return res.status(404).json({ error: "Booking not found" });
  const booking = bookings[0];

  if (booking.customerPhone !== phone) return res.status(403).json({ error: "Not your booking" });
  if (booking.status !== "confirmed") return res.status(400).json({ error: "Only confirmed bookings can be cancelled" });

  const [updated] = await db
    .update(bookingsTable)
    .set({ status: "cancelled" })
    .where(eq(bookingsTable.id, booking.id))
    .returning();

  return res.json({ success: true, booking: serializeBooking(updated) });
});

// GET /customer/bookings/all — all bookings for a customer
router.get("/customer/bookings/all", requireCustomerAuth, async (req: any, res: any) => {
  const authReq = req as CustomerAuthRequest;
  const phone = authReq.customerPhone;
  if (!phone) return res.status(400).json({ error: "phone required" });

  const rows = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.customerPhone, phone));

  const shopIds = [...new Set(rows.map((b) => b.shopId))];
  const shops = shopIds.length
    ? await db.select().from(shopsTable).where(
        shopIds.length === 1
          ? eq(shopsTable.id, shopIds[0])
          : inArray(shopsTable.id, shopIds)
      )
    : [];
  const shopMap = Object.fromEntries(shops.map((s) => [s.id, s]));

  const serviceIds = [...new Set(rows.map((b) => b.serviceId))];
  const services = serviceIds.length
    ? await db.select().from(servicesTable).where(
        serviceIds.length === 1
          ? eq(servicesTable.id, serviceIds[0])
          : inArray(servicesTable.id, serviceIds)
      )
    : [];
  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));

  const result = rows
    .sort((a, b) => (b.slotDate + b.slotTime).localeCompare(a.slotDate + a.slotTime))
    .map((b) => ({
      id: b.id,
      shopName: shopMap[b.shopId]?.shopName ?? "Shop",
      shopSlug: shopMap[b.shopId]?.slug ?? "",
      shopCity: shopMap[b.shopId]?.city ?? "",
      serviceName: serviceMap[b.serviceId]?.name ?? "",
      slotDate: b.slotDate,
      slotTime: b.slotTime,
      slotEndTime: b.slotEndTime,
      status: b.status,
      amountPaid: b.amountPaid,
      totalAmount: b.totalAmount,
      paymentType: b.paymentType,
      // Only include OTP for confirmed bookings so customer can show it to barber
      arrivalOtp: b.status === "confirmed" ? b.arrivalOtp : undefined,
    }));

  return res.json(result);
});

// GET /customer/bookings — upcoming bookings for a customer
router.get("/customer/bookings", requireCustomerAuth, async (req: any, res: any) => {
  const authReq = req as CustomerAuthRequest;
  const phone = authReq.customerPhone;
  if (!phone) return res.status(400).json({ error: "phone required" });

  const today = new Date().toISOString().split("T")[0];
  const nowTime = new Date().toTimeString().slice(0, 5); // "HH:MM"

  const rows = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.customerPhone, phone));

  // Filter future bookings only (skip cancelled / no_show / completed)
  const active = ["confirmed", "pending", "active"];
  const upcoming = rows.filter((b) => {
    if (!active.includes(b.status)) return false;
    if (b.slotDate > today) return true;
    if (b.slotDate === today) return b.slotTime >= nowTime;
    return false;
  });

  // Enrich with shop info
  const shopIds = [...new Set(upcoming.map((b) => b.shopId))];
  const shops = shopIds.length
    ? await db.select().from(shopsTable).where(
        shopIds.length === 1
          ? eq(shopsTable.id, shopIds[0])
          : inArray(shopsTable.id, shopIds)
      )
    : [];
  const shopMap = Object.fromEntries(shops.map((s) => [s.id, s]));

  const serviceIds = [...new Set(upcoming.map((b) => b.serviceId))];
  const services = serviceIds.length
    ? await db.select().from(servicesTable).where(
        serviceIds.length === 1
          ? eq(servicesTable.id, serviceIds[0])
          : inArray(servicesTable.id, serviceIds)
      )
    : [];
  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));

  const result = upcoming
    .sort((a, b) => (a.slotDate + a.slotTime).localeCompare(b.slotDate + b.slotTime))
    .map((b) => ({
      id: b.id,
      shopName: shopMap[b.shopId]?.shopName ?? "Shop",
      shopSlug: shopMap[b.shopId]?.slug ?? "",
      shopCity: shopMap[b.shopId]?.city ?? "",
      serviceName: serviceMap[b.serviceId]?.name ?? "",
      slotDate: b.slotDate,
      slotTime: b.slotTime,
      slotEndTime: b.slotEndTime,
      status: b.status,
      // Only include OTP for confirmed bookings so customer can show it to barber
      arrivalOtp: b.status === "confirmed" ? b.arrivalOtp : undefined,
    }));

  return res.json(result);
});

export default router;
