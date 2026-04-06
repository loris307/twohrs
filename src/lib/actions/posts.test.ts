import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  revalidatePathMock,
  redirectMock,
  createClientMock,
  createAdminClientMock,
  isAppOpenMock,
  checkServerActionRateLimitMock,
  detectImageMimeMock,
  getExtensionFromMimeMock,
  detectAudioMimeMock,
  stripExifMetadataMock,
  checkPostContentMock,
  removeMock,
  uploadMock,
  downloadMock,
  insertMock,
  rpcMock,
  fromMock,
} = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  redirectMock: vi.fn(),
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  isAppOpenMock: vi.fn(() => true),
  checkServerActionRateLimitMock: vi.fn(),
  detectImageMimeMock: vi.fn(),
  getExtensionFromMimeMock: vi.fn(),
  detectAudioMimeMock: vi.fn(),
  stripExifMetadataMock: vi.fn(),
  checkPostContentMock: vi.fn(),
  removeMock: vi.fn(),
  uploadMock: vi.fn(),
  downloadMock: vi.fn(),
  insertMock: vi.fn(),
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
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

vi.mock("@/lib/utils/magic-bytes", () => ({
  detectImageMime: detectImageMimeMock,
  getExtensionFromMime: getExtensionFromMimeMock,
}));

vi.mock("@/lib/utils/audio-magic-bytes", () => ({
  detectAudioMime: detectAudioMimeMock,
}));

vi.mock("@/lib/utils/strip-exif", () => ({
  stripExifMetadata: stripExifMetadataMock,
}));

vi.mock("@/lib/moderation/check-content", () => ({
  checkPostContent: checkPostContentMock,
}));

describe("post action rate limiting", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const stagedImagePath = `${userId}/file.webp`;
  const stagedAudioPath = `${userId}/clip.webm`;

  function buildSupabaseMock() {
    const countGteMock = vi.fn().mockResolvedValue({ count: 0 });
    const countEqMock = vi.fn(() => ({ gte: countGteMock }));
    const postsSelectMock = vi.fn((_columns?: string, options?: { count?: string; head?: boolean }) => {
      if (options?.count === "exact" && options?.head) {
        return { eq: countEqMock };
      }

      return { single: vi.fn().mockResolvedValue({ data: { id: "post-id" }, error: null }) };
    });

    const postsTableMock = {
      select: postsSelectMock,
      insert: insertMock,
    };

    const storageFromMock = vi.fn((_bucket: string) => ({
      remove: removeMock,
      upload: uploadMock,
      download: downloadMock,
    }));

    fromMock.mockImplementation((table: string) => {
      if (table === "posts") {
        return postsTableMock;
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: userId } },
        }),
      },
      from: fromMock,
      storage: { from: storageFromMock },
      rpc: rpcMock,
    });
  }

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    isAppOpenMock.mockReturnValue(true);
    createAdminClientMock.mockReturnValue({
      from: vi.fn(),
    });
    detectImageMimeMock.mockReturnValue("image/webp");
    getExtensionFromMimeMock.mockReturnValue("webp");
    detectAudioMimeMock.mockReturnValue("audio/webm");
    stripExifMetadataMock.mockImplementation(async (buffer: Buffer) => buffer);
    checkPostContentMock.mockResolvedValue({
      allowed: true,
    });
    uploadMock.mockResolvedValue({ error: { message: "upload failed" } });
    downloadMock.mockResolvedValue({
      data: {
        arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
      },
      error: null,
    });
    insertMock.mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { id: "post-id" }, error: null }),
      })),
    });
    rpcMock.mockResolvedValue({ error: null });

    buildSupabaseMock();
  });

  it("returns the rate-limit error and removes the staged image before createPostRecord downloads or inserts", async () => {
    checkServerActionRateLimitMock.mockResolvedValue({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });

    const { createPostRecord } = await import("./posts");
    const result = await createPostRecord(stagedImagePath, "hello");

    expect(result).toEqual({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });
    expect(checkServerActionRateLimitMock).toHaveBeenCalledWith(
      "post:create",
      userId,
      10,
      60_000
    );
    expect(removeMock).toHaveBeenCalledWith([stagedImagePath]);
    expect(downloadMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns the rate-limit error and removes the staged audio before createAudioPostRecord downloads or inserts", async () => {
    checkServerActionRateLimitMock.mockResolvedValue({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });

    const { createAudioPostRecord } = await import("./posts");
    const result = await createAudioPostRecord(stagedAudioPath, "audio/webm", 1_000, "hello");

    expect(result).toEqual({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });
    expect(checkServerActionRateLimitMock).toHaveBeenCalledWith(
      "post:create",
      userId,
      10,
      60_000
    );
    expect(removeMock).toHaveBeenCalledWith([stagedAudioPath]);
    expect(downloadMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns the rate-limit error before createPost reads the file, moderates content, uploads, or inserts", async () => {
    checkServerActionRateLimitMock.mockResolvedValue({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });

    const imageFile = new File([new Uint8Array([1, 2, 3])], "post.webp", {
      type: "image/webp",
    });
    const arrayBufferSpy = vi.spyOn(imageFile, "arrayBuffer");
    const formData = new FormData();
    formData.set("image", imageFile);
    formData.set("caption", "hello");

    const { createPost } = await import("./posts");
    const result = await createPost(formData);

    expect(result).toEqual({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });
    expect(checkServerActionRateLimitMock).toHaveBeenCalledWith(
      "post:create",
      userId,
      10,
      60_000
    );
    expect(arrayBufferSpy).not.toHaveBeenCalled();
    expect(checkPostContentMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
