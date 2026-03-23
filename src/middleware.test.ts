import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { checkRateLimitMock, updateSessionMock } = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
  updateSessionMock: vi.fn(),
}));

vi.mock("@/lib/utils/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/utils/rate-limit")>("@/lib/utils/rate-limit");
  return {
    ...actual,
    checkRateLimit: checkRateLimitMock,
  };
});

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: updateSessionMock,
}));

describe("page rate limiting", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 429 for / when rate limit is exceeded, before updateSession runs", async () => {
    checkRateLimitMock.mockResolvedValue({ allowed: false, remaining: 0 });

    const { middleware } = await import("./middleware");
    const req = new NextRequest("https://twohrs.com/", {
      headers: { "x-real-ip": "1.2.3.4" },
    });
    const response = await middleware(req);

    expect(response.status).toBe(429);
    expect(checkRateLimitMock).toHaveBeenCalledTimes(1);
    expect(updateSessionMock).not.toHaveBeenCalled();
  });

  it("proceeds to updateSession for / when rate limit allows", async () => {
    checkRateLimitMock.mockResolvedValue({ allowed: true, remaining: 19 });
    updateSessionMock.mockResolvedValue({
      user: null,
      supabase: { from: vi.fn() },
      supabaseResponse: NextResponse.next(),
    });

    const { middleware } = await import("./middleware");
    const req = new NextRequest("https://twohrs.com/", {
      headers: { "x-real-ip": "1.2.3.4" },
    });
    await middleware(req);

    expect(checkRateLimitMock).toHaveBeenCalledTimes(1);
    expect(updateSessionMock).toHaveBeenCalledTimes(1);
  });

  it("skips page rate limiting for non-rate-limited routes", async () => {
    updateSessionMock.mockResolvedValue({
      user: null,
      supabase: { from: vi.fn() },
      supabaseResponse: NextResponse.next(),
    });

    const { middleware } = await import("./middleware");
    const req = new NextRequest("https://twohrs.com/about", {
      headers: { "x-real-ip": "1.2.3.4" },
    });
    await middleware(req);

    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(updateSessionMock).toHaveBeenCalledTimes(1);
  });

  it("returns 429 for / when no IP headers are present", async () => {
    const { middleware } = await import("./middleware");
    const req = new NextRequest("https://twohrs.com/");
    const response = await middleware(req);

    expect(response.status).toBe(429);
    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(updateSessionMock).not.toHaveBeenCalled();
  });
});
