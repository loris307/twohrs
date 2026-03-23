import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
    },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    storage: {
      from: vi.fn(),
    },
  })),
}));

vi.mock("@/lib/utils/time", () => ({
  isAppOpen: () => true,
}));

vi.mock("@/lib/utils/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, remaining: 99 })),
}));

vi.mock("@/lib/utils/strip-exif", () => ({
  stripExifMetadata: vi.fn(),
}));

vi.mock("@/lib/moderation/check-content", () => ({
  checkPostContent: vi.fn(),
}));

vi.mock("@/lib/moderation/strikes", () => ({
  addModerationStrike: vi.fn(),
}));

describe("POST /api/uploads/comment-image", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getUserMock.mockResolvedValue({
      data: {
        user: { id: "user-1" },
      },
    });
  });

  it("rejects non-file form data entries", async () => {
    const { POST } = await import("./route");
    const formData = new FormData();
    formData.append("file", "not-a-file");

    const response = await POST({
      formData: async () => formData,
    } as unknown as Request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Keine Datei hochgeladen" });
  });
});
