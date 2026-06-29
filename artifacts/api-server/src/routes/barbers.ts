import { Router, Request, Response, NextFunction } from "express";
import { db, shopsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyToken } from "../lib/auth";

const router = Router();

async function requireBarber(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }
  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);
  if (!payload || !payload.shopId) {
    return res.status(401).json({ error: "Invalid token" });
  }
  (req as any).shopId = payload.shopId;
  next();
}

// DELETE /barbers/me
router.delete("/barbers/me", requireBarber, async (req, res) => {
  const shopId = (req as any).shopId as number;

  try {
    // Because of foreign keys (if ON DELETE CASCADE is set), this will delete 
    // related bookings, services, timeline, etc.
    await db.delete(shopsTable).where(eq(shopsTable.id, shopId));

    return res.json({ success: true, message: "Account deleted successfully" });
  } catch (err: any) {
    console.error("Failed to delete account", err);
    return res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;
