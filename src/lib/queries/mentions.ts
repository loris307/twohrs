import { createClient } from "@/lib/supabase/server";
import type { PostWithAuthor } from "@/lib/types";

export async function getMentionedPosts(
  userId: string
): Promise<{ posts: PostWithAuthor[]; unreadPostIds: string[] }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user's last_mentions_seen_at for unread tracking
  const { data: profile } = await supabase
    .from("profiles")
    .select("last_mentions_seen_at")
    .eq("id", userId)
    .single();

  const lastSeen = profile?.last_mentions_seen_at ?? new Date().toISOString();

  // Get post IDs where this user was mentioned, with timestamps
  const { data: mentions } = await supabase
    .from("mentions")
    .select("post_id, created_at")
    .eq("mentioned_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!mentions || mentions.length === 0) return { posts: [], unreadPostIds: [] };

  // Preserve mention order (newest mention first), deduplicate post IDs
  const seen = new Set<string>();
  const orderedPostIds: string[] = [];
  const unreadPostIds: string[] = [];
  for (const m of mentions) {
    if (m.post_id && !seen.has(m.post_id)) {
      seen.add(m.post_id);
      orderedPostIds.push(m.post_id);
      if (m.created_at > lastSeen) {
        unreadPostIds.push(m.post_id);
      }
    }
  }
  if (orderedPostIds.length === 0) return { posts: [], unreadPostIds: [] };

  // Fetch full posts with author profiles
  const { data: posts } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles!posts_user_id_fkey (username, display_name, avatar_url)
    `
    )
    .in("id", orderedPostIds);

  if (!posts) return { posts: [], unreadPostIds: [] };

  // Check votes and follows for current user
  let votedPostIds: Set<string> = new Set();
  let followedUserIds: Set<string> = new Set();
  if (user && posts.length > 0) {
    const ids = posts.map((p) => p.id);
    const authorIds = [...new Set(posts.map((p) => p.user_id))];

    const [{ data: votes }, { data: follows }] = await Promise.all([
      supabase
        .from("votes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", ids),
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

  // Build map for O(1) lookup, then reorder by mention time
  const postMap = new Map(posts.map((post) => [post.id, post]));

  const resultPosts = orderedPostIds
    .map((id) => postMap.get(id))
    .filter(Boolean)
    .map((post) => ({
      ...post!,
      profiles: post!.profiles as unknown as PostWithAuthor["profiles"],
      has_voted: votedPostIds.has(post!.id),
      is_followed: followedUserIds.has(post!.user_id),
    }));

  return { posts: resultPosts, unreadPostIds };
}

export async function getUnreadMentionCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("last_mentions_seen_at")
    .eq("id", userId)
    .single();

  if (!profile) return 0;

  const { count, error } = await supabase
    .from("mentions")
    .select("*", { count: "exact", head: true })
    .eq("mentioned_user_id", userId)
    .gt("created_at", profile.last_mentions_seen_at);

  if (error) return 0;
  return count ?? 0;
}
