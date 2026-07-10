import { Router } from "express";
import { db, shopsTable, servicesTable, bookingsTable, ownersTable } from "@workspace/db";
import { eq, and, ilike, or, gte, lte, sql } from "drizzle-orm";
import { requireOwnerAuth, OwnerAuthRequest } from "../middleware/auth";
import { CreateShopBody, UpdateShopStatusBody, UpdateShopSettingsBody } from "@workspace/api-zod";
import { slugify } from "../lib/auth";

const router = Router();

// GET /shops
router.get("/shops", async (req, res) => {
  const { q, city, limit = "20" } = req.query as Record<string, string>;
  const limitNum = Math.min(Number(limit) || 20, 100);
  
  const conditions = [eq(shopsTable.isVerified, true)];
  
  if (q) {
    const lower = q.toLowerCase();
    conditions.push(or(
      ilike(shopsTable.shopName, `%${lower}%`),
      ilike(shopsTable.city, `%${lower}%`)
    )!);
  }
  
  if (city) {
    conditions.push(ilike(shopsTable.city, `%${city}%`));
  }

  // Database-level filtering and limits (Fix #21)
  const filtered = await db.select()
    .from(shopsTable)
    .where(and(...conditions))
    .limit(limitNum);

  // Get service counts and min prices
  const allServices = await db.select().from(servicesTable);

  const result = filtered.map((shop) => {
    const shopServices = allServices.filter(
      (sv) => sv.shopId === shop.id && sv.isActive
    );
    const minPrice =
      shopServices.length > 0
        ? Math.min(...shopServices.map((sv) => sv.price))
        : null;
    return {
      ...shop,
      createdAt: shop.createdAt.toISOString(),
      pausedUntil: shop.pausedUntil?.toISOString() ?? null,
      servicesCount: shopServices.length,
      minPrice,
      latitude: shop.latitude ?? null,
      longitude: shop.longitude ?? null,
    };
  });

  return res.json(result);
});

// POST /shops
router.post("/shops", requireOwnerAuth, async (req: OwnerAuthRequest, res) => {
  const parsed = CreateShopBody.safeParse(req.body);
  if (!parsed.success) {
    const field = parsed.error.errors[0]?.path.join(".");
    const msg = parsed.error.errors[0]?.message;
    return res.status(400).json({ error: field ? `Invalid input for ${field}: ${msg}` : "Invalid input" });
  }
  const data = parsed.data;

  // Check if owner already has a shop
  const existingShops = await db.select().from(shopsTable).where(eq(shopsTable.ownerId, req.ownerId!));
  if (existingShops.length > 0) {
    return res.status(409).json({ error: "Owner already has a shop" });
  }

  // Generate unique slug for shop
  let baseSlug = slugify(data.shopName);
  let slug = baseSlug;
  let suffix = 1;
  while (true) {
    const slugCheck = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
    if (slugCheck.length === 0) break;
    slug = `${baseSlug}-${suffix++}`;
  }

  try {
    const [shop] = await db
      .insert(shopsTable)
      .values({
        slug,
        shopName: data.shopName,
        ownerId: req.ownerId!,
        city: data.city,
        address: data.address ?? null,
        numChairs: data.numChairs,
        numBarbers: data.numBarbers,
        openTime: data.openTime ?? "09:00",
        closeTime: data.closeTime ?? "20:00",
        pincode: typeof (data as any).pincode === "string" ? (data as any).pincode : null,
        latitude: typeof (data as any).latitude === "number" ? (data as any).latitude : null,
        longitude: typeof (data as any).longitude === "number" ? (data as any).longitude : null,
        isVerified: true, // AUTO-VERIFY New Shops for Customer Visibility
      })
      .returning();

    return res.status(201).json({
      ...shop,
      createdAt: shop.createdAt.toISOString(),
      pausedUntil: shop.pausedUntil?.toISOString() ?? null,
    });
  } catch (error: any) {
    req.log.error(error);
    return res.status(500).json({ error: "Shop creation failed" });
  }
});

// GET /shops/:slug
router.get("/shops/:slug", async (req, res) => {
  const slug = req.params.slug as string;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });

  const shop = shops[0];
  const services = await db
    .select()
    .from(servicesTable)
    .where(and(eq(servicesTable.shopId, shop.id), eq(servicesTable.isActive, true)));

  // Join owner details
  const owners = await db.select().from(ownersTable).where(eq(ownersTable.id, shop.ownerId));
  const owner = owners[0];

  // Check if pause has expired
  let isPaused = shop.isPaused;
  if (isPaused && shop.pausedUntil && shop.pausedUntil < new Date()) {
    await db
      .update(shopsTable)
      .set({ isPaused: false, pausedUntil: null })
      .where(eq(shopsTable.id, shop.id));
    isPaused = false;
  }

  return res.json({
    shop: {
      ...shop,
      ownerName: owner?.name ?? "Unknown",
      phone: owner?.phone ?? "Unknown",
      isPaused,
      createdAt: shop.createdAt.toISOString(),
      pausedUntil: shop.pausedUntil?.toISOString() ?? null,
    },
    services,
  });
});

// PATCH /shops/:slug/status
router.patch("/shops/:slug/status", requireOwnerAuth, async (req: OwnerAuthRequest, res) => {
  const slug = req.params.slug as string;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];
  if (shop.ownerId !== req.ownerId) return res.status(403).json({ error: "Forbidden" });

  const parsed = UpdateShopStatusBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input: " + parsed.error.errors[0]?.message });
  }
  const { isOpen, pauseMinutes } = parsed.data;

  let updateData: Partial<typeof shop> = {};
  if (isOpen !== undefined) updateData.isOpen = isOpen;

  if (pauseMinutes !== undefined && pauseMinutes !== null) {
    updateData.isPaused = true;
    const pausedUntil = new Date(Date.now() + pauseMinutes * 60 * 1000);
    updateData.pausedUntil = pausedUntil;
  } else if (pauseMinutes === null) {
    updateData.isPaused = false;
    updateData.pausedUntil = null;
  }

  const [updated] = await db
    .update(shopsTable)
    .set(updateData)
    .where(eq(shopsTable.id, shop.id))
    .returning();

  return res.json({
    isOpen: updated.isOpen,
    isPaused: updated.isPaused,
    pausedUntil: updated.pausedUntil?.toISOString() ?? null,
  });
});

// PATCH /shops/:slug/settings
router.patch("/shops/:slug/settings", requireOwnerAuth, async (req: OwnerAuthRequest, res) => {
  const slug = req.params.slug as string;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];
  if (shop.ownerId !== req.ownerId) return res.status(403).json({ error: "Forbidden" });

  const parsed = UpdateShopSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input: " + parsed.error.errors[0]?.message });
  }
  const { shopName, numChairs, numBarbers, openTime, closeTime, city, address, ownerName, phone, pincode } = parsed.data;
  
  // Update shopsTable
  const shopUpdate: Record<string, unknown> = {};
  if (shopName !== undefined) shopUpdate.shopName = shopName;
  if (numChairs !== undefined) shopUpdate.numChairs = numChairs;
  if (numBarbers !== undefined) shopUpdate.numBarbers = numBarbers;
  if (openTime !== undefined) shopUpdate.openTime = openTime;
  if (closeTime !== undefined) shopUpdate.closeTime = closeTime;
  if (city !== undefined) shopUpdate.city = city;
  if (address !== undefined) shopUpdate.address = address;
  if (pincode !== undefined) shopUpdate.pincode = pincode;

  const [updated] = await db
    .update(shopsTable)
    .set(shopUpdate)
    .where(eq(shopsTable.id, shop.id))
    .returning();

  // Update ownersTable
  const ownerUpdate: Record<string, string> = {};
  if (ownerName !== undefined) ownerUpdate.name = ownerName;
  if (phone !== undefined) ownerUpdate.phone = phone;

  if (Object.keys(ownerUpdate).length > 0) {
    await db.update(ownersTable).set(ownerUpdate).where(eq(ownersTable.id, shop.ownerId));
  }

  return res.json({
    ...updated,
    ownerName,
    phone,
    createdAt: updated.createdAt.toISOString(),
    pausedUntil: updated.pausedUntil?.toISOString() ?? null,
  });
});

// GET /shops/:slug/dashboard
router.get("/shops/:slug/dashboard", requireOwnerAuth, async (req: OwnerAuthRequest, res) => {
  const slug = req.params.slug as string;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];
  if (shop.ownerId !== req.ownerId) return res.status(403).json({ error: "Forbidden" });

  const today = new Date().toISOString().split("T")[0];
  const allBookings = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.shopId, shop.id));

  const todayBookings = allBookings.filter((b) => b.slotDate === today);
  const todayRevenue = todayBookings.reduce((sum, b) => {
    if (b.status === "completed") {
      return sum + b.amountPaid;
    }
    return sum;
  }, 0);

  const activeSlots = todayBookings.filter((b) =>
    ["confirmed", "active"].includes(b.status)
  ).length;

  const completedToday = todayBookings.filter((b) => b.status === "completed").length;
  const noShowsToday = todayBookings.filter((b) => b.status === "no_show").length;

  // Weekly stats (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];
  const weeklyBookings = allBookings.filter(
    (b) =>
      b.slotDate >= weekAgoStr &&
      b.status === "completed"
  );
  const weeklyRevenue = weeklyBookings.reduce((sum, b) => sum + b.amountPaid, 0);

  // Available chairs = numChairs - active bookings right now
  const nowTime = `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
  const activeNow = todayBookings.filter(
    (b) =>
      b.status === "active" &&
      b.slotTime <= nowTime &&
      b.slotEndTime > nowTime
  ).length;
  const availableChairs = Math.max(0, shop.numChairs - activeNow);

  return res.json({
    todayBookings: todayBookings.filter((b) =>
      !["cancelled", "no_show"].includes(b.status)
    ).length,
    todayRevenue,
    activeSlots,
    availableChairs,
    completedToday,
    noShowsToday,
    weeklyBookings: weeklyBookings.length,
    weeklyRevenue,
  });
});

// PATCH /shops/:slug/photos — update profile photo + interior photos
router.patch("/shops/:slug/photos", requireOwnerAuth, async (req: OwnerAuthRequest, res) => {
  const slug = req.params.slug as string;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];
  if (shop.ownerId !== req.ownerId) return res.status(403).json({ error: "Forbidden" });

  const { profilePhoto, interiorPhotos } = req.body;
  if (profilePhoto !== undefined && typeof profilePhoto !== "string") {
    return res.status(400).json({ error: "profilePhoto must be a string" });
  }
  if (interiorPhotos !== undefined && (!Array.isArray(interiorPhotos) || !interiorPhotos.every((p: unknown) => typeof p === "string"))) {
    return res.status(400).json({ error: "interiorPhotos must be an array of strings" });
  }

  const update: Record<string, unknown> = {};
  if (profilePhoto !== undefined) update.profilePhoto = profilePhoto;
  if (interiorPhotos !== undefined) update.interiorPhotos = interiorPhotos;

  const [updated] = await db
    .update(shopsTable)
    .set(update)
    .where(eq(shopsTable.id, shop.id))
    .returning();

  return res.json({ ...updated, createdAt: updated.createdAt.toISOString(), pausedUntil: updated.pausedUntil?.toISOString() ?? null });
});

// POST /shops/:slug/portfolio — append a portfolio photo
router.post("/shops/:slug/portfolio", requireOwnerAuth, async (req: OwnerAuthRequest, res) => {
  const slug = req.params.slug as string;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];
  if (shop.ownerId !== req.ownerId) return res.status(403).json({ error: "Forbidden" });

  const { photoPath } = req.body;
  if (!photoPath || typeof photoPath !== "string") {
    return res.status(400).json({ error: "photoPath is required and must be a string" });
  }

  const current = (shop.portfolioPhotos ?? []) as string[];
  const updated = [...current, photoPath];

  await db.update(shopsTable).set({ portfolioPhotos: updated }).where(eq(shopsTable.id, shop.id));
  return res.json({ portfolioPhotos: updated });
});

// DELETE /shops/:slug/portfolio/:index — remove a portfolio photo by index
router.delete("/shops/:slug/portfolio/:index", requireOwnerAuth, async (req: OwnerAuthRequest, res) => {
  const slug = req.params.slug as string;
  const index = req.params.index as string;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];
  if (shop.ownerId !== req.ownerId) return res.status(403).json({ error: "Forbidden" });

  const idx = parseInt(index, 10);
  const current = (shop.portfolioPhotos ?? []) as string[];
  if (isNaN(idx) || idx < 0 || idx >= current.length) {
    return res.status(400).json({ error: "Invalid index" });
  }

  const updated = current.filter((_, i) => i !== idx);
  await db.update(shopsTable).set({ portfolioPhotos: updated }).where(eq(shopsTable.id, shop.id));
  return res.json({ portfolioPhotos: updated });
});

// PATCH /shops/:slug/schedule
router.patch("/shops/:slug/schedule", requireOwnerAuth, async (req: OwnerAuthRequest, res) => {
  const slug = req.params.slug as string;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];
  if (shop.ownerId !== req.ownerId) return res.status(403).json({ error: "Forbidden" });

  const { openDays, openHours } = req.body;
  if (!Array.isArray(openDays)) {
    return res.status(400).json({ error: "openDays must be an array" });
  }
  const validDays = openDays.filter((d) => typeof d === "number" && d >= 0 && d <= 6);

  const updatePayload: Record<string, any> = { openDays: validDays };
  if (openHours && typeof openHours === "object") {
    const validHours: Record<string, { open: string; close: string }> = {};
    for (const [key, val] of Object.entries(openHours)) {
      const dayNum = parseInt(key);
      if (dayNum >= 0 && dayNum <= 6 && val?.open && val?.close) {
        validHours[key] = { open: val.open, close: val.close };
      }
    }
    updatePayload.openHours = validHours;
  }

  const [updated] = await db
    .update(shopsTable)
    .set(updatePayload)
    .where(eq(shopsTable.id, shop.id))
    .returning();

  return res.json({ openDays: updated.openDays, openHours: updated.openHours });
});

export default router;
