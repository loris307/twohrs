import { createClient } from "@/lib/supabase/server";
import { FEED_PAGE_SIZE } from "@/lib/constants";
import type { PostWithAuthor, FeedPage } from "@/lib/types";

export async function getFeed(cursor?: string): Promise<FeedPage> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("posts")
    .select(
      `
      *,
      profiles!posts_user_id_fkey (username, display_name, avatar_url)
    `
    )
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: posts, error } = await query;

  if (error || !posts) {
    return { posts: [], nextCursor: null };
  }

  // Check which posts the current user has voted on
  let votedPostIds: Set<string> = new Set();
  if (user && posts.length > 0) {
    const postIds = posts.map((p) => p.id);
    const { data: votes } = await supabase
      .from("votes")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", postIds);

    if (votes) {
      votedPostIds = new Set(votes.map((v) => v.post_id));
    }
  }

  const hasMore = posts.length > FEED_PAGE_SIZE;
  const feedPosts = hasMore ? posts.slice(0, FEED_PAGE_SIZE) : posts;

  const postsWithVoteStatus: PostWithAuthor[] = feedPosts.map((post) => ({
    ...post,
    profiles: post.profiles as unknown as PostWithAuthor["profiles"],
    has_voted: votedPostIds.has(post.id),
  }));

  return {
    posts: postsWithVoteStatus,
    nextCursor: hasMore
      ? feedPosts[feedPosts.length - 1].created_at
      : null,
  };
}

export async function getPostsByUser(userId: string): Promise<PostWithAuthor[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: posts } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles!posts_user_id_fkey (username, display_name, avatar_url)
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!posts) return [];

  let votedPostIds: Set<string> = new Set();
  if (user && posts.length > 0) {
    const postIds = posts.map((p) => p.id);
    const { data: votes } = await supabase
      .from("votes")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", postIds);

    if (votes) {
      votedPostIds = new Set(votes.map((v) => v.post_id));
    }
  }

  return posts.map((post) => ({
    ...post,
    profiles: post.profiles as unknown as PostWithAuthor["profiles"],
    has_voted: votedPostIds.has(post.id),
  }));
}
