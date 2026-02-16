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

  // Check which posts the current user has voted on + who they follow
  let votedPostIds: Set<string> = new Set();
  let followedUserIds: Set<string> = new Set();
  if (user && posts.length > 0) {
    const postIds = posts.map((p) => p.id);
    const authorIds = [...new Set(posts.map((p) => p.user_id))];

    const [{ data: votes }, { data: follows }] = await Promise.all([
      supabase
        .from("votes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds),
      supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .in("following_id", authorIds),
    ]);

    if (votes) {
      votedPostIds = new Set(votes.map((v) => v.post_id));
    }
    if (follows) {
      followedUserIds = new Set(follows.map((f) => f.following_id));
    }
  }

  const hasMore = posts.length > FEED_PAGE_SIZE;
  const feedPosts = hasMore ? posts.slice(0, FEED_PAGE_SIZE) : posts;

  const postsWithVoteStatus: PostWithAuthor[] = feedPosts.map((post) => ({
    ...post,
    profiles: post.profiles as unknown as PostWithAuthor["profiles"],
    has_voted: votedPostIds.has(post.id),
    is_followed: followedUserIds.has(post.user_id),
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
  let followedUserIds: Set<string> = new Set();
  if (user && posts.length > 0) {
    const postIds = posts.map((p) => p.id);
    const authorIds = [...new Set(posts.map((p) => p.user_id))];

    const [{ data: votes }, { data: follows }] = await Promise.all([
      supabase
        .from("votes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds),
      supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .in("following_id", authorIds),
    ]);

    if (votes) {
      votedPostIds = new Set(votes.map((v) => v.post_id));
    }
    if (follows) {
      followedUserIds = new Set(follows.map((f) => f.following_id));
    }
  }

  return posts.map((post) => ({
    ...post,
    profiles: post.profiles as unknown as PostWithAuthor["profiles"],
    has_voted: votedPostIds.has(post.id),
    is_followed: followedUserIds.has(post.user_id),
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

  // Get followed users and followed hashtags in parallel
  const [{ data: followRows }, { data: hashtagFollows }] = await Promise.all([
    supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id),
    supabase
      .from("hashtag_follows")
      .select("hashtag")
      .eq("user_id", user.id),
  ]);

  const followingIds = (followRows || []).map((f) => f.following_id);
  const followedHashtags = (hashtagFollows || []).map((h) => h.hashtag);

  if (followingIds.length === 0 && followedHashtags.length === 0) {
    return { posts: [], nextCursor: null };
  }

  // Get post IDs from followed hashtags
  let hashtagPostIds: string[] = [];
  if (followedHashtags.length > 0) {
    const { data: hashtagPosts } = await supabase
      .from("post_hashtags")
      .select("post_id")
      .in("hashtag", followedHashtags);

    hashtagPostIds = [...new Set((hashtagPosts || []).map((hp) => hp.post_id))];
  }

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

  // Combine: posts by followed users OR posts with followed hashtags
  if (followingIds.length > 0 && hashtagPostIds.length > 0) {
    query = query.or(
      `user_id.in.(${followingIds.join(",")}),id.in.(${hashtagPostIds.join(",")})`
    );
  } else if (followingIds.length > 0) {
    query = query.in("user_id", followingIds);
  } else {
    query = query.in("id", hashtagPostIds);
  }

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: posts, error } = await query;

  if (error || !posts) {
    return { posts: [], nextCursor: null };
  }

  const followedUserIdSet = new Set(followingIds);

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
    is_followed: followedUserIdSet.has(post.user_id),
  }));

  return {
    posts: postsWithVoteStatus,
    nextCursor: hasMore
      ? feedPosts[feedPosts.length - 1].created_at
      : null,
  };
}

export async function getFeedByHashtag(
  hashtag: string,
  cursor?: string
): Promise<FeedPage> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get post IDs for this hashtag
  const { data: hashtagPosts } = await supabase
    .from("post_hashtags")
    .select("post_id")
    .eq("hashtag", hashtag.toLowerCase());

  const postIds = (hashtagPosts || []).map((hp) => hp.post_id);

  if (postIds.length === 0) {
    return { posts: [], nextCursor: null };
  }

  // Fetch posts sorted by upvotes (like hot tab)
  let query = supabase
    .from("posts")
    .select(
      `
      *,
      profiles!posts_user_id_fkey (username, display_name, avatar_url)
    `
    )
    .in("id", postIds)
    .order("upvote_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE + 1);

  if (cursor) {
    const [upStr, caStr] = cursor.split("|");
    const parsedUpvotes = parseInt(upStr, 10);
    query = query.or(
      `upvote_count.lt.${parsedUpvotes},and(upvote_count.eq.${parsedUpvotes},created_at.lt.${caStr})`
    );
  }

  const { data: posts, error } = await query;

  if (error || !posts) {
    return { posts: [], nextCursor: null };
  }

  let votedPostIds: Set<string> = new Set();
  let followedUserIds: Set<string> = new Set();
  if (user && posts.length > 0) {
    const pIds = posts.map((p) => p.id);
    const authorIds = [...new Set(posts.map((p) => p.user_id))];

    const [{ data: votes }, { data: follows }] = await Promise.all([
      supabase
        .from("votes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", pIds),
      supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .in("following_id", authorIds),
    ]);

    if (votes) {
      votedPostIds = new Set(votes.map((v) => v.post_id));
    }
    if (follows) {
      followedUserIds = new Set(follows.map((f) => f.following_id));
    }
  }

  const hasMore = posts.length > FEED_PAGE_SIZE;
  const feedPosts = hasMore ? posts.slice(0, FEED_PAGE_SIZE) : posts;

  const postsWithVoteStatus: PostWithAuthor[] = feedPosts.map((post) => ({
    ...post,
    profiles: post.profiles as unknown as PostWithAuthor["profiles"],
    has_voted: votedPostIds.has(post.id),
    is_followed: followedUserIds.has(post.user_id),
  }));

  const lastPost = feedPosts[feedPosts.length - 1];
  return {
    posts: postsWithVoteStatus,
    nextCursor: hasMore
      ? `${lastPost.upvote_count}|${lastPost.created_at}`
      : null,
  };
}

export async function isHashtagFollowed(hashtag: string): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("hashtag_follows")
    .select("hashtag")
    .eq("user_id", user.id)
    .eq("hashtag", hashtag.toLowerCase())
    .maybeSingle();

  return !!data;
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
  let followedUserIds: Set<string> = new Set();
  if (user && posts.length > 0) {
    const postIds = posts.map((p) => p.id);
    const authorIds = [...new Set(posts.map((p) => p.user_id))];

    const [{ data: votes }, { data: follows }] = await Promise.all([
      supabase
        .from("votes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds),
      supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .in("following_id", authorIds),
    ]);

    if (votes) {
      votedPostIds = new Set(votes.map((v) => v.post_id));
    }
    if (follows) {
      followedUserIds = new Set(follows.map((f) => f.following_id));
    }
  }

  const hasMore = posts.length > FEED_PAGE_SIZE;
  const feedPosts = hasMore ? posts.slice(0, FEED_PAGE_SIZE) : posts;

  const postsWithVoteStatus: PostWithAuthor[] = feedPosts.map((post) => ({
    ...post,
    profiles: post.profiles as unknown as PostWithAuthor["profiles"],
    has_voted: votedPostIds.has(post.id),
    is_followed: followedUserIds.has(post.user_id),
  }));

  const lastPost = feedPosts[feedPosts.length - 1];
  return {
    posts: postsWithVoteStatus,
    nextCursor: hasMore
      ? `${lastPost.upvote_count}|${lastPost.created_at}`
      : null,
  };
}

export async function getPostById(
  postId: string
): Promise<PostWithAuthor | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: post, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles!posts_user_id_fkey (username, display_name, avatar_url)
    `
    )
    .eq("id", postId)
    .single();

  if (error || !post) {
    return null;
  }

  let hasVoted = false;
  let isFollowed = false;
  if (user) {
    const [{ data: votes }, { data: follows }] = await Promise.all([
      supabase
        .from("votes")
        .select("post_id")
        .eq("user_id", user.id)
        .eq("post_id", postId),
      supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .eq("following_id", post.user_id),
    ]);

    hasVoted = (votes?.length ?? 0) > 0;
    isFollowed = (follows?.length ?? 0) > 0;
  }

  return {
    ...post,
    profiles: post.profiles as unknown as PostWithAuthor["profiles"],
    has_voted: hasVoted,
    is_followed: isFollowed,
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
