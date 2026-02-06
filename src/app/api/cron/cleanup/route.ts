import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // 1. Delete all votes
    const { error: votesError } = await supabase
      .from("votes")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (votesError) {
      console.error("Failed to delete votes:", votesError);
    }

    // 2. Delete all posts
    const { error: postsError } = await supabase
      .from("posts")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (postsError) {
      console.error("Failed to delete posts:", postsError);
    }

    // 3. Clean up storage - list and delete all files in memes bucket
    const { data: files } = await supabase.storage
      .from("memes")
      .list("", { limit: 1000 });

    if (files && files.length > 0) {
      // List files in each user folder
      for (const folder of files) {
        if (folder.id) continue; // skip files at root level

        const { data: userFiles } = await supabase.storage
          .from("memes")
          .list(folder.name, { limit: 1000 });

        if (userFiles && userFiles.length > 0) {
          const filePaths = userFiles.map(
            (f) => `${folder.name}/${f.name}`
          );
          await supabase.storage.from("memes").remove(filePaths);
        }
      }
    }

    return NextResponse.json({
      message: "Cleanup completed",
      deletedVotes: !votesError,
      deletedPosts: !postsError,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}

// Also support GET for Vercel Cron
export async function GET(request: NextRequest) {
  return POST(request);
}
