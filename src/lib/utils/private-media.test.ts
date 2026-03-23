import { describe, it, expect } from "vitest";
import {
  normalizeStorageObjectPath,
  isOwnedStoragePath,
  buildPrivateMediaUrl,
  getMediaRoutePrefix,
  getPublicMediaCacheControl,
  matchesLatestTopPostMediaPath,
} from "./private-media";

describe("normalizeStorageObjectPath", () => {
  it("strips a single leading slash", () => {
    expect(normalizeStorageObjectPath("/user/file.jpg")).toBe("user/file.jpg");
  });

  it("strips multiple leading slashes", () => {
    expect(normalizeStorageObjectPath("///user/file.jpg")).toBe("user/file.jpg");
  });

  it("returns the path unchanged when no leading slash", () => {
    expect(normalizeStorageObjectPath("user/file.jpg")).toBe("user/file.jpg");
  });

  it("rejects paths containing '..'", () => {
    expect(normalizeStorageObjectPath("user/../etc/passwd")).toBeNull();
  });

  it("rejects paths containing backslashes", () => {
    expect(normalizeStorageObjectPath("user\\file.jpg")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(normalizeStorageObjectPath("")).toBeNull();
  });

  it("rejects string that becomes empty after stripping slashes", () => {
    expect(normalizeStorageObjectPath("///")).toBeNull();
  });
});

describe("isOwnedStoragePath", () => {
  const userId = "abc-123";

  it("returns true when path starts with userId/", () => {
    expect(isOwnedStoragePath("abc-123/photo.jpg", userId)).toBe(true);
  });

  it("returns true for nested paths under userId/", () => {
    expect(isOwnedStoragePath("abc-123/sub/photo.jpg", userId)).toBe(true);
  });

  it("returns false when path belongs to another user", () => {
    expect(isOwnedStoragePath("other-user/photo.jpg", userId)).toBe(false);
  });

  it("returns false when path contains '..'", () => {
    expect(isOwnedStoragePath("abc-123/../other/file.jpg", userId)).toBe(false);
  });

  it("returns false when path contains backslashes", () => {
    expect(isOwnedStoragePath("abc-123\\file.jpg", userId)).toBe(false);
  });

  it("strips leading slashes before checking ownership", () => {
    expect(isOwnedStoragePath("/abc-123/photo.jpg", userId)).toBe(true);
  });

  it("returns false when userId is a prefix but not a directory", () => {
    expect(isOwnedStoragePath("abc-1234/photo.jpg", userId)).toBe(false);
  });
});

describe("comment image ownership helpers", () => {
  const userId = "abc-123";

  it("treats comment images under comments/<userId>/ as owned by the user", async () => {
    const privateMedia = await import("./private-media");
    const isOwnedCommentImagePath = privateMedia.isOwnedCommentImagePath as
      | ((path: string, ownerId: string) => boolean)
      | undefined;

    expect(
      isOwnedCommentImagePath?.(
        "comments/abc-123/photo.jpg",
        userId,
      ),
    ).toBe(true);
  });

  it("rejects comment images that belong to another user", async () => {
    const privateMedia = await import("./private-media");
    const isOwnedCommentImagePath = privateMedia.isOwnedCommentImagePath as
      | ((path: string, ownerId: string) => boolean)
      | undefined;

    expect(
      isOwnedCommentImagePath?.(
        "comments/other-user/photo.jpg",
        userId,
      ),
    ).toBe(false);
  });

  it("returns both post and comment meme folders for user cleanup", async () => {
    const privateMedia = await import("./private-media");
    const getOwnedMemesFolderPrefixes = privateMedia.getOwnedMemesFolderPrefixes as
      | ((ownerId: string) => string[])
      | undefined;

    expect(
      getOwnedMemesFolderPrefixes?.(userId),
    ).toEqual(["abc-123", "comments/abc-123"]);
  });
});

describe("storageListHasExactName", () => {
  it("returns true when one entry matches the exact object name", async () => {
    const privateMedia = await import("./private-media");
    const storageListHasExactName = privateMedia.storageListHasExactName as
      | ((files: Array<{ name: string }> | null | undefined, fileName: string) => boolean)
      | undefined;

    expect(
      storageListHasExactName?.(
        [{ name: "abc.png" }, { name: "def.png" }],
        "abc.png",
      ),
    ).toBe(true);
  });

  it("returns false when only substring matches exist", async () => {
    const privateMedia = await import("./private-media");
    const storageListHasExactName = privateMedia.storageListHasExactName as
      | ((files: Array<{ name: string }> | null | undefined, fileName: string) => boolean)
      | undefined;

    expect(
      storageListHasExactName?.(
        [{ name: "prefix-abc.png" }, { name: "abc.png.extra" }],
        "abc.png",
      ),
    ).toBe(false);
  });

  it("returns false for missing or empty results", async () => {
    const privateMedia = await import("./private-media");
    const storageListHasExactName = privateMedia.storageListHasExactName as
      | ((files: Array<{ name: string }> | null | undefined, fileName: string) => boolean)
      | undefined;

    expect(storageListHasExactName?.(undefined, "abc.png")).toBe(false);
    expect(storageListHasExactName?.([], "abc.png")).toBe(false);
  });
});

describe("getMediaRoutePrefix", () => {
  it("maps 'memes' to /media/memes", () => {
    expect(getMediaRoutePrefix("memes")).toBe("/media/memes");
  });

  it("maps 'audio-posts' to /media/audio", () => {
    expect(getMediaRoutePrefix("audio-posts")).toBe("/media/audio");
  });
});

describe("buildPrivateMediaUrl", () => {
  it("builds URL for memes bucket", () => {
    expect(buildPrivateMediaUrl("memes", "user/file.jpg")).toBe(
      "/media/memes/user/file.jpg",
    );
  });

  it("builds URL for audio-posts bucket", () => {
    expect(buildPrivateMediaUrl("audio-posts", "user/file.webm")).toBe(
      "/media/audio/user/file.webm",
    );
  });

  it("strips leading slashes from the path", () => {
    expect(buildPrivateMediaUrl("memes", "/user/file.jpg")).toBe(
      "/media/memes/user/file.jpg",
    );
  });

  it("throws on path with traversal", () => {
    expect(() => buildPrivateMediaUrl("memes", "user/../etc/passwd")).toThrow();
  });

  it("throws on path with backslashes", () => {
    expect(() => buildPrivateMediaUrl("memes", "user\\file.jpg")).toThrow();
  });

  it("throws on empty path", () => {
    expect(() => buildPrivateMediaUrl("memes", "")).toThrow();
  });
});

describe("getPublicMediaCacheControl", () => {
  it("uses a long cache for archived hall-of-fame media", () => {
    expect(getPublicMediaCacheControl(true)).toBe("public, max-age=86400");
  });

  it("uses short revalidation for the current live top post media", () => {
    expect(getPublicMediaCacheControl(false)).toBe(
      "public, max-age=0, s-maxage=60, must-revalidate",
    );
  });
});

describe("matchesLatestTopPostMediaPath", () => {
  it("matches the latest live top post image path when it has upvotes", () => {
    expect(
      matchesLatestTopPostMediaPath("image", "user/top-post.png", {
        upvote_count: 42,
        image_path: "user/top-post.png",
        audio_path: null,
      }),
    ).toBe(true);
  });

  it("matches the latest live top post audio path when it has upvotes", () => {
    expect(
      matchesLatestTopPostMediaPath("audio", "user/top-post.webm", {
        upvote_count: 42,
        image_path: null,
        audio_path: "user/top-post.webm",
      }),
    ).toBe(true);
  });

  it("normalizes a leading slash on the stored path", () => {
    expect(
      matchesLatestTopPostMediaPath("image", "user/top-post.png", {
        upvote_count: 42,
        image_path: "/user/top-post.png",
        audio_path: null,
      }),
    ).toBe(true);
  });

  it("returns false when the latest live top post has no upvotes", () => {
    expect(
      matchesLatestTopPostMediaPath("image", "user/top-post.png", {
        upvote_count: 0,
        image_path: "user/top-post.png",
        audio_path: null,
      }),
    ).toBe(false);
  });

  it("returns false when the path does not match the latest live top post", () => {
    expect(
      matchesLatestTopPostMediaPath("image", "user/not-top-post.png", {
        upvote_count: 42,
        image_path: "user/top-post.png",
        audio_path: null,
      }),
    ).toBe(false);
  });

  it("returns false when there is no latest live top post", () => {
    expect(matchesLatestTopPostMediaPath("image", "user/top-post.png", null)).toBe(false);
  });
});
