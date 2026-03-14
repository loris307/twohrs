const INTERNAL_AUTH_EMAIL_DOMAIN = "auth.twohrs.invalid";

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
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
