import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { detectAudioMime } from "@/lib/utils/audio-magic-bytes";
import { MAX_AUDIO_SIZE_BYTES } from "@/lib/constants";

const MIME_TO_EXTENSION: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
};

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
  const detectedMime = detectAudioMime(arrayBuffer);

  if (!detectedMime) {
    return NextResponse.json(
      { error: "Ungültiges Audio-Format. Nur WebM, OGG und MP4 erlaubt." },
      { status: 400 },
    );
  }

  if (arrayBuffer.byteLength > MAX_AUDIO_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Audio-Datei ist zu groß" },
      { status: 400 },
    );
  }

  const ext = MIME_TO_EXTENSION[detectedMime] ?? "webm";
  const fileName = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("audio-posts")
    .upload(fileName, Buffer.from(arrayBuffer), {
      cacheControl: "3600",
      upsert: false,
      contentType: detectedMime,
    });

  if (uploadError) {
    console.error("Audio upload failed:", uploadError.message);
    return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 });
  }

  return NextResponse.json({ audioPath: fileName, audioMimeType: detectedMime });
}
