import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSessionMock = vi.fn();
const verifyOtpMock = vi.fn();
const getUserMock = vi.fn();
const signOutMock = vi.fn();
const profileSingleMock = vi.fn();
const profileUpdateEqMock = vi.fn();
const deleteUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
      verifyOtp: verifyOtpMock,
      getUser: getUserMock,
      signOut: signOutMock,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: profileSingleMock,
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        deleteUser: deleteUserMock,
      },
    },
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: profileUpdateEqMock,
      })),
    })),
  })),
}));

vi.mock("@/lib/utils/signup-guards", () => ({
  runSignupGuards: vi.fn(async () => ({ ok: true })),
}));

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    exchangeCodeForSessionMock.mockResolvedValue({ error: null });
    verifyOtpMock.mockResolvedValue({ error: null });
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-id",
          email: "localhost-dev@twohrs.local",
          created_at: "2026-03-21T10:00:00.000Z",
          last_sign_in_at: "2026-03-21T10:05:00.000Z",
          user_metadata: {},
        },
      },
    });
    profileSingleMock.mockResolvedValue({
      data: {
        username: "localhost_dev",
        display_name: "localhost dev",
        avatar_url: null,
      },
    });
    profileUpdateEqMock.mockResolvedValue({ error: null });
    deleteUserMock.mockResolvedValue({ error: null });
    signOutMock.mockResolvedValue({ error: null });
  });

  it("verifies token_hash magic links and redirects to next on the same origin", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new Request(
        "http://localhost:3000/auth/callback?token_hash=hashed-token-123&type=magiclink&next=/feed"
      )
    );

    expect(verifyOtpMock).toHaveBeenCalledWith({
      token_hash: "hashed-token-123",
      type: "magiclink",
    });
    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/feed");
  });
});
