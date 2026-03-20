import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  isInternalAuthEmail,
  getVisibleAccountEmail,
  getRecoveryEmailStatus,
  hasEmailIdentity,
} from "./auth-email";
import type { User } from "@supabase/supabase-js";

function makeUser(overrides: Partial<User> & { new_email?: string }): User {
  return {
    id: "test-user-id",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
    email: "signup+test@auth.twohrs.invalid",
    email_confirmed_at: undefined,
    identities: [{ id: "1", user_id: "test-user-id", provider: "email", identity_data: {}, identity_id: "", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", last_sign_in_at: "2026-01-01T00:00:00Z" }],
    ...overrides,
  } as User;
}

describe("isInternalAuthEmail", () => {
  it("detects internal auth emails", () => {
    expect(isInternalAuthEmail("signup+test@auth.twohrs.invalid")).toBe(true);
    expect(isInternalAuthEmail("backfill+abc@auth.twohrs.invalid")).toBe(true);
  });

  it("returns false for real emails", () => {
    expect(isInternalAuthEmail("user@example.com")).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isInternalAuthEmail(null)).toBe(false);
    expect(isInternalAuthEmail(undefined)).toBe(false);
  });
});

describe("getVisibleAccountEmail", () => {
  it("returns null for internal emails", () => {
    expect(getVisibleAccountEmail("signup+test@auth.twohrs.invalid")).toBeNull();
  });

  it("returns the email for real addresses", () => {
    expect(getVisibleAccountEmail("user@example.com")).toBe("user@example.com");
  });

  it("returns null for null/undefined", () => {
    expect(getVisibleAccountEmail(null)).toBeNull();
    expect(getVisibleAccountEmail(undefined)).toBeNull();
  });
});

describe("hasEmailIdentity", () => {
  it("returns true when email identity exists", () => {
    const user = makeUser({});
    expect(hasEmailIdentity(user)).toBe(true);
  });

  it("returns false for OAuth-only user", () => {
    const user = makeUser({
      identities: [{ id: "1", user_id: "test-user-id", provider: "google", identity_data: {}, identity_id: "", created_at: "", updated_at: "", last_sign_in_at: "" }],
    });
    expect(hasEmailIdentity(user)).toBe(false);
  });

  it("returns true for OAuth user who later set a password", () => {
    const user = makeUser({
      identities: [
        { id: "1", user_id: "test-user-id", provider: "google", identity_data: {}, identity_id: "", created_at: "", updated_at: "", last_sign_in_at: "" },
        { id: "2", user_id: "test-user-id", provider: "email", identity_data: {}, identity_id: "", created_at: "", updated_at: "", last_sign_in_at: "" },
      ],
    });
    expect(hasEmailIdentity(user)).toBe(true);
  });
});

describe("getRecoveryEmailStatus", () => {
  it("returns verified_recovery_email for real confirmed email", () => {
    const user = makeUser({
      email: "user@example.com",
      email_confirmed_at: "2026-01-01T00:00:00Z",
    });
    expect(getRecoveryEmailStatus(user)).toBe("verified_recovery_email");
  });

  it("returns missing_recovery_email for internal placeholder only", () => {
    const user = makeUser({
      email: "signup+test@auth.twohrs.invalid",
    });
    expect(getRecoveryEmailStatus(user)).toBe("missing_recovery_email");
  });

  it("returns pending_first_email for internal placeholder plus new_email", () => {
    const user = makeUser({
      email: "signup+test@auth.twohrs.invalid",
      new_email: "newuser@example.com",
    });
    expect(getRecoveryEmailStatus(user)).toBe("pending_first_email");
  });

  it("returns pending_email_change for real email plus new_email", () => {
    const user = makeUser({
      email: "old@example.com",
      email_confirmed_at: "2026-01-01T00:00:00Z",
      new_email: "new@example.com",
    });
    expect(getRecoveryEmailStatus(user)).toBe("pending_email_change");
  });

  it("returns unconfirmed_email_signup for real email without email_confirmed_at", () => {
    const user = makeUser({
      email: "unconfirmed@example.com",
      email_confirmed_at: undefined,
    });
    expect(getRecoveryEmailStatus(user)).toBe("unconfirmed_email_signup");
  });

  it("returns oauth_only for Google OAuth user without email identity", () => {
    const user = makeUser({
      email: "google@example.com",
      email_confirmed_at: "2026-01-01T00:00:00Z",
      identities: [{ id: "1", user_id: "test-user-id", provider: "google", identity_data: {}, identity_id: "", created_at: "", updated_at: "", last_sign_in_at: "" }],
    });
    expect(getRecoveryEmailStatus(user)).toBe("oauth_only");
  });

  it("returns verified_recovery_email for OAuth user who later set a password", () => {
    const user = makeUser({
      email: "google@example.com",
      email_confirmed_at: "2026-01-01T00:00:00Z",
      identities: [
        { id: "1", user_id: "test-user-id", provider: "google", identity_data: {}, identity_id: "", created_at: "", updated_at: "", last_sign_in_at: "" },
        { id: "2", user_id: "test-user-id", provider: "email", identity_data: {}, identity_id: "", created_at: "", updated_at: "", last_sign_in_at: "" },
      ],
    });
    expect(getRecoveryEmailStatus(user)).toBe("verified_recovery_email");
  });
});
