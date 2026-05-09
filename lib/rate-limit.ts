// Simple in-memory sliding-window rate limiter.
// For multi-instance prod use Upstash/Redis or Postgres. Good enough for single-region hackathon deploys.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, max: number, windowMs: number): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfterMs: 0 };
  }
  if (bucket.count >= max) {
    return { allowed: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { allowed: true, remaining: max - bucket.count, retryAfterMs: 0 };
}

// Periodically prune stale buckets to avoid memory growth
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    buckets.forEach((b, k) => {
      if (b.resetAt < now) buckets.delete(k);
    });
  }, 60_000).unref?.();
}
