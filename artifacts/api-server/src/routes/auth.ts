import { Router } from "express";
import { db, shopsTable, ownersTable, otpSessionsTable } from "@workspace/db";
import { eq, lt } from "drizzle-orm";
import { hashPassword, verifyPassword, generateToken, generateOtp, slugify, revokeToken } from "../lib/auth";
import { RegisterBarberBody, LoginBarberBody, SendOtpBody, VerifyOtpBody } from "@workspace/api-zod";
import { rateLimit } from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." }
});


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

  // Check phone uniqueness in ownersTable
  const existingOwner = await db.select().from(ownersTable).where(eq(ownersTable.phone, data.phone));
  if (existingOwner.length > 0) {
    return res.status(409).json({ error: "Phone number already registered" });
  }

  // No OTP needed for barber registration — just phone + password

  const passwordHash = hashPassword(data.password);
  try {
    const [owner] = await db
      .insert(ownersTable)
      .values({
        phone: data.phone,
        passwordHash,
        name: data.ownerName,
      })
      .returning();

    const token = generateToken({ ownerId: owner.id }); // no shopId yet
    
    const { passwordHash: _, ...ownerSafe } = owner;
    
    return res.status(201).json({ 
      token, 
      owner: {
        ...ownerSafe,
        createdAt: ownerSafe.createdAt.toISOString()
      }, 
      shop: null
    });
  } catch (error: any) {
    req.log.error(error);
    return res.status(500).json({ error: "Registration failed" });
  }
});

// POST /auth/login
router.post("/auth/login", authLimiter, async (req, res) => {
  const parsed = LoginBarberBody.safeParse(req.body);
  if (!parsed.success) {
    const field = parsed.error.errors[0]?.path.join(".");
    const msg = parsed.error.errors[0]?.message;
    return res.status(400).json({ error: field ? `Invalid input for ${field}: ${msg}` : "Invalid input" });
  }
  const { phone, password } = parsed.data;

  const owners = await db.select().from(ownersTable).where(eq(ownersTable.phone, phone));
  if (owners.length === 0) {
    return res.status(401).json({ error: "Invalid phone or password" });
  }
  const owner = owners[0];
  if (!verifyPassword(password, owner.passwordHash)) {
    return res.status(401).json({ error: "Invalid phone or password" });
  }

  // Get the first shop
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.ownerId, owner.id));
  const shop = shops[0];

  const token = generateToken({ ownerId: owner.id, shopId: shop?.id, slug: shop?.slug });
  const { passwordHash: _, ...ownerSafe } = owner;

  return res.json({
    token,
    owner: {
      ...ownerSafe,
      createdAt: ownerSafe.createdAt.toISOString()
    },
    shop: shop ? {
      id: shop.id,
      slug: shop.slug,
      shopName: shop.shopName,
      city: shop.city,
      address: shop.address,
      numChairs: shop.numChairs,
      numBarbers: shop.numBarbers,
      openTime: shop.openTime,
      closeTime: shop.closeTime,
      isOpen: shop.isOpen,
      isVerified: shop.isVerified,
      isPaused: shop.isPaused,
      createdAt: shop.createdAt.toISOString(),
      pausedUntil: shop.pausedUntil?.toISOString() ?? null,
    } : null,
  });
});

// POST /auth/send-otp
router.post("/auth/send-otp", authLimiter, async (req, res) => {
  const parsed = SendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    const field = parsed.error.errors[0]?.path.join(".");
    const msg = parsed.error.errors[0]?.message;
    return res.status(400).json({ error: field ? `Invalid input for ${field}: ${msg}` : "Invalid phone" });
  }
  const phone = parsed.data.phone;
  const checkOwner = (parsed.data as any).checkOwner;

  if (checkOwner) {
    const existingOwner = await db.select().from(ownersTable).where(eq(ownersTable.phone, phone));
    if (existingOwner.length > 0) {
      return res.status(409).json({ error: "Phone number already registered" });
    }
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  // Delete old OTP sessions for this phone
  await db.delete(otpSessionsTable).where(eq(otpSessionsTable.phone, phone));
  // Globally clean up all expired OTP sessions (Fix #15)
  await db.delete(otpSessionsTable).where(lt(otpSessionsTable.expiresAt, new Date()));

  // Insert new OTP session
  await db.insert(otpSessionsTable).values({
    phone,
    otp,
    verified: false,
    expiresAt,
  });

  // In production: send via WhatsApp. For now, log it.
  req.log.info({ phone }, "OTP generated for phone");

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
    (s) => s.otp === otp && !s.verified && s.expiresAt > new Date()
  );

  if (!valid) {
    // Delete session on failed attempt to prevent brute force (Fix #9)
    await db.delete(otpSessionsTable).where(eq(otpSessionsTable.phone, phone));
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

// POST /auth/logout
router.post("/auth/logout", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    if (token) {
      revokeToken(token);
    }
  }
  return res.json({ success: true });
});

export default router;
