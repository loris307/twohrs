/**
 * Shared helpers for private media path validation and URL construction.
 * Used by server actions, API routes, and middleware.
 */

const BUCKET_PREFIX_MAP = {
  memes: "/media/memes",
  "audio-posts": "/media/audio",
} as const;

type MediaBucket = keyof typeof BUCKET_PREFIX_MAP;

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
  const normalized = normalizeStorageObjectPath(path);
  if (!normalized) return false;
  return normalized.startsWith(`${userId}/`);
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
