import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeStorageObjectPath, matchesLatestTopPostMediaPath } from "@/lib/utils/private-media";
import { isAppOpen } from "@/lib/utils/time";

const AUDIO_CONTENT_TYPE_MAP: Record<string, string> = {
  webm: "audio/webm",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
};

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
  _request: Request,
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

  if (archived || matchesLatestTopPostMediaPath("audio", objectPath, latestLiveTopPost)) {
    // Hall-of-Fame and current landing-page top post: serve publicly with cache
    const { data, error } = await admin.storage.from("audio-posts").download(objectPath);
    if (error || !data) {
      console.error("Media proxy: file not found in storage", objectPath);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const contentType = await resolveAudioContentType(admin, objectPath);
    const buffer = await data.arrayBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Content-Length": String(buffer.byteLength),
      },
    });
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
  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
      "Content-Length": String(buffer.byteLength),
    },
  });
}
