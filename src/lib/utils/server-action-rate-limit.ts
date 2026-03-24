import { headers } from "next/headers";
import { checkRateLimit, getRateLimitClientIp } from "@/lib/utils/rate-limit";
import type { ActionResult } from "@/lib/types";

export async function checkServerActionRateLimit(
  scope: string,
  userId: string,
  limit: number,
  windowMs: number
): Promise<ActionResult<never> | null> {
  const headersList = await headers();
  const ip = getRateLimitClientIp({ headers: headersList });

  const keys = [`server-action:user:${scope}:${userId}`];
  if (ip) {
    keys.push(`server-action:ip:${scope}:${ip}`);
  }

  const results = await Promise.all(
    keys.map((key) => checkRateLimit(key, limit, windowMs))
  );

  if (results.every((result) => result.allowed)) {
    return null;
  }

  return {
    success: false,
    error: "Zu viele Anfragen. Bitte warte kurz.",
  };
}
