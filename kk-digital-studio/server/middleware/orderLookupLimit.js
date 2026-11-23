const WINDOW_MS = 15 * 60 * 1000;
const MAX_LOOKUPS = 40;
const MAX_BATCH_SIZE = 20;
const MESSAGE = 'Too many order lookups. Please try again shortly.';

export function createOrderLookupLimit({ windowMs = WINDOW_MS, maxLookups = MAX_LOOKUPS, now = Date.now } = {}) {
  const attempts = new Map();
  let nextCleanup = 0;

  return (req, res, next) => {
    const time = now();
    if (time >= nextCleanup) {
      for (const [key, bucket] of attempts) {
        if (bucket.resetAt <= time) attempts.delete(key);
      }
      nextCleanup = time + Math.min(windowMs, 60_000);
    }

    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const requested = Array.isArray(req.body?.items)
      ? Math.max(1, Math.min(req.body.items.length, MAX_BATCH_SIZE))
      : 1;
    let bucket = attempts.get(key);
    if (!bucket || bucket.resetAt <= time) {
      bucket = { count: 0, resetAt: time + windowMs };
      attempts.set(key, bucket);
    }

    if (bucket.count + requested > maxLookups) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - time) / 1000))));
      return res.status(429).json({ message: MESSAGE });
    }

    bucket.count += requested;
    next();
  };
}

export const orderLookupLimit = createOrderLookupLimit();
