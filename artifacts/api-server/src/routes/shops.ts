import { Router } from "express";
import { db, shopsTable, servicesTable, bookingsTable } from "@workspace/db";
import { eq, and, ilike, or, gte, lte, sql } from "drizzle-orm";
import { z } from "zod/v4";

const router = Router();

// GET /shops
router.get("/shops", async (req, res) => {
  const { q, city, limit = "20" } = req.query as Record<string, string>;
  let query = db.select().from(shopsTable);

  const allShops = await db.select().from(shopsTable);
  let filtered = allShops;

  if (q) {
    const lower = q.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.shopName.toLowerCase().includes(lower) ||
        s.city.toLowerCase().includes(lower) ||
        s.ownerName.toLowerCase().includes(lower)
    );
  }
  if (city) {
    filtered = filtered.filter((s) =>
      s.city.toLowerCase().includes(city.toLowerCase())
    );
  }

  const limitNum = Math.min(Number(limit) || 20, 100);
  filtered = filtered.slice(0, limitNum);

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
    const { passwordHash: _, ...shopSafe } = shop;
    return {
      ...shopSafe,
      createdAt: shopSafe.createdAt.toISOString(),
      pausedUntil: shopSafe.pausedUntil?.toISOString() ?? null,
      servicesCount: shopServices.length,
      minPrice,
      latitude: shop.latitude ?? null,
      longitude: shop.longitude ?? null,
    };
  });

  return res.json(result);
});

// GET /shops/:slug
router.get("/shops/:slug", async (req, res) => {
  const { slug } = req.params;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });

  const shop = shops[0];
  const services = await db
    .select()
    .from(servicesTable)
    .where(and(eq(servicesTable.shopId, shop.id), eq(servicesTable.isActive, true)));

  const { passwordHash: _, ...shopSafe } = shop;

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
      ...shopSafe,
      isPaused,
      createdAt: shopSafe.createdAt.toISOString(),
      pausedUntil: shopSafe.pausedUntil?.toISOString() ?? null,
    },
    services,
  });
});

// PATCH /shops/:slug/status
router.patch("/shops/:slug/status", async (req, res) => {
  const { slug } = req.params;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];

  const { isOpen, pauseMinutes } = req.body as {
    isOpen?: boolean;
    pauseMinutes?: number | null;
  };

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
router.patch("/shops/:slug/settings", async (req, res) => {
  const { slug } = req.params;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];

  const { shopName, numChairs, numBarbers, openTime, closeTime, city, address } = req.body;
  const update: Record<string, unknown> = {};
  if (shopName !== undefined) update.shopName = shopName;
  if (numChairs !== undefined) update.numChairs = numChairs;
  if (numBarbers !== undefined) update.numBarbers = numBarbers;
  if (openTime !== undefined) update.openTime = openTime;
  if (closeTime !== undefined) update.closeTime = closeTime;
  if (city !== undefined) update.city = city;
  if (address !== undefined) update.address = address;

  const [updated] = await db
    .update(shopsTable)
    .set(update)
    .where(eq(shopsTable.id, shop.id))
    .returning();

  const { passwordHash: _, ...shopSafe } = updated;
  return res.json({
    ...shopSafe,
    createdAt: shopSafe.createdAt.toISOString(),
    pausedUntil: shopSafe.pausedUntil?.toISOString() ?? null,
  });
});

// GET /shops/:slug/dashboard
router.get("/shops/:slug/dashboard", async (req, res) => {
  const { slug } = req.params;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];

  const today = new Date().toISOString().split("T")[0];
  const allBookings = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.shopId, shop.id));

  const todayBookings = allBookings.filter((b) => b.slotDate === today);
  const todayRevenue = todayBookings.reduce((sum, b) => {
    if (["confirmed", "active", "completed"].includes(b.status)) {
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
      ["confirmed", "active", "completed"].includes(b.status)
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
router.patch("/shops/:slug/photos", async (req, res) => {
  const { slug } = req.params;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];

  const { profilePhoto, interiorPhotos } = req.body as {
    profilePhoto?: string;
    interiorPhotos?: string[];
  };

  const update: Record<string, unknown> = {};
  if (profilePhoto !== undefined) update.profilePhoto = profilePhoto;
  if (interiorPhotos !== undefined) update.interiorPhotos = interiorPhotos;

  const [updated] = await db
    .update(shopsTable)
    .set(update)
    .where(eq(shopsTable.id, shop.id))
    .returning();

  const { passwordHash: _, ...safe } = updated;
  return res.json({ ...safe, createdAt: safe.createdAt.toISOString(), pausedUntil: safe.pausedUntil?.toISOString() ?? null });
});

// POST /shops/:slug/portfolio — append a portfolio photo
router.post("/shops/:slug/portfolio", async (req, res) => {
  const { slug } = req.params;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];

  const { photoPath } = req.body as { photoPath: string };
  if (!photoPath) return res.status(400).json({ error: "photoPath is required" });

  const current = (shop.portfolioPhotos ?? []) as string[];
  const updated = [...current, photoPath];

  await db.update(shopsTable).set({ portfolioPhotos: updated }).where(eq(shopsTable.id, shop.id));
  return res.json({ portfolioPhotos: updated });
});

// DELETE /shops/:slug/portfolio/:index — remove a portfolio photo by index
router.delete("/shops/:slug/portfolio/:index", async (req, res) => {
  const { slug, index } = req.params;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];

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
router.patch("/shops/:slug/schedule", async (req, res) => {
  const { slug } = req.params;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  const shop = shops[0];

  const { openDays, openHours } = req.body as {
    openDays: number[];
    openHours?: Record<string, { open: string; close: string }>;
  };
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
