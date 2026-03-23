import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAppOpen } from "@/lib/utils/time";
import { checkRateLimit, getRateLimitClientIp } from "@/lib/utils/rate-limit";
import { MAX_IMAGE_SIZE_BYTES } from "@/lib/constants";
import {
  detectImageMime,
  getExtensionFromMime,
} from "@/lib/utils/magic-bytes";
import { stripExifMetadata } from "@/lib/utils/strip-exif";
import { checkPostContent } from "@/lib/moderation/check-content";
import { addModerationStrike } from "@/lib/moderation/strikes";

export async function POST(request: Request) {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Nicht eingeloggt" },
      { status: 401 },
    );
  }

  // 2. Time-gate check
  if (!isAppOpen()) {
    return NextResponse.json(
      { error: "Die App ist gerade geschlossen." },
      { status: 403 },
    );
  }

  // 3. Rate-limit check
  const ip = getRateLimitClientIp(request);
  if (ip) {
    const rateLimit = await checkRateLimit(`comment-image:${ip}`, 100, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte warte kurz." },
        { status: 429 },
      );
    }
  }

  // 4. Read file from FormData
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json(
      { error: "Keine Datei hochgeladen" },
      { status: 400 },
    );
  }

  // 5. Size check
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Datei ist zu groß. Maximal 5 MB erlaubt." },
      { status: 400 },
    );
  }

  // 6. Magic-byte validation
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const detectedMime = detectImageMime(arrayBuffer);
  if (!detectedMime) {
    return NextResponse.json(
      { error: "Ungültiger Dateityp. Nur JPEG, PNG, GIF und WebP erlaubt." },
      { status: 400 },
    );
  }

  // 7. EXIF stripping
  let cleanBuffer: Buffer;
  try {
    cleanBuffer = await stripExifMetadata(buffer, detectedMime);
  } catch {
    return NextResponse.json(
      { error: "Bildverarbeitung fehlgeschlagen." },
      { status: 500 },
    );
  }

  // 8. NSFW check
  const contentCheck = await checkPostContent(cleanBuffer, null);

  // 9. Handle NSFW violation
  if (!contentCheck.allowed) {
    if (contentCheck.type !== "image_check_failed") {
      const { accountDeleted } = await addModerationStrike(user.id, {
        column: "nsfw_strikes",
      });
      if (accountDeleted) {
        return NextResponse.json(
          { error: "Dein Account wurde gesperrt." },
          { status: 403 },
        );
      }
    }

    return NextResponse.json(
      {
        error:
          contentCheck.type === "image_check_failed"
            ? "Bild konnte nicht überprüft werden. Bitte versuche es erneut."
            : "Dieses Bild verstößt gegen unsere Richtlinien.",
      },
      { status: 400 },
    );
  }

  // 10. Upload to storage
  const ext = getExtensionFromMime(detectedMime);
  const imagePath = `comments/${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("memes")
    .upload(imagePath, cleanBuffer, {
      cacheControl: "3600",
      upsert: false,
      contentType: detectedMime,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Upload fehlgeschlagen" },
      { status: 500 },
    );
  }

  // 11. Return image path
  return NextResponse.json({ imagePath });
}
