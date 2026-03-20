import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getRateLimitForPath, API_RATE_LIMITS, DEFAULT_API_RATE_LIMIT } from "./rate-limit";

describe("getRateLimitForPath", () => {
  it("returns configured limit for exact match", () => {
    expect(getRateLimitForPath("/api/og")).toBe(10);
  });

  it("returns configured limit for path prefix", () => {
    expect(getRateLimitForPath("/api/feed/cursor")).toBe(60);
  });

  it("returns default limit for unknown path", () => {
    expect(getRateLimitForPath("/api/unknown")).toBe(DEFAULT_API_RATE_LIMIT);
  });

  it("has expected routes configured", () => {
    const patterns = API_RATE_LIMITS.map((r) => r.pattern);
    expect(patterns).toContain("/api/og");
    expect(patterns).toContain("/api/export");
    expect(patterns).toContain("/api/feed");
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("parses successful RPC response", async () => {
    const { checkRateLimit } = await import("./rate-limit");
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify([{ allowed: true, remaining: 4, retry_after_ms: 0 }]),
        { status: 200 }
      )
    );
    const result = await checkRateLimit("test-key", 5);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("fails open on RPC error", async () => {
    const { checkRateLimit } = await import("./rate-limit");
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("error", { status: 500 })
    );
    const result = await checkRateLimit("test-key", 5);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it("fails open on network error", async () => {
    const { checkRateLimit } = await import("./rate-limit");
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network"));
    const result = await checkRateLimit("test-key", 5);
    expect(result.allowed).toBe(true);
  });

  it("fails open when env vars are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.resetModules();
    const { checkRateLimit } = await import("./rate-limit");
    const result = await checkRateLimit("test-key", 5);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });
});
