import { Router } from "express";
import { db, shopsTable, servicesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// GET /shops/:slug/services
router.get("/shops/:slug/services", async (req, res) => {
  const { slug } = req.params;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });

  const services = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.shopId, shops[0].id));

  return res.json(services);
});

// POST /shops/:slug/services
router.post("/shops/:slug/services", async (req, res) => {
  const { slug } = req.params;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });

  const { name, price, durationMinutes } = req.body;
  if (!name || price === undefined || !durationMinutes) {
    return res.status(400).json({ error: "name, price, durationMinutes required" });
  }

  const [service] = await db
    .insert(servicesTable)
    .values({ shopId: shops[0].id, name, price, durationMinutes, isActive: true })
    .returning();

  return res.status(201).json(service);
});

// PATCH /shops/:slug/services/:serviceId
router.patch("/shops/:slug/services/:serviceId", async (req, res) => {
  const { slug, serviceId } = req.params;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });

  const { name, price, durationMinutes, isActive } = req.body;
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

// DELETE /shops/:slug/services/:serviceId
router.delete("/shops/:slug/services/:serviceId", async (req, res) => {
  const { slug, serviceId } = req.params;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
  if (shops.length === 0) return res.status(404).json({ error: "Shop not found" });

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
