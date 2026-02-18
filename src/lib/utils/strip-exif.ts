import sharp from "sharp";

/**
 * Strips EXIF metadata (GPS, camera info, etc.) from an image buffer.
 * Returns a clean buffer with no metadata.
 */
export async function stripExifMetadata(
  buffer: Buffer,
  mimeType: string
): Promise<Buffer> {
  // Strip XMP/metadata from GIFs while preserving animation frames
  if (mimeType === "image/gif") {
    return await sharp(buffer, { animated: true }).gif().toBuffer();
  }

  const image = sharp(buffer);

  // .rotate() reads EXIF orientation, applies it, then strips all EXIF metadata
  const cleaned = await image.rotate().toBuffer();

  return cleaned;
}
