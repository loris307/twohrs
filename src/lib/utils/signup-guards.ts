import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { hashNormalizedAuthEmail } from "@/lib/utils/auth-email";
import { requiredEmailSchema } from "@/lib/validations";

const DEFAULT_SIGNUP_RATE_LIMIT_MAX = 3;
const DEFAULT_SIGNUP_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_SIGNUP_EMAIL_COOLDOWN_MS = 15 * 60 * 1000;

export type SignupGuardResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getClientIp(headersList: Headers): string {
  return (
    headersList.get("x-real-ip") ||
    headersList.get("x-forwarded-for")?.split(",").pop()?.trim() ||
    "unknown"
  );
}

export async function runSignupGuards(
  email: string,
  headersList: Headers
): Promise<SignupGuardResult> {
  const parsedEmail = requiredEmailSchema.safeParse(email);
  if (!parsedEmail.success) {
    return { ok: false, error: "Registrierung fehlgeschlagen" };
  }

  const normalizedEmail = parsedEmail.data;
  const emailHash = hashNormalizedAuthEmail(normalizedEmail);
  const clientIp = getClientIp(headersList);

  const signupIpLimit = checkRateLimit(
    `auth:signup:ip:${clientIp}`,
    readPositiveIntEnv("SIGNUP_RATE_LIMIT_MAX", DEFAULT_SIGNUP_RATE_LIMIT_MAX),
    readPositiveIntEnv(
      "SIGNUP_RATE_LIMIT_WINDOW_MS",
      DEFAULT_SIGNUP_RATE_LIMIT_WINDOW_MS
    )
  );

  if (!signupIpLimit.allowed) {
    return {
      ok: false,
      error:
        "Zu viele Registrierungen von dieser Verbindung. Bitte versuche es später erneut.",
    };
  }

  const adminClient = createAdminClient();
  const { data: banned } = await adminClient
    .from("banned_email_hashes")
    .select("hash")
    .eq("hash", emailHash)
    .single();

  if (banned) {
    return { ok: false, error: "Registrierung nicht möglich" };
  }

  const signupEmailCooldown = checkRateLimit(
    `auth:signup:email:${emailHash}`,
    1,
    readPositiveIntEnv(
      "SIGNUP_EMAIL_COOLDOWN_MS",
      DEFAULT_SIGNUP_EMAIL_COOLDOWN_MS
    )
  );

  if (!signupEmailCooldown.allowed) {
    return {
      ok: false,
      error:
        "Für diese E-Mail wurde gerade bereits eine Registrierungsanfrage gestellt. Bitte prüfe dein Postfach und versuche es gleich erneut.",
    };
  }

  return { ok: true, email: normalizedEmail };
}
