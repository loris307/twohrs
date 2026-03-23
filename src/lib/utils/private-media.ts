/**
 * Shared helpers for private media path validation and URL construction.
 * Used by server actions, API routes, and middleware.
 */

const BUCKET_PREFIX_MAP = {
  memes: "/media/memes",
  "audio-posts": "/media/audio",
} as const;

type MediaBucket = keyof typeof BUCKET_PREFIX_MAP;
type MediaKind = "image" | "audio";

type LatestTopPostMediaCandidate = {
  upvote_count: number;
  image_path: string | null;
  audio_path: string | null;
};

const ARCHIVED_PUBLIC_MEDIA_CACHE_CONTROL = "public, max-age=86400";
const LIVE_TOP_POST_PUBLIC_MEDIA_CACHE_CONTROL = "public, max-age=0, s-maxage=60, must-revalidate";

function isPathUnderPrefix(path: string, prefix: string): boolean {
  const normalized = normalizeStorageObjectPath(path);
  if (!normalized) return false;
  return normalized.startsWith(`${prefix}/`);
}

/**
 * Strip leading slashes and reject traversal patterns.
 * Returns the normalized path, or `null` if the path is invalid.
 */
export function normalizeStorageObjectPath(path: string): string | null {
  const normalized = path.replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || normalized.includes("\\")) {
    return null;
  }
  return normalized;
}

/**
 * Check whether `path` belongs to `userId` (i.e. starts with `<userId>/`).
 * Leading slashes are stripped before the check.
 */
export function isOwnedStoragePath(path: string, userId: string): boolean {
  return isPathUnderPrefix(path, userId);
}

/**
 * Check whether `path` belongs to a user's comment-image folder
 * (i.e. starts with `comments/<userId>/`).
 */
export function isOwnedCommentImagePath(path: string, userId: string): boolean {
  return isPathUnderPrefix(path, `comments/${userId}`);
}

/**
 * List all memes-bucket folders that contain user-owned media requiring
 * immediate cleanup on account deletion.
 */
export function getOwnedMemesFolderPrefixes(userId: string): string[] {
  return [userId, `comments/${userId}`];
}

/**
 * Check whether a storage listing contains an exact object-name match.
 * Supabase `search` can return substring matches, so callers still need this
 * final equality check before trusting the result.
 */
export function storageListHasExactName(
  files: Array<{ name: string }> | null | undefined,
  fileName: string,
): boolean {
  return Array.isArray(files) && files.some((file) => file.name === fileName);
}

/**
 * Return the same-origin route prefix for a given storage bucket.
 */
export function getMediaRoutePrefix(
  bucket: MediaBucket,
): "/media/memes" | "/media/audio" {
  return BUCKET_PREFIX_MAP[bucket];
}

/**
 * Build a same-origin URL path for a private media object.
 * Throws if the path fails normalization.
 */
export function buildPrivateMediaUrl(
  bucket: MediaBucket,
  path: string,
): string {
  const normalized = normalizeStorageObjectPath(path);
  if (!normalized) {
    throw new Error(`Invalid storage object path: ${path}`);
  }
  return `${BUCKET_PREFIX_MAP[bucket]}/${normalized}`;
}

/**
 * Return the cache policy for publicly served media.
 * Archived Hall-of-Fame assets can be cached for a long time; the current live
 * top post must revalidate quickly so public access expires promptly.
 */
export function getPublicMediaCacheControl(isArchived: boolean): string {
  return isArchived
    ? ARCHIVED_PUBLIC_MEDIA_CACHE_CONTROL
    : LIVE_TOP_POST_PUBLIC_MEDIA_CACHE_CONTROL;
}

/**
 * Check whether a media path belongs to the latest live top post currently
 * shown on the landing page. This is the only non-archived post media that
 * anonymous users may fetch publicly.
 */
export function matchesLatestTopPostMediaPath(
  mediaKind: MediaKind,
  objectPath: string,
  latestTopPost: LatestTopPostMediaCandidate | null,
): boolean {
  if (!latestTopPost || latestTopPost.upvote_count <= 0) {
    return false;
  }

  const candidatePath = mediaKind === "image"
    ? latestTopPost.image_path
    : latestTopPost.audio_path;
  if (!candidatePath) {
    return false;
  }

  return normalizeStorageObjectPath(candidatePath) === objectPath;
}
