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

// Also support GET for Vercel Cron
export async function GET(request: NextRequest) {
  return POST(request);
}
