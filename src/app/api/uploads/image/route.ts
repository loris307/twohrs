import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { detectImageMime, getExtensionFromMime } from "@/lib/utils/magic-bytes";
import { stripExifMetadata } from "@/lib/utils/strip-exif";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Keine Datei hochgeladen" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const detectedMime = detectImageMime(arrayBuffer);

  if (!detectedMime) {
    return NextResponse.json(
      { error: "Ungültiger Dateityp. Nur JPEG, PNG, GIF und WebP erlaubt." },
      { status: 400 },
    );
  }

  let cleanBuffer: Buffer;
  try {
    cleanBuffer = await stripExifMetadata(Buffer.from(arrayBuffer), detectedMime);
  } catch {
    return NextResponse.json(
      { error: "Bildverarbeitung fehlgeschlagen. Bitte versuche es erneut." },
      { status: 500 },
    );
  }

  const ext = getExtensionFromMime(detectedMime);
  const fileName = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("memes")
    .upload(fileName, cleanBuffer, {
      cacheControl: "3600",
      upsert: false,
      contentType: detectedMime,
    });

  if (uploadError) {
    console.error("Image upload failed:", uploadError.message);
    return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 });
  }

  return NextResponse.json({ imagePath: fileName });
}
