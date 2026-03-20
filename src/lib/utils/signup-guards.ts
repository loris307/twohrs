import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import {
  hashNormalizedAuthEmail,
  isInternalAuthEmail,
} from "@/lib/utils/auth-email";
import { isDisposableEmail } from "@/lib/utils/disposable-email";
import { requiredEmailSchema } from "@/lib/validations";

const DEFAULT_SIGNUP_RATE_LIMIT_MAX = 3;
const DEFAULT_SIGNUP_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_SIGNUP_EMAIL_COOLDOWN_MS = 15 * 60 * 1000;

export type EmailPolicyResult =
  | { ok: true; email: string }
  | {
      ok: false;
      error: string;
      reason: "invalid_email" | "disposable_email" | "banned_email" | "internal_email";
    };

export type SignupGuardResult =
  | { ok: true; email: string }
  | {
      ok: false;
      error: string;
      reason:
        | "invalid_email"
        | "disposable_email"
        | "signup_ip_rate_limited"
        | "banned_email"
        | "signup_email_cooldown"
        | "internal_email";
    };

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

/**
 * Reusable email policy checks shared by signup and recovery-email flows.
 * Does NOT include signup-specific rate limits.
 */
export async function checkEmailPolicy(
  email: string
): Promise<EmailPolicyResult> {
  const parsedEmail = requiredEmailSchema.safeParse(email);
  if (!parsedEmail.success) {
    return { ok: false, error: "Ungültige E-Mail-Adresse", reason: "invalid_email" };
  }

  const normalizedEmail = parsedEmail.data;

  if (isInternalAuthEmail(normalizedEmail)) {
    return {
      ok: false,
      error: "Diese E-Mail-Adresse ist nicht erlaubt",
      reason: "internal_email",
    };
  }

  if (isDisposableEmail(normalizedEmail)) {
    return {
      ok: false,
      error:
        "Temporäre oder Alias-E-Mail-Adressen sind nicht erlaubt. Bitte nutze eine normale E-Mail-Adresse.",
      reason: "disposable_email",
    };
  }

  const emailHash = hashNormalizedAuthEmail(normalizedEmail);
  const adminClient = createAdminClient();
  const { data: banned } = await adminClient
    .from("banned_email_hashes")
    .select("hash")
    .eq("hash", emailHash)
    .single();

  if (banned) {
    return { ok: false, error: "Diese E-Mail-Adresse ist nicht erlaubt", reason: "banned_email" };
  }

  return { ok: true, email: normalizedEmail };
}

export async function runSignupGuards(
  email: string,
  headersList: Headers
): Promise<SignupGuardResult> {
  // 1. Cheap checks first (no DB)
  const parsedEmail = requiredEmailSchema.safeParse(email);
  if (!parsedEmail.success) {
    return { ok: false, error: "Registrierung fehlgeschlagen", reason: "invalid_email" };
  }

  const normalizedEmail = parsedEmail.data;

  if (isInternalAuthEmail(normalizedEmail)) {
    return { ok: false, error: "Registrierung fehlgeschlagen", reason: "internal_email" };
  }

  if (isDisposableEmail(normalizedEmail)) {
    return {
      ok: false,
      error:
        "Temporäre oder Alias-E-Mail-Adressen sind für Registrierungen nicht erlaubt. Bitte nutze eine normale E-Mail-Adresse.",
      reason: "disposable_email",
    };
  }

  // 2. Rate limits (cheap, in-memory — before any DB call)
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
      reason: "signup_ip_rate_limited",
      error:
        "Zu viele Registrierungen von dieser Verbindung. Bitte versuche es später erneut.",
    };
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
      reason: "signup_email_cooldown",
      error:
        "Für diese E-Mail wurde gerade bereits eine Registrierungsanfrage gestellt. Bitte prüfe dein Postfach und versuche es gleich erneut.",
    };
  }

  // 3. DB check last (expensive — only reached after rate limits pass)
  const adminClient = createAdminClient();
  const { data: banned } = await adminClient
    .from("banned_email_hashes")
    .select("hash")
    .eq("hash", emailHash)
    .single();

  if (banned) {
    return { ok: false, error: "Registrierung nicht möglich", reason: "banned_email" };
  }

  return { ok: true, email: normalizedEmail };
}
