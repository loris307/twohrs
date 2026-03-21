import { beforeEach, describe, expect, it, vi } from "vitest";

const downloadMock = vi.fn();
const adminFromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: adminFromMock,
    storage: {
      from: () => ({
        download: downloadMock,
      }),
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/utils/private-media", () => ({
  normalizeStorageObjectPath: (path: string) => path.replace(/^\/+/, ""),
  getPublicMediaCacheControl: () => "public, max-age=86400",
  matchesLatestTopPostMediaPath: () => false,
}));

vi.mock("@/lib/utils/time", () => ({
  isAppOpen: () => true,
}));

function queueMaybeSingleResults(results: Record<string, Array<{ data: unknown; error?: unknown }>>) {
  adminFromMock.mockImplementation((table: string) => {
    const queue = results[table] ?? [];

    return {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      limit() {
        return this;
      },
      order() {
        return this;
      },
      maybeSingle: vi.fn(async () => queue.shift() ?? { data: null, error: null }),
    };
  });
}

describe("GET /media/audio/[...path]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    queueMaybeSingleResults({
      posts: [{ data: null }],
      top_posts_all_time: [
        { data: { id: "archived-audio" } },
        { data: { audio_mime_type: "audio/mp4" } },
      ],
    });

    downloadMock.mockResolvedValue({
      data: new Blob([Uint8Array.from([0, 1, 2, 3, 4, 5])], { type: "audio/mp4" }),
      error: null,
    });
  });

  it("returns partial content for byte-range requests", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new Request("https://twohrs.com/media/audio/user/test.m4a", {
        headers: { Range: "bytes=0-3" },
      }),
      { params: Promise.resolve({ path: ["user", "test.m4a"] }) }
    );

    expect(response.status).toBe(206);
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    expect(response.headers.get("Content-Range")).toBe("bytes 0-3/6");
    expect(response.headers.get("Content-Length")).toBe("4");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(Uint8Array.from([0, 1, 2, 3]));
  });

  it("returns partial content for open-ended ranges", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new Request("https://twohrs.com/media/audio/user/test.m4a", {
        headers: { Range: "bytes=2-" },
      }),
      { params: Promise.resolve({ path: ["user", "test.m4a"] }) }
    );

    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe("bytes 2-5/6");
    expect(response.headers.get("Content-Length")).toBe("4");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(Uint8Array.from([2, 3, 4, 5]));
  });

  it("returns 416 for unsatisfiable ranges", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new Request("https://twohrs.com/media/audio/user/test.m4a", {
        headers: { Range: "bytes=99-120" },
      }),
      { params: Promise.resolve({ path: ["user", "test.m4a"] }) }
    );

    expect(response.status).toBe(416);
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    expect(response.headers.get("Content-Range")).toBe("bytes */6");
    expect(response.headers.get("Content-Length")).toBe("0");
    expect(await response.text()).toBe("");
  });
});
