/**
 * Shared Postgres-backed rate limiter.
 * Calls the check_rate_limit RPC via Supabase REST API (service_role).
 * Fails open on any error (network, timeout, missing config).
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

interface RequestWithHeaders {
  headers: {
    get(name: string): string | null;
  };
}

const RPC_TIMEOUT_MS = 5_000;

/**
 * Check if a request is within the rate limit.
 * @param key - Unique identifier (e.g. IP + route prefix)
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60s)
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number = 60_000
): Promise<RateLimitResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    // No config — fail open
    return { allowed: true, remaining: limit };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/check_rate_limit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        p_scope_key: key,
        p_limit: limit,
        p_window_ms: windowMs,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error("Rate limit RPC failed:", res.status, await res.text());
      return { allowed: true, remaining: limit }; // fail open
    }

    const data = await res.json();
    // Supabase returns the SETOF result as an array for RPC calls
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return { allowed: true, remaining: limit }; // fail open
    }

    return {
      allowed: row.allowed,
      remaining: row.remaining,
    };
  } catch {
    console.error("Rate limit RPC error (timeout or network)");
    return { allowed: true, remaining: limit }; // fail open
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Per-route rate limit configuration */
export interface RouteRateLimit {
  pattern: string;
  limit: number;
}

/**
 * Extract the client IP from request headers.
 * Prefers x-real-ip (set by Vercel, not spoofable).
 * Falls back to the last entry in x-forwarded-for (Vercel-appended).
 * Returns null if no IP can be determined.
 */
export function getClientIp(request: RequestWithHeaders): string | null {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
    null
  );
}

export const API_RATE_LIMITS: RouteRateLimit[] = [
  { pattern: "/api/og", limit: 10 },
  { pattern: "/api/export", limit: 2 },
  { pattern: "/api/search", limit: 60 },
  { pattern: "/api/feed", limit: 60 },
  { pattern: "/api/comments", limit: 60 },
  { pattern: "/api/mentions", limit: 60 },
];

export const PAGE_RATE_LIMITS: RouteRateLimit[] = [
  { pattern: "/", limit: 20 },
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

export function getPageRateLimitForPath(pathname: string): number | null {
  for (const route of PAGE_RATE_LIMITS) {
    if (pathname === route.pattern) {
      return route.limit;
    }
  }
  return null;
}
