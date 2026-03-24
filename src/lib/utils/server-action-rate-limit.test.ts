import { beforeEach, describe, expect, it, vi } from "vitest";

const { headersMock, checkRateLimitMock } = vi.hoisted(() => ({
  headersMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/utils/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/utils/rate-limit")>("@/lib/utils/rate-limit");
  return {
    ...actual,
    checkRateLimit: checkRateLimitMock,
  };
});

describe("checkServerActionRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enforces the user-only key when no IP headers are present", async () => {
    headersMock.mockResolvedValue(new Headers());
    checkRateLimitMock.mockResolvedValue({ allowed: true, remaining: 29 });

    const { checkServerActionRateLimit } = await import("./server-action-rate-limit");
    const result = await checkServerActionRateLimit("vote:post", "user-1", 30, 60_000);

    expect(result).toBeNull();
    expect(checkRateLimitMock).toHaveBeenCalledTimes(1);
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "server-action:user:vote:post:user-1",
      30,
      60_000
    );
  });

  it("adds an IP bucket when x-real-ip is present", async () => {
    headersMock.mockResolvedValue(new Headers({ "x-real-ip": "1.2.3.4" }));
    checkRateLimitMock.mockResolvedValue({ allowed: true, remaining: 19 });

    const { checkServerActionRateLimit } = await import("./server-action-rate-limit");
    const result = await checkServerActionRateLimit("follow:user", "user-2", 20, 60_000);

    expect(result).toBeNull();
    expect(checkRateLimitMock).toHaveBeenCalledTimes(2);
    expect(checkRateLimitMock).toHaveBeenNthCalledWith(
      1,
      "server-action:user:follow:user:user-2",
      20,
      60_000
    );
    expect(checkRateLimitMock).toHaveBeenNthCalledWith(
      2,
      "server-action:ip:follow:user:1.2.3.4",
      20,
      60_000
    );
  });

  it("adds an IP bucket when x-forwarded-for is present", async () => {
    headersMock.mockResolvedValue(
      new Headers({ "x-forwarded-for": "spoofed, 9.8.7.6" })
    );
    checkRateLimitMock.mockResolvedValue({ allowed: true, remaining: 19 });

    const { checkServerActionRateLimit } = await import("./server-action-rate-limit");
    await checkServerActionRateLimit("follow:hashtag", "user-3", 20, 60_000);

    expect(checkRateLimitMock).toHaveBeenCalledTimes(2);
    expect(checkRateLimitMock).toHaveBeenNthCalledWith(
      2,
      "server-action:ip:follow:hashtag:9.8.7.6",
      20,
      60_000
    );
  });

  it("returns the rate-limit error when the user bucket blocks", async () => {
    headersMock.mockResolvedValue(new Headers());
    checkRateLimitMock.mockResolvedValue({ allowed: false, remaining: 0 });

    const { checkServerActionRateLimit } = await import("./server-action-rate-limit");
    const result = await checkServerActionRateLimit("vote:comment", "user-4", 30, 60_000);

    expect(result).toEqual({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });
  });

  it("returns the rate-limit error when the IP bucket blocks", async () => {
    headersMock.mockResolvedValue(new Headers({ "x-real-ip": "1.2.3.4" }));
    checkRateLimitMock
      .mockResolvedValueOnce({ allowed: true, remaining: 18 })
      .mockResolvedValueOnce({ allowed: false, remaining: 0 });

    const { checkServerActionRateLimit } = await import("./server-action-rate-limit");
    const result = await checkServerActionRateLimit("follow:user", "user-5", 20, 60_000);

    expect(result).toEqual({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });
  });
});
