import { createClient } from "@/lib/supabase/server";
import type { CommentWithAuthor, CommentWithReplies } from "@/lib/types";

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

export function groupCommentsWithReplies(
  flat: CommentWithAuthor[]
): CommentWithReplies[] {
  const topLevel: CommentWithReplies[] = [];
  const repliesByParent = new Map<string, CommentWithAuthor[]>();

  for (const comment of flat) {
    if (!comment.parent_comment_id) {
      topLevel.push({ ...comment, replies: [] });
    } else {
      const list = repliesByParent.get(comment.parent_comment_id) ?? [];
      list.push(comment);
      repliesByParent.set(comment.parent_comment_id, list);
    }
  }

  // Attach replies sorted chronologically
  for (const parent of topLevel) {
    const replies = repliesByParent.get(parent.id) ?? [];
    parent.replies = replies.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  return topLevel;
}
