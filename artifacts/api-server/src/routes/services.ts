import { Router } from "express";
import { db, shopsTable, servicesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireOwnerAuth, OwnerAuthRequest } from "../middleware/auth.js";
import { CreateServiceBody, UpdateServiceBody } from "@workspace/api-zod";

const router = Router();

// GET /shops/:slug/services
router.get("/shops/:slug/services", async (req, res) => {
  const { slug } = req.params;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug as string));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });

  const services = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.shopId, shops[0].id));

  return res.json(services);
});

// POST /shops/:slug/services (owner only)
router.post("/shops/:slug/services", requireOwnerAuth, async (req: OwnerAuthRequest, res) => {
  const { slug } = req.params;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug as string));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  if (shops[0].ownerId !== req.ownerId) return res.status(403).json({ error: "Forbidden" });

  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input: " + parsed.error.errors[0]?.message });
  }
  const { name, price, durationMinutes } = parsed.data;

  const [service] = await db
    .insert(servicesTable)
    .values({ shopId: shops[0].id, name, price, durationMinutes, isActive: true })
    .returning();

  return res.status(201).json(service);
});

// PATCH /shops/:slug/services/:serviceId (owner only)
router.patch("/shops/:slug/services/:serviceId", requireOwnerAuth, async (req: OwnerAuthRequest, res) => {
  const { slug, serviceId } = req.params;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug as string));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  if (shops[0].ownerId !== req.ownerId) return res.status(403).json({ error: "Forbidden" });

  const parsed = UpdateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input: " + parsed.error.errors[0]?.message });
  }
  const { name, price, durationMinutes, isActive } = parsed.data;
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (price !== undefined) update.price = price;
  if (durationMinutes !== undefined) update.durationMinutes = durationMinutes;
  if (isActive !== undefined) update.isActive = isActive;

  const [updated] = await db
    .update(servicesTable)
    .set(update)
    .where(
      and(
        eq(servicesTable.id, Number(serviceId)),
        eq(servicesTable.shopId, shops[0].id)
      )
    )
    .returning();

  if (!updated) return res.status(404).json({ error: "Service not found" });
  return res.json(updated);
});

// DELETE /shops/:slug/services/:serviceId (owner only)
router.delete("/shops/:slug/services/:serviceId", requireOwnerAuth, async (req: OwnerAuthRequest, res) => {
  const { slug, serviceId } = req.params;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug as string));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });
  if (shops[0].ownerId !== req.ownerId) return res.status(403).json({ error: "Forbidden" });

  await db
    .delete(servicesTable)
    .where(
      and(
        eq(servicesTable.id, Number(serviceId)),
        eq(servicesTable.shopId, shops[0].id)
      )
    );

  return res.status(204).send();
});

export default router;
