import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeStorageObjectPath, matchesLatestTopPostMediaPath } from "@/lib/utils/private-media";
import { isAppOpen } from "@/lib/utils/time";

const CONTENT_TYPE_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

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
    .eq("image_path", objectPath)
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

  if (archived || matchesLatestTopPostMediaPath("image", objectPath, latestLiveTopPost)) {
    // Hall-of-Fame and current landing-page top post: serve publicly with cache
    const { data, error } = await admin.storage.from("memes").download(objectPath);
    if (error || !data) {
      console.error("Media proxy: file not found in storage", objectPath);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const ext = objectPath.split(".").pop()?.toLowerCase() ?? "";
    const contentType = CONTENT_TYPE_MAP[ext] || "application/octet-stream";
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
    .select("id")
    .eq("image_path", objectPath)
    .limit(1)
    .maybeSingle();

  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await admin.storage.from("memes").download(objectPath);
  if (error || !data) {
    console.error("Media proxy: file not found in storage", objectPath);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = objectPath.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPE_MAP[ext] || "application/octet-stream";
  const buffer = await data.arrayBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
      "Content-Length": String(buffer.byteLength),
    },
  });
}
