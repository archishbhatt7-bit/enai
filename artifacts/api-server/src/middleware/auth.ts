import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth.js";

export interface OwnerAuthRequest extends Request {
  ownerId?: number;
}

export function requireOwnerAuth(req: OwnerAuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);

  if (!payload || !payload.ownerId) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  req.ownerId = payload.ownerId as number;
  next();
}

export interface CustomerAuthRequest extends Request {
  customerPhone?: string;
}

export function requireCustomerAuth(req: CustomerAuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);

  if (!payload || !payload.phone) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  req.customerPhone = payload.phone as string;
  next();
}
