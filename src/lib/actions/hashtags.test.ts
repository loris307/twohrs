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

describe("hashtag follow actions", () => {
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

  it("uses the shared follow:hashtag bucket for followHashtag and returns early", async () => {
    checkServerActionRateLimitMock.mockResolvedValue({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });

    const { followHashtag } = await import("./hashtags");
    const result = await followHashtag("memes");

    expect(result).toEqual({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });
    expect(checkServerActionRateLimitMock).toHaveBeenCalledWith(
      "follow:hashtag",
      "11111111-1111-4111-8111-111111111111",
      20,
      60_000
    );
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("uses the shared follow:hashtag bucket for unfollowHashtag and returns early", async () => {
    checkServerActionRateLimitMock.mockResolvedValue({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });

    const { unfollowHashtag } = await import("./hashtags");
    const result = await unfollowHashtag("memes");

    expect(result).toEqual({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });
    expect(checkServerActionRateLimitMock).toHaveBeenCalledWith(
      "follow:hashtag",
      "11111111-1111-4111-8111-111111111111",
      20,
      60_000
    );
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
