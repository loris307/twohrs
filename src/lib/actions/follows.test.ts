import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  revalidatePathMock,
  createClientMock,
  isAppOpenMock,
  checkServerActionRateLimitMock,
  insertMock,
  deleteMock,
  eqMock,
  fromMock,
} = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  createClientMock: vi.fn(),
  isAppOpenMock: vi.fn(() => true),
  checkServerActionRateLimitMock: vi.fn(),
  insertMock: vi.fn(),
  deleteMock: vi.fn(),
  eqMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/utils/time", () => ({
  isAppOpen: isAppOpenMock,
}));

vi.mock("@/lib/utils/server-action-rate-limit", () => ({
  checkServerActionRateLimit: checkServerActionRateLimitMock,
}));

describe("follow actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    isAppOpenMock.mockReturnValue(true);
    eqMock.mockReturnThis();
    deleteMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({
      insert: insertMock,
      delete: deleteMock,
    });
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "11111111-1111-4111-8111-111111111111" } },
        }),
      },
      from: fromMock,
    });
  });

  it("uses the shared follow:user bucket for followUser and returns early", async () => {
    checkServerActionRateLimitMock.mockResolvedValue({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });

    const { followUser } = await import("./follows");
    const result = await followUser("22222222-2222-4222-8222-222222222222");

    expect(result).toEqual({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });
    expect(checkServerActionRateLimitMock).toHaveBeenCalledWith(
      "follow:user",
      "11111111-1111-4111-8111-111111111111",
      20,
      60_000
    );
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("uses the shared follow:user bucket for unfollowUser and returns early", async () => {
    checkServerActionRateLimitMock.mockResolvedValue({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });

    const { unfollowUser } = await import("./follows");
    const result = await unfollowUser("22222222-2222-4222-8222-222222222222");

    expect(result).toEqual({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });
    expect(checkServerActionRateLimitMock).toHaveBeenCalledWith(
      "follow:user",
      "11111111-1111-4111-8111-111111111111",
      20,
      60_000
    );
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
