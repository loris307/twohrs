import "server-only";
import { createHash } from "crypto";
import type { User } from "@supabase/supabase-js";

const INTERNAL_AUTH_EMAIL_DOMAIN = "auth.twohrs.invalid";

export type RecoveryEmailStatus =
  | "missing_recovery_email"
  | "pending_first_email"
  | "verified_recovery_email"
  | "pending_email_change"
  | "unconfirmed_email_signup"
  | "oauth_only";

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashNormalizedAuthEmail(email: string): string {
  return createHash("sha256")
    .update(normalizeAuthEmail(email))
    .digest("hex");
}

export function buildInternalAuthEmail(username: string): string {
  return `signup+${username.toLowerCase()}@${INTERNAL_AUTH_EMAIL_DOMAIN}`;
}

export function isInternalAuthEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return normalizeAuthEmail(email).endsWith(`@${INTERNAL_AUTH_EMAIL_DOMAIN}`);
}

export function getVisibleAccountEmail(
  email: string | null | undefined
): string | null {
  if (!email || isInternalAuthEmail(email)) {
    return null;
  }

  return email;
}

/**
 * Check whether the user has an email-provider identity (i.e. a password).
 * Do NOT rely on app_metadata.provider alone — OAuth users who later set
 * a password still show provider: "google" in metadata.
 */
export function hasEmailIdentity(user: User): boolean {
  return (user.identities ?? []).some((id) => id.provider === "email");
}

/**
 * Derive the recovery-email status from a Supabase User object.
 * Must run server-side only.
 */
export function getRecoveryEmailStatus(user: User): RecoveryEmailStatus {
  const email = user.email;
  const newEmail = user.new_email;
  const isInternal = isInternalAuthEmail(email);
  const hasPassword = hasEmailIdentity(user);

  // Google OAuth users without a password — Google manages their email
  if (!hasPassword) {
    return "oauth_only";
  }

  // Real email that's not yet confirmed (fresh signup, hasn't clicked link)
  if (!isInternal && email && !user.email_confirmed_at) {
    return "unconfirmed_email_signup";
  }

  // Internal placeholder + pending new email = first email being added
  if (isInternal && newEmail) {
    return "pending_first_email";
  }

  // Internal placeholder, no pending change = no recovery email at all
  if (isInternal) {
    return "missing_recovery_email";
  }

  // Real confirmed email + pending new email = changing email
  if (!isInternal && newEmail) {
    return "pending_email_change";
  }

  // Real confirmed email, no pending change
  return "verified_recovery_email";
}
