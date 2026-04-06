import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  revalidatePathMock,
  createClientMock,
  checkRateLimitMock,
  detectImageMimeMock,
  getExtensionFromMimeMock,
  stripExifMetadataMock,
  classifyImageMock,
  fromMock,
  profileUpdateMock,
  listMock,
  removeMock,
  uploadMock,
} = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  createClientMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  detectImageMimeMock: vi.fn(),
  getExtensionFromMimeMock: vi.fn(),
  stripExifMetadataMock: vi.fn(),
  classifyImageMock: vi.fn(),
  fromMock: vi.fn(),
  profileUpdateMock: vi.fn(),
  listMock: vi.fn(),
  removeMock: vi.fn(),
  uploadMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/utils/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/utils/magic-bytes", () => ({
  detectImageMime: detectImageMimeMock,
  getExtensionFromMime: getExtensionFromMimeMock,
}));

vi.mock("@/lib/utils/strip-exif", () => ({
  stripExifMetadata: stripExifMetadataMock,
}));

vi.mock("@/lib/moderation/nsfw", () => ({
  classifyImage: classifyImageMock,
}));

describe("profile action rate limiting", () => {
  const userId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    fromMock.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          update: profileUpdateMock,
        };
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
      storage: {
        from: vi.fn(() => ({
          list: listMock,
          remove: removeMock,
          upload: uploadMock,
        })),
      },
    });

    profileUpdateMock.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    detectImageMimeMock.mockReturnValue("image/webp");
    getExtensionFromMimeMock.mockReturnValue("webp");
    stripExifMetadataMock.mockImplementation(async (buffer: Buffer) => buffer);
    classifyImageMock.mockResolvedValue({ isNsfw: false });
    listMock.mockResolvedValue({ data: [], error: null });
    uploadMock.mockResolvedValue({ error: { message: "upload failed" } });
  });

  it("returns early when updateProfile hits the user-scoped profile bucket", async () => {
    checkRateLimitMock.mockResolvedValue({ allowed: false, remaining: 0 });

    const formData = new FormData();
    formData.set("displayName", "loris");
    formData.set("bio", "hello");

    const { updateProfile } = await import("./profile");
    const result = await updateProfile(formData);

    expect(result).toEqual({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "profile:update:11111111-1111-4111-8111-111111111111",
      10,
      60_000
    );
    expect(fromMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns early when updateAvatar hits the user-scoped avatar bucket", async () => {
    checkRateLimitMock.mockResolvedValue({ allowed: false, remaining: 0 });

    const avatarFile = new File([new Uint8Array([1, 2, 3])], "avatar.webp", {
      type: "image/webp",
    });
    const arrayBufferSpy = vi.spyOn(avatarFile, "arrayBuffer");
    const formData = new FormData();
    formData.set("avatar", avatarFile);

    const { updateAvatar } = await import("./profile");
    const result = await updateAvatar(formData);

    expect(result).toEqual({
      success: false,
      error: "Zu viele Anfragen. Bitte warte kurz.",
    });
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "profile:avatar:11111111-1111-4111-8111-111111111111",
      5,
      600_000
    );
    expect(listMock).not.toHaveBeenCalled();
    expect(profileUpdateMock).not.toHaveBeenCalled();
    expect(arrayBufferSpy).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
