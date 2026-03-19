/**
 * Server-side magic-byte detection for uploaded audio files.
 * Validates actual file content rather than trusting user-provided MIME type.
 */

/**
 * Detect audio MIME type from file magic bytes.
 * Supports WebM (EBML), OGG, and MP4/M4A containers.
 * Returns null if the file doesn't match any allowed audio type.
 */
export function detectAudioMime(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 12) return null;

  // OGG: starts with "OggS" (0x4F 0x67 0x67 0x53)
  if (
    bytes[0] === 0x4f &&
    bytes[1] === 0x67 &&
    bytes[2] === 0x67 &&
    bytes[3] === 0x53
  ) {
    return "audio/ogg";
  }

  // WebM / EBML: starts with 0x1A 0x45 0xDF 0xA3
  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return "audio/webm";
  }

  // MP4 / M4A: "ftyp" box at offset 4
  if (
    bytes[4] === 0x66 && // f
    bytes[5] === 0x74 && // t
    bytes[6] === 0x79 && // y
    bytes[7] === 0x70 // p
  ) {
    return "audio/mp4";
  }

  return null;
}
