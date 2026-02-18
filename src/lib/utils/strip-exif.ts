import sharp from "sharp";

/**
 * Strips EXIF metadata (GPS, camera info, etc.) from an image buffer.
 * Returns a clean buffer with no metadata. GIFs are returned as-is.
 */
export async function stripExifMetadata(
  buffer: Buffer,
  mimeType: string
): Promise<Buffer> {
  // sharp doesn't handle GIFs well for metadata stripping, skip them
  if (mimeType === "image/gif") {
    return buffer;
  }

  const image = sharp(buffer);

  // .rotate() reads EXIF orientation, applies it, then strips all EXIF metadata
  const cleaned = await image.rotate().toBuffer();

  return cleaned;
}
