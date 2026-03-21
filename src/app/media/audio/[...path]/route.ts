import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeStorageObjectPath,
  getPublicMediaCacheControl,
  matchesLatestTopPostMediaPath,
} from "@/lib/utils/private-media";
import { isAppOpen } from "@/lib/utils/time";

const AUDIO_CONTENT_TYPE_MAP: Record<string, string> = {
  webm: "audio/webm",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
};

type ByteRangeResolution =
  | { kind: "full" }
  | { kind: "partial"; start: number; end: number }
  | { kind: "invalid" };

function resolveByteRange(rangeHeader: string | null, size: number): ByteRangeResolution {
  if (!rangeHeader) {
    return { kind: "full" };
  }

  if (size <= 0 || !rangeHeader.startsWith("bytes=")) {
    return { kind: "invalid" };
  }

  const rangeSpec = rangeHeader.slice("bytes=".length).trim();
  if (!rangeSpec || rangeSpec.includes(",")) {
    return { kind: "invalid" };
  }

  const [startStr, endStr] = rangeSpec.split("-", 2);
  if (!startStr && !endStr) {
    return { kind: "invalid" };
  }

  if (!startStr) {
    const suffixLength = Number(endStr);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
      return { kind: "invalid" };
    }

    return {
      kind: "partial",
      start: Math.max(size - suffixLength, 0),
      end: size - 1,
    };
  }

  const start = Number(startStr);
  if (!Number.isInteger(start) || start < 0 || start >= size) {
    return { kind: "invalid" };
  }

  if (!endStr) {
    return { kind: "partial", start, end: size - 1 };
  }

  const parsedEnd = Number(endStr);
  if (!Number.isInteger(parsedEnd) || parsedEnd < start) {
    return { kind: "invalid" };
  }

  return {
    kind: "partial",
    start,
    end: Math.min(parsedEnd, size - 1),
  };
}

function buildAudioResponse(
  buffer: ArrayBuffer,
  contentType: string,
  cacheControl: string,
  rangeHeader: string | null,
): Response {
  const totalSize = buffer.byteLength;
  const range = resolveByteRange(rangeHeader, totalSize);
  const baseHeaders = {
    "Accept-Ranges": "bytes",
    "Cache-Control": cacheControl,
    "Content-Type": contentType,
  };

  if (range.kind === "invalid") {
    return new Response(null, {
      status: 416,
      headers: {
        ...baseHeaders,
        "Content-Length": "0",
        "Content-Range": `bytes */${totalSize}`,
      },
    });
  }

  if (range.kind === "partial") {
    const partialBuffer = buffer.slice(range.start, range.end + 1);
    return new Response(partialBuffer, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Length": String(partialBuffer.byteLength),
        "Content-Range": `bytes ${range.start}-${range.end}/${totalSize}`,
      },
    });
  }

  return new Response(buffer, {
    headers: {
      ...baseHeaders,
      "Content-Length": String(totalSize),
    },
  });
}

async function resolveAudioContentType(
  admin: ReturnType<typeof createAdminClient>,
  objectPath: string,
): Promise<string> {
  // Try posts table first (daily content)
  const { data: post } = await admin
    .from("posts")
    .select("audio_mime_type")
    .eq("audio_path", objectPath)
    .limit(1)
    .maybeSingle();
  if (post?.audio_mime_type) return post.audio_mime_type;

  // Try Hall-of-Fame
  const { data: archived } = await admin
    .from("top_posts_all_time")
    .select("audio_mime_type")
    .eq("audio_path", objectPath)
    .limit(1)
    .maybeSingle();
  if (archived?.audio_mime_type) return archived.audio_mime_type;

  // Fallback to extension
  const ext = objectPath.split(".").pop()?.toLowerCase() ?? "";
  return AUDIO_CONTENT_TYPE_MAP[ext] || "application/octet-stream";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const objectPath = normalizeStorageObjectPath(segments.join("/"));
  if (!objectPath) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check if this is archived Hall-of-Fame media (public access allowed)
  const { data: archived } = await admin
    .from("top_posts_all_time")
    .select("id")
    .eq("audio_path", objectPath)
    .limit(1)
    .maybeSingle();

  const { data: latestLiveTopPost } = archived
    ? { data: null }
    : await admin
        .from("posts")
        .select("upvote_count, image_path, audio_path")
        .order("upvote_count", { ascending: false })
        .limit(1)
        .maybeSingle();

  const isLiveTopPostAudio = matchesLatestTopPostMediaPath("audio", objectPath, latestLiveTopPost);

  if (archived || isLiveTopPostAudio) {
    // Hall-of-Fame keeps a long cache; live top-post access must expire quickly.
    const { data, error } = await admin.storage.from("audio-posts").download(objectPath);
    if (error || !data) {
      console.error("Media proxy: file not found in storage", objectPath);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const contentType = await resolveAudioContentType(admin, objectPath);
    const buffer = await data.arrayBuffer();
    return buildAudioResponse(
      buffer,
      contentType,
      getPublicMediaCacheControl(!!archived),
      request.headers.get("range"),
    );
  }

  // Non-archived daily media: require auth + time gate
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  if (!isAppOpen()) {
    return NextResponse.json({ error: "App ist geschlossen" }, { status: 403 });
  }

  // Verify the path is referenced by an actual post (prevents guessing arbitrary storage keys)
  const { data: post } = await admin
    .from("posts")
    .select("id, audio_mime_type")
    .eq("audio_path", objectPath)
    .limit(1)
    .maybeSingle();

  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await admin.storage.from("audio-posts").download(objectPath);
  if (error || !data) {
    console.error("Media proxy: file not found in storage", objectPath);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Use mime type from the post query when available, fall back to resolver
  const contentType = post.audio_mime_type || await resolveAudioContentType(admin, objectPath);
  const buffer = await data.arrayBuffer();
  return buildAudioResponse(
    buffer,
    contentType,
    "private, no-store",
    request.headers.get("range"),
  );
}
