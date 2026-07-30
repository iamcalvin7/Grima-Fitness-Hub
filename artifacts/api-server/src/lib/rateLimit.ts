import type { RequestHandler } from "express";

/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Deliberately dependency-free and per-process: good enough for a single
 * API instance at PT scale. If the app ever scales horizontally, swap the
 * store for something shared (Redis) behind this same interface.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodic sweep so abandoned buckets don't accumulate.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000).unref();

export function rateLimit(options: {
  /** Unique name for this limiter (part of the bucket key). */
  name: string;
  /** Max requests per window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Extra key derivation (e.g. per-email). Defaults to per-IP. */
  keyFn?: (req: Parameters<RequestHandler>[0]) => string;
}): RequestHandler {
  const { name, max, windowMs, keyFn } = options;
  return (req, res, next) => {
    const key = `${name}:${keyFn ? keyFn(req) : (req.ip ?? "unknown")}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
      res.status(429).json({ error: "Too many attempts. Please try again later." });
      return;
    }
    next();
  };
}

/** Test hook / process hygiene. */
export function resetRateLimits(): void {
  buckets.clear();
}
