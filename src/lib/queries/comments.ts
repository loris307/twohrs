import { createClient } from "@/lib/supabase/server";
import type { CommentListItem, CommentPage } from "@/lib/types";

const COMMENT_SELECT = `
  id, post_id, user_id, text, upvote_count, parent_comment_id,
  root_comment_id, depth, reply_count, deleted_at, created_at,
  profiles!comments_user_id_fkey (username, display_name, avatar_url)
`;

async function enrichCommentsWithVotes(
  comments: Record<string, unknown>[],
  userId: string | undefined
): Promise<CommentListItem[]> {
  if (!comments || comments.length === 0) return [];

  const supabase = await createClient();
  let votedCommentIds: Set<string> = new Set();

  if (userId && comments.length > 0) {
    const commentIds = comments.map((c) => c.id as string);
    const { data: votes } = await supabase
      .from("comment_votes")
      .select("comment_id")
      .eq("user_id", userId)
      .in("comment_id", commentIds);

    if (votes) {
      votedCommentIds = new Set(votes.map((v) => v.comment_id));
    }
  }

  return comments.map((comment) => ({
    id: comment.id as string,
    post_id: comment.post_id as string,
    user_id: comment.user_id as string,
    text: comment.text as string,
    upvote_count: comment.upvote_count as number,
    parent_comment_id: comment.parent_comment_id as string | null,
    root_comment_id: comment.root_comment_id as string,
    depth: comment.depth as number,
    reply_count: comment.reply_count as number,
    deleted_at: comment.deleted_at as string | null,
    deleted_by: null, // Never expose deleted_by to clients
    created_at: comment.created_at as string,
    profiles: comment.profiles as CommentListItem["profiles"],
    has_voted: votedCommentIds.has(comment.id as string),
    is_deleted: !!(comment.deleted_at),
  }));
}

export async function getTopLevelCommentsPage(
  postId: string,
  offset: number,
  limit: number
): Promise<CommentPage> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Count ALL non-deleted comments (all depths) for the visible count
  const { count: allCount } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId)
    .is("deleted_at", null);

  const { data: comments, count: topLevelCount } = await supabase
    .from("comments")
    .select(COMMENT_SELECT, { count: "exact" })
    .eq("post_id", postId)
    .is("parent_comment_id", null)
    .order("upvote_count", { ascending: false })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  const enriched = await enrichCommentsWithVotes(
    (comments ?? []) as unknown as Record<string, unknown>[],
    user?.id
  );

  return {
    comments: enriched,
    totalCount: allCount ?? 0,
    topLevelCount: topLevelCount ?? 0,
    nextOffset: offset + limit < (topLevelCount ?? 0) ? offset + limit : null,
  };
}

export async function getCommentRepliesPage(
  parentCommentId: string,
  offset: number,
  limit: number
): Promise<CommentPage> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: comments, count } = await supabase
    .from("comments")
    .select(COMMENT_SELECT, { count: "exact" })
    .eq("parent_comment_id", parentCommentId)
    .order("upvote_count", { ascending: false })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  const enriched = await enrichCommentsWithVotes(
    (comments ?? []) as unknown as Record<string, unknown>[],
    user?.id
  );

  return {
    comments: enriched,
    totalCount: count ?? 0,
    topLevelCount: count ?? 0,
    nextOffset: offset + limit < (count ?? 0) ? offset + limit : null,
  };
}
