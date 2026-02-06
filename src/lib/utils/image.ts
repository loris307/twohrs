import imageCompression from "browser-image-compression";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from "@/lib/constants";

export function validateImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return "Nur JPEG, PNG, GIF und WebP erlaubt";
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "Bild darf maximal 5 MB groß sein";
  }
  return null;
}

export async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif") {
    return file;
  }

  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: file.type as string,
  };

  const compressed = await imageCompression(file, options);
  return new File([compressed], file.name, { type: file.type });
}

export function getImageExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
  };
  return map[mimeType] || "jpg";
}
