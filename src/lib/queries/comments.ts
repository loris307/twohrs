import { createClient } from "@/lib/supabase/server";
import type { CommentWithAuthor } from "@/lib/types";

export async function getCommentsByPost(
  postId: string
): Promise<CommentWithAuthor[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: comments, error } = await supabase
    .from("comments")
    .select(
      `
      *,
      profiles!comments_user_id_fkey (username, display_name, avatar_url)
    `
    )
    .eq("post_id", postId)
    .order("upvote_count", { ascending: false })
    .order("created_at", { ascending: true });

  if (error || !comments) {
    return [];
  }

  // Check which comments the current user has voted on
  let votedCommentIds: Set<string> = new Set();
  if (user && comments.length > 0) {
    const commentIds = comments.map((c) => c.id);
    const { data: votes } = await supabase
      .from("comment_votes")
      .select("comment_id")
      .eq("user_id", user.id)
      .in("comment_id", commentIds);

    if (votes) {
      votedCommentIds = new Set(votes.map((v) => v.comment_id));
    }
  }

  return comments.map((comment) => ({
    ...comment,
    profiles: comment.profiles as unknown as CommentWithAuthor["profiles"],
    has_voted: votedCommentIds.has(comment.id),
  }));
}
