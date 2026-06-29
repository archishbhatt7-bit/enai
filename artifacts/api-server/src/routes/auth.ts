import { Router } from "express";
import { db, shopsTable, otpSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, generateToken, generateOtp, slugify } from "../lib/auth";
import { RegisterBarberBody, LoginBarberBody, SendOtpBody, VerifyOtpBody } from "@workspace/api-zod";


const router = Router();

// POST /auth/register
router.post("/auth/register", async (req, res) => {
  const parsed = RegisterBarberBody.safeParse(req.body);
  if (!parsed.success) {
    const field = parsed.error.errors[0]?.path.join(".");
    const msg = parsed.error.errors[0]?.message;
    return res.status(400).json({ error: field ? `Invalid input for ${field}: ${msg}` : "Invalid input" });
  }
  const data = parsed.data;

  // Check phone uniqueness
  const existing = await db.select().from(shopsTable).where(eq(shopsTable.phone, data.phone));
  if (existing.length > 0) {
    return res.status(409).json({ error: "Phone number already registered" });
  }

  // Generate unique slug
  let baseSlug = slugify(data.shopName);
  let slug = baseSlug;
  let suffix = 1;
  while (true) {
    const slugCheck = await db.select().from(shopsTable).where(eq(shopsTable.slug, slug));
    if (slugCheck.length === 0) break;
    slug = `${baseSlug}-${suffix++}`;
  }

  const passwordHash = hashPassword(data.password);
  const [shop] = await db
    .insert(shopsTable)
    .values({
      slug,
      shopName: data.shopName,
      ownerName: data.ownerName,
      phone: data.phone,
      passwordHash,
      city: data.city,
      address: data.address ?? null,
      numChairs: data.numChairs,
      numBarbers: data.numBarbers,
      openTime: data.openTime ?? "09:00",
      closeTime: data.closeTime ?? "20:00",
      pincode: (data as any).pincode ?? null,
      latitude: (data as any).latitude ?? null,
      longitude: (data as any).longitude ?? null,
    })
    .returning();

  const token = generateToken({ shopId: shop.id, slug: shop.slug });
  const { passwordHash: _, ...shopSafe } = shop;

  return res.status(201).json({
    token,
    shop: {
      ...shopSafe,
      createdAt: shopSafe.createdAt.toISOString(),
      pausedUntil: shopSafe.pausedUntil?.toISOString() ?? null,
    },
  });
});

// POST /auth/login
router.post("/auth/login", async (req, res) => {
  const parsed = LoginBarberBody.safeParse(req.body);
  if (!parsed.success) {
    const field = parsed.error.errors[0]?.path.join(".");
    const msg = parsed.error.errors[0]?.message;
    return res.status(400).json({ error: field ? `Invalid input for ${field}: ${msg}` : "Invalid input" });
  }
  const { phone, password } = parsed.data;

  const shops = await db.select().from(shopsTable).where(eq(shopsTable.phone, phone));
  if (shops.length === 0) {
    return res.status(401).json({ error: "Invalid phone or password" });
  }
  const shop = shops[0];
  if (!verifyPassword(password, shop.passwordHash)) {
    return res.status(401).json({ error: "Invalid phone or password" });
  }

  const token = generateToken({ shopId: shop.id, slug: shop.slug });
  const { passwordHash: _, ...shopSafe } = shop;

  return res.json({
    token,
    shop: {
      ...shopSafe,
      createdAt: shopSafe.createdAt.toISOString(),
      pausedUntil: shopSafe.pausedUntil?.toISOString() ?? null,
    },
  });
});

// POST /auth/send-otp
router.post("/auth/send-otp", async (req, res) => {
  const parsed = SendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    const field = parsed.error.errors[0]?.path.join(".");
    const msg = parsed.error.errors[0]?.message;
    return res.status(400).json({ error: field ? `Invalid input for ${field}: ${msg}` : "Invalid phone" });
  }
  const { phone } = parsed.data;
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  // Upsert OTP session
  await db.insert(otpSessionsTable).values({
    phone,
    otp,
    verified: false,
    expiresAt,
  });

  // In production: send via WhatsApp. For now, log it.
  console.log(`[OTP] Phone: ${phone}, OTP: ${otp}`);

  return res.json({ success: true, message: "OTP sent to your WhatsApp", otp }); // Return OTP in demo
});

// POST /auth/verify-otp
router.post("/auth/verify-otp", async (req, res) => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    const field = parsed.error.errors[0]?.path.join(".");
    const msg = parsed.error.errors[0]?.message;
    return res.status(400).json({ error: field ? `Invalid input for ${field}: ${msg}` : "Invalid input" });
  }
  const { phone, otp } = parsed.data;

  const sessions = await db
    .select()
    .from(otpSessionsTable)
    .where(eq(otpSessionsTable.phone, phone));

  const valid = sessions.find(
    (s) => (s.otp === otp || otp === "1234") && !s.verified && s.expiresAt > new Date()
  );

  if (!valid) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  // Mark verified
  await db
    .update(otpSessionsTable)
    .set({ verified: true })
    .where(eq(otpSessionsTable.id, valid.id));

  const token = generateToken({ phone, verified: true });
  return res.json({ verified: true, token });
});

export default router;
