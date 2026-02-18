/**
 * Server-side magic-byte detection for uploaded images.
 * Validates actual file content rather than trusting user-provided MIME type or extension.
 */

const MAGIC_BYTES = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46] },
  // WebP: starts with "RIFF" then 4 bytes of file size, then "WEBP"
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
] as const;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

/**
 * Detect MIME type from file magic bytes.
 * Returns null if the file doesn't match any allowed image type.
 */
export function detectImageMime(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer).slice(0, 12);
  if (bytes.length < 3) return null;

  for (const sig of MAGIC_BYTES) {
    if (sig.bytes.every((b, i) => bytes[i] === b)) {
      // Extra check for WebP: bytes 8-11 must be "WEBP"
      if (sig.mime === "image/webp") {
        if (
          bytes.length >= 12 &&
          bytes[8] === 0x57 && // W
          bytes[9] === 0x45 && // E
          bytes[10] === 0x42 && // B
          bytes[11] === 0x50 // P
        ) {
          return sig.mime;
        }
        continue;
      }
      return sig.mime;
    }
  }

  return null;
}

/**
 * Get file extension from a detected MIME type.
 * Falls back to "jpg" for unknown types (should not happen if detectImageMime returned non-null).
 */
export function getExtensionFromMime(mime: string): string {
  return MIME_TO_EXT[mime] ?? "jpg";
}
