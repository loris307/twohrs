/**
 * In-memory sliding-window rate limiter.
 * Resets on Vercel cold starts — acceptable for current traffic.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Max number of unique keys in the store to prevent memory exhaustion
// from attackers cycling through many IPs
const MAX_STORE_SIZE = 10_000;

// Cleanup old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }

  // If still over limit after cleanup, clear everything
  // (entries expire anyway, so this is safe)
  if (store.size > MAX_STORE_SIZE) {
    store.clear();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Check if a request is within the rate limit.
 * @param key - Unique identifier (e.g. IP + route prefix)
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60s)
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number = 60_000
): RateLimitResult {
  cleanup(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    // Evict all entries if store is at capacity (prevents memory exhaustion)
    if (store.size >= MAX_STORE_SIZE) {
      store.clear();
    }
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: limit - entry.timestamps.length };
}

/** Per-route rate limit configuration */
export interface RouteRateLimit {
  pattern: string;
  limit: number;
}

export const API_RATE_LIMITS: RouteRateLimit[] = [
  { pattern: "/api/og", limit: 10 },
  { pattern: "/api/export", limit: 2 },
  { pattern: "/api/search", limit: 60 },
  { pattern: "/api/feed", limit: 60 },
  { pattern: "/api/comments", limit: 60 },
  { pattern: "/api/mentions", limit: 60 },
];

export const DEFAULT_API_RATE_LIMIT = 30;

/**
 * Get the rate limit for a given API path.
 */
export function getRateLimitForPath(pathname: string): number {
  for (const route of API_RATE_LIMITS) {
    if (pathname === route.pattern || pathname.startsWith(route.pattern + "/")) {
      return route.limit;
    }
  }
  return DEFAULT_API_RATE_LIMIT;
}
