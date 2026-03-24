import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  revalidatePathMock,
  createClientMock,
  isAppOpenMock,
  checkServerActionRateLimitMock,
  rpcMock,
} = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  createClientMock: vi.fn(),
  isAppOpenMock: vi.fn(() => true),
  checkServerActionRateLimitMock: vi.fn(),
  rpcMock: vi.fn(),
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

describe("toggleVote", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    isAppOpenMock.mockReturnValue(true);
  });

  it("returns the rate-limit error before calling toggle_vote", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "11111111-1111-4111-8111-111111111111" } },
        }),
      },
      rpc: rpcMock,
    });
    checkServerActionRateLimitMock.mockResolvedValue({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });

    const { toggleVote } = await import("./votes");
    const result = await toggleVote("22222222-2222-4222-8222-222222222222");

    expect(result).toEqual({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });
    expect(checkServerActionRateLimitMock).toHaveBeenCalledWith(
      "vote:post",
      "11111111-1111-4111-8111-111111111111",
      30,
      60_000
    );
    expect(rpcMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
