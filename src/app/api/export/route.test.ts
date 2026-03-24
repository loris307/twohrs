import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClientMock,
  createAdminClientMock,
  getUserMock,
  fromMock,
  profileSelectMock,
  profileEqMock,
  profileSingleMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  getUserMock: vi.fn(),
  fromMock: vi.fn(),
  profileSelectMock: vi.fn(),
  profileEqMock: vi.fn(),
  profileSingleMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock("@/lib/utils/auth-email", () => ({
  getVisibleAccountEmail: vi.fn((email?: string | null) => email ?? null),
  isInternalAuthEmail: vi.fn(() => false),
}));

describe("GET /api/export", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
      },
    });
  });

  it("returns 401 when the user is not authenticated", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
    });

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Nicht eingeloggt" });
  });

  it("uses PUBLIC_PROFILE_SELECT and excludes internal profile fields from the export", async () => {
    const { PUBLIC_PROFILE_SELECT } = await import("@/lib/queries/profile");

    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "11111111-1111-4111-8111-111111111111",
          email: "user@example.com",
          created_at: "2026-03-24T08:00:00.000Z",
        },
      },
    });

    const publicProfile = {
      id: "11111111-1111-4111-8111-111111111111",
      username: "tester",
      display_name: "tester",
      avatar_url: null,
      bio: null,
      total_upvotes_received: 12,
      total_posts_created: 3,
      days_won: 1,
      created_at: "2026-03-01T08:00:00.000Z",
    };
    const profileWithInternalFields = {
      ...publicProfile,
      is_admin: true,
      moderation_strikes: 2,
      nsfw_strikes: 99,
    };

    profileSelectMock.mockImplementation((select: string) => {
      profileSingleMock.mockResolvedValue({
        data:
          select === PUBLIC_PROFILE_SELECT
            ? publicProfile
            : profileWithInternalFields,
      });
      profileEqMock.mockReturnValue({
        single: profileSingleMock,
      });
      return {
        eq: profileEqMock,
      };
    });

    const emptyResult = { data: [] };
    const makeEqChain = () => ({
      eq: vi.fn().mockReturnValue(emptyResult),
    });
    const makeEqOrderChain = () => ({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue(emptyResult),
      }),
    });

    fromMock.mockImplementation((table: string) => {
      if (table === "profiles") {
        return { select: profileSelectMock };
      }
      if (table === "daily_leaderboard") {
        return { select: vi.fn().mockReturnValue(makeEqOrderChain()) };
      }
      return { select: vi.fn().mockReturnValue(makeEqChain()) };
    });
    createAdminClientMock.mockReturnValue({
      from: fromMock,
    });

    const { GET } = await import("./route");
    const response = await GET();
    const body = JSON.parse(await response.text());

    expect(response.status).toBe(200);
    expect(profileSelectMock).toHaveBeenCalledWith(PUBLIC_PROFILE_SELECT);
    expect(body.profile).not.toHaveProperty("is_admin");
    expect(body.profile).not.toHaveProperty("moderation_strikes");
    expect(body.profile).not.toHaveProperty("nsfw_strikes");
  });
});
