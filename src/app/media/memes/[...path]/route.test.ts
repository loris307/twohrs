import { beforeEach, describe, expect, it, vi } from "vitest";

const downloadMock = vi.fn();
const adminFromMock = vi.fn();
const getUserMock = vi.fn();

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
  createClient: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
    },
  })),
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

describe("GET /media/memes/[...path]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getUserMock.mockResolvedValue({
      data: {
        user: { id: "viewer-1" },
      },
    });

    downloadMock.mockResolvedValue({
      data: new Blob([Uint8Array.from([1, 2, 3, 4])], { type: "image/png" }),
      error: null,
    });
  });

  it("returns 404 for soft-deleted comment images", async () => {
    queueMaybeSingleResults({
      top_posts_all_time: [{ data: null }],
      posts: [{ data: null }],
      comments: [{ data: { id: "comment-1", deleted_at: "2026-03-23T10:00:00.000Z" } }],
    });

    const { GET } = await import("./route");

    const response = await GET(
      new Request("https://twohrs.com/media/memes/comments/author-1/test.png"),
      { params: Promise.resolve({ path: ["comments", "author-1", "test.png"] }) },
    );

    expect(response.status).toBe(404);
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it("serves active comment images to authenticated users while the app is open", async () => {
    queueMaybeSingleResults({
      top_posts_all_time: [{ data: null }],
      posts: [{ data: null }],
      comments: [{ data: { id: "comment-1", deleted_at: null } }],
    });

    const { GET } = await import("./route");

    const response = await GET(
      new Request("https://twohrs.com/media/memes/comments/author-1/test.png"),
      { params: Promise.resolve({ path: ["comments", "author-1", "test.png"] }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(Uint8Array.from([1, 2, 3, 4]));
  });
});
