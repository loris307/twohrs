import { createClient } from "@/lib/supabase/server";
import { FEED_PAGE_SIZE, HOT_MIN_UPVOTES } from "@/lib/constants";
import type { FeedTab } from "@/lib/constants";
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

export async function getFeedFollowing(cursor?: string): Promise<FeedPage> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { posts: [], nextCursor: null };
  }

  const { data: followRows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  const followingIds = (followRows || []).map((f) => f.following_id);

  if (followingIds.length === 0) {
    return { posts: [], nextCursor: null };
  }

  let query = supabase
    .from("posts")
    .select(
      `
      *,
      profiles!posts_user_id_fkey (username, display_name, avatar_url)
    `
    )
    .in("user_id", followingIds)
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: posts, error } = await query;

  if (error || !posts) {
    return { posts: [], nextCursor: null };
  }

  let votedPostIds: Set<string> = new Set();
  if (posts.length > 0) {
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

export async function getFeedHot(cursor?: string): Promise<FeedPage> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Read threshold from app_config, fallback to constant
  const { data: config } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "hot_min_upvotes")
    .single();

  const minUpvotes =
    config?.value && typeof config.value === "number"
      ? config.value
      : HOT_MIN_UPVOTES;

  let query = supabase
    .from("posts")
    .select(
      `
      *,
      profiles!posts_user_id_fkey (username, display_name, avatar_url)
    `
    )
    .gte("upvote_count", minUpvotes)
    .order("upvote_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE + 1);

  if (cursor) {
    const [upStr, caStr] = cursor.split("|");
    const parsedUpvotes = parseInt(upStr, 10);
    const parsedCreatedAt = caStr;
    query = query.or(
      `upvote_count.lt.${parsedUpvotes},and(upvote_count.eq.${parsedUpvotes},created_at.lt.${parsedCreatedAt})`
    );
  }

  const { data: posts, error } = await query;

  if (error || !posts) {
    return { posts: [], nextCursor: null };
  }

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

  const lastPost = feedPosts[feedPosts.length - 1];
  return {
    posts: postsWithVoteStatus,
    nextCursor: hasMore
      ? `${lastPost.upvote_count}|${lastPost.created_at}`
      : null,
  };
}

export async function getFeedByTab(
  tab: FeedTab,
  cursor?: string
): Promise<FeedPage> {
  switch (tab) {
    case "following":
      return getFeedFollowing(cursor);
    case "hot":
      return getFeedHot(cursor);
    case "live":
    default:
      return getFeed(cursor);
  }
}
