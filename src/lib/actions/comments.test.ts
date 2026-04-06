import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  revalidatePathMock,
  createClientMock,
  createAdminClientMock,
  isAppOpenMock,
  checkServerActionRateLimitMock,
  fromMock,
  removeMock,
} = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  isAppOpenMock: vi.fn(() => true),
  checkServerActionRateLimitMock: vi.fn(),
  fromMock: vi.fn(),
  removeMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock("@/lib/utils/time", () => ({
  isAppOpen: isAppOpenMock,
}));

vi.mock("@/lib/utils/server-action-rate-limit", () => ({
  checkServerActionRateLimit: checkServerActionRateLimitMock,
}));

describe("toggleCommentVote", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    isAppOpenMock.mockReturnValue(true);
  });

  it("returns the rate-limit error before querying comments", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "11111111-1111-4111-8111-111111111111" } },
        }),
      },
      from: fromMock,
      storage: {
        from: vi.fn(() => ({
          remove: removeMock,
        })),
      },
    });
    checkServerActionRateLimitMock.mockResolvedValue({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });

    const { toggleCommentVote } = await import("./comments");
    const result = await toggleCommentVote("22222222-2222-4222-8222-222222222222");

    expect(result).toEqual({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });
    expect(checkServerActionRateLimitMock).toHaveBeenCalledWith(
      "vote:comment",
      "11111111-1111-4111-8111-111111111111",
      30,
      60_000
    );
    expect(fromMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("createComment", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    isAppOpenMock.mockReturnValue(true);

    const countGteMock = vi.fn().mockResolvedValue({ count: 0 });
    const countIsMock = vi.fn(() => ({ gte: countGteMock }));
    const countEqMock = vi.fn(() => ({ is: countIsMock }));

    fromMock.mockImplementation((table: string) => {
      if (table === "comments") {
        return {
          select: vi.fn(() => ({ eq: countEqMock })),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "11111111-1111-4111-8111-111111111111" } },
        }),
      },
      from: fromMock,
    });

    createAdminClientMock.mockReturnValue({
      storage: {
        from: vi.fn(() => ({
          list: vi.fn().mockResolvedValue({ data: [], error: null }),
          remove: removeMock,
        })),
      },
      from: vi.fn(),
    });
  });

  it("returns the rate-limit error before createComment queries comments and removes a staged owned image", async () => {
    checkServerActionRateLimitMock.mockResolvedValue({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });

    const stagedImagePath =
      "comments/11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp";

    const { createComment } = await import("./comments");
    const result = await createComment(
      "22222222-2222-4222-8222-222222222222",
      "hello",
      undefined,
      stagedImagePath
    );

    expect(result).toEqual({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });
    expect(checkServerActionRateLimitMock).toHaveBeenCalledWith(
      "comment:create",
      "11111111-1111-4111-8111-111111111111",
      20,
      60_000
    );
    expect(removeMock).toHaveBeenCalledWith([stagedImagePath]);
    expect(fromMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
