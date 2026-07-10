import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Simple in-memory rate limiter.
 * For production, replace with a Redis-backed solution (e.g. express-rate-limit + rate-limit-redis).
 */
export function rateLimit({
  windowMs = 60_000,
  max = 100,
  message = "Too many requests, please try again later",
}: {
  windowMs?: number;
  max?: number;
  message?: string;
} = {}) {
  const store = new Map<string, RateLimitEntry>();

  // Periodically clean expired entries to prevent memory leaks
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetTime <= now) store.delete(key);
    }
  }, windowMs);
  cleanup.unref(); // Don't prevent process exit

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || entry.resetTime <= now) {
      entry = { count: 0, resetTime: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetTime / 1000)));

    if (entry.count > max) {
      res.status(429).json({ error: message });
      return;
    }

    next();
  };
}
