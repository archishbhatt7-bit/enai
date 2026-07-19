import { Router } from "express";
import crypto from "crypto";
import { db, shopsTable, ownersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateToken, verifyToken } from "../lib/auth.js";

export const adminRouter = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  throw new Error("ADMIN_PASSWORD environment variable is required!");
}

// Admin Login
adminRouter.post("/login", (req, res) => {
  const { password } = req.body;
  const isValid = typeof password === "string" &&
    password.length === ADMIN_PASSWORD.length &&
    crypto.timingSafeEqual(Buffer.from(password), Buffer.from(ADMIN_PASSWORD));
  if (isValid) {
    const token = generateToken({ admin: true });
    return res.json({ token });
  }
  return res.status(401).json({ error: "Invalid admin password" });
});

// Middleware to verify admin token
const requireAdminAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  
  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyToken(token) as any;
    if (decoded && decoded.admin) {
      next();
      return undefined;
    } else {
      res.status(403).json({ error: "Not an admin" });
      return undefined;
    }
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return undefined;
  }
};

// List pending shops
adminRouter.get("/shops/pending", requireAdminAuth, async (req, res) => {
  try {
    const pendingShops = await db.query.shopsTable.findMany({
      where: eq(shopsTable.isVerified, false),
    });
    res.json(pendingShops);
    return undefined;
  } catch (err) {
    req.log.error(err, "Failed to get pending shops");
    res.status(500).json({ error: "Internal server error" });
    return undefined;
  }
});

// Approve shop
adminRouter.post("/shops/:id/approve", requireAdminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return undefined;
    }

    await db.update(shopsTable).set({ isVerified: true }).where(eq(shopsTable.id, id));
    res.json({ success: true });
    return undefined;
  } catch (err) {
    req.log.error(err, "Failed to approve shop");
    res.status(500).json({ error: "Internal server error" });
    return undefined;
  }
});

// Reject shop
adminRouter.post("/shops/:id/reject", requireAdminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return undefined;
    }

    // Delete shop and its orphaned owner in a transaction
    const shop = await db.select().from(shopsTable).where(eq(shopsTable.id, id));
    if (shop.length === 0) {
      res.status(404).json({ error: "Shop not found" });
      return undefined;
    }

    await db.transaction(async (tx) => {
      await tx.delete(shopsTable).where(eq(shopsTable.id, id));
      if (shop[0].ownerId) {
        await tx.delete(ownersTable).where(eq(ownersTable.id, shop[0].ownerId));
      }
    });

    res.json({ success: true });
    return undefined;
  } catch (err) {
    req.log.error(err, "Failed to reject shop");
    res.status(500).json({ error: "Internal server error" });
    return undefined;
  }
});
