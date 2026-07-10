import { Router } from "express";
import { db, ownersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireOwnerAuth, OwnerAuthRequest } from "../middleware/auth";

const router = Router();

// DELETE /barbers/me
router.delete("/barbers/me", requireOwnerAuth, async (req: OwnerAuthRequest, res) => {
  const ownerId = req.ownerId as number;

  try {
    // Cascade delete on owners will delete their shops, bookings, etc.
    await db.delete(ownersTable).where(eq(ownersTable.id, ownerId));

    return res.json({ success: true, message: "Account deleted successfully" });
  } catch (err: any) {
    console.error("Failed to delete account", err);
    return res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;
