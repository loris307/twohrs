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
    // Get today's date in Berlin timezone
    const berlinDate = new Date().toLocaleDateString("en-CA", {
      timeZone: "Europe/Berlin",
    });

    // Get aggregated leaderboard data
    const { data: posts } = await supabase
      .from("posts")
      .select("user_id, upvote_count, caption");

    if (!posts || posts.length === 0) {
      return NextResponse.json({ message: "No posts to archive" });
    }

    // Aggregate by user
    const userMap = new Map<
      string,
      {
        total_upvotes: number;
        total_posts: number;
        best_post_caption: string | null;
        best_post_upvotes: number;
      }
    >();

    for (const post of posts) {
      const existing = userMap.get(post.user_id);
      if (existing) {
        existing.total_upvotes += post.upvote_count;
        existing.total_posts += 1;
        if (post.upvote_count > existing.best_post_upvotes) {
          existing.best_post_upvotes = post.upvote_count;
          existing.best_post_caption = post.caption;
        }
      } else {
        userMap.set(post.user_id, {
          total_upvotes: post.upvote_count,
          total_posts: 1,
          best_post_caption: post.caption,
          best_post_upvotes: post.upvote_count,
        });
      }
    }

    // Sort by total upvotes and create ranked entries
    const ranked = Array.from(userMap.entries())
      .sort((a, b) => b[1].total_upvotes - a[1].total_upvotes)
      .slice(0, 100);

    const entries = ranked.map(([user_id, data], index) => ({
      date: berlinDate,
      user_id,
      rank: index + 1,
      total_upvotes: data.total_upvotes,
      total_posts: data.total_posts,
      best_post_caption: data.best_post_caption,
      best_post_upvotes: data.best_post_upvotes,
    }));

    // Insert into daily_leaderboard
    const { error: insertError } = await supabase
      .from("daily_leaderboard")
      .upsert(entries, { onConflict: "date,user_id" });

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to archive: " + insertError.message },
        { status: 500 }
      );
    }

    // Update days_won for rank 1
    if (ranked.length > 0) {
      const winnerId = ranked[0][0];
      // Manual increment
      const { data: winner } = await supabase
        .from("profiles")
        .select("days_won")
        .eq("id", winnerId)
        .single();

      if (winner) {
        await supabase
          .from("profiles")
          .update({ days_won: winner.days_won + 1 })
          .eq("id", winnerId);
      }
    }

    // === Archive top post of the day ===
    await archiveTopPost(supabase, berlinDate);

    return NextResponse.json({
      message: `Archived ${entries.length} entries for ${berlinDate}`,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}

const MAX_TOP_POSTS = 20;

async function archiveTopPost(
  supabase: ReturnType<typeof createAdminClient>,
  berlinDate: string
) {
  // Find the #1 post by upvotes today
  const { data: topPost } = await supabase
    .from("posts")
    .select("id, user_id, image_url, image_path, caption, upvote_count")
    .order("upvote_count", { ascending: false })
    .limit(1)
    .single();

  if (!topPost || topPost.upvote_count === 0) return;

  // Get current top posts count
  const { count } = await supabase
    .from("top_posts_all_time")
    .select("*", { count: "exact", head: true });

  const currentCount = count ?? 0;

  // Check if we need to replace the weakest entry
  if (currentCount >= MAX_TOP_POSTS) {
    const { data: weakest } = await supabase
      .from("top_posts_all_time")
      .select("id, upvote_count, image_path")
      .order("upvote_count", { ascending: true })
      .limit(1)
      .single();

    if (weakest && topPost.upvote_count <= weakest.upvote_count) {
      return; // Today's top post isn't strong enough
    }

    // Remove the weakest entry and its image
    if (weakest) {
      if (weakest.image_path) {
        await supabase.storage.from("memes").remove([weakest.image_path]);
      }
      await supabase
        .from("top_posts_all_time")
        .delete()
        .eq("id", weakest.id);
    }
  }

  let permanentUrl: string | null = null;
  let permanentPath: string | null = null;

  // Copy image to permanent location (only if post has an image)
  if (topPost.image_path) {
    const ext = topPost.image_path.split(".").pop() || "jpg";
    permanentPath = `top-posts/${berlinDate}.${ext}`;

    const { error: copyError } = await supabase.storage
      .from("memes")
      .copy(topPost.image_path, permanentPath);

    if (copyError) {
      console.error("Failed to copy top post image:", copyError.message);
      // Continue without image — text-only posts are still valid
    } else {
      permanentUrl = supabase.storage
        .from("memes")
        .getPublicUrl(permanentPath).data.publicUrl;
    }
  }

  // Fetch top 3 comments for this post
  const { data: topComments } = await supabase
    .from("comments")
    .select("text, upvote_count, user_id, profiles!comments_user_id_fkey (username)")
    .eq("post_id", topPost.id)
    .order("upvote_count", { ascending: false })
    .limit(3);

  const topCommentsJson = (topComments ?? []).map((c) => ({
    username: (c.profiles as unknown as { username: string }).username,
    text: c.text,
    upvote_count: c.upvote_count,
  }));

  // Insert into top_posts_all_time
  await supabase.from("top_posts_all_time").upsert(
    {
      date: berlinDate,
      user_id: topPost.user_id,
      image_url: permanentUrl,
      image_path: permanentPath,
      caption: topPost.caption,
      upvote_count: topPost.upvote_count,
      top_comments: topCommentsJson,
    },
    { onConflict: "date" }
  );
}

// Also support GET for Vercel Cron
export async function GET(request: NextRequest) {
  return POST(request);
}
