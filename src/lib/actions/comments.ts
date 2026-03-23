"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAppOpen } from "@/lib/utils/time";
import { MAX_COMMENTS_PER_SESSION, MAX_COMMENT_THREAD_DEPTH } from "@/lib/constants";
import { createCommentSchema, uuidSchema } from "@/lib/validations";
import { extractMentions } from "@/lib/utils/mentions";
import { normalizeText } from "@/lib/utils/normalize-text";
import type { ActionResult } from "@/lib/types";

export async function createComment(
  postId: string,
  rawText: string,
  parentCommentId?: string
): Promise<ActionResult<{ id: string }>> {
  if (!uuidSchema.safeParse(postId).success) {
    return { success: false, error: "Ungültige Post-ID" };
  }
  if (parentCommentId && !uuidSchema.safeParse(parentCommentId).success) {
    return { success: false, error: "Ungültige Kommentar-ID" };
  }

  if (!isAppOpen()) {
    return { success: false, error: "Die App ist gerade geschlossen" };
  }

  const text = normalizeText(rawText);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  // Rate limit check (Berlin timezone to align with session window)
  const berlinNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const startOfDay = new Date(berlinNow);
  startOfDay.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("comments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .gte("created_at", startOfDay.toISOString());

  if ((count ?? 0) >= MAX_COMMENTS_PER_SESSION) {
    return {
      success: false,
      error: `Maximal ${MAX_COMMENTS_PER_SESSION} Kommentare pro Tag erlaubt`,
    };
  }

  const parsed = createCommentSchema.safeParse({ text });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  // Validate parent comment if replying
  const commentId = crypto.randomUUID();
  let depth = 0;
  let rootCommentId = commentId;
  let parent: { id: string; post_id: string; user_id: string; depth: number; root_comment_id: string } | null = null;

  if (parentCommentId) {
    const { data: parentData } = await supabase
      .from("comments")
      .select("id, post_id, user_id, depth, root_comment_id, deleted_at")
      .eq("id", parentCommentId)
      .single();

    if (!parentData) {
      return { success: false, error: "Elternkommentar nicht gefunden" };
    }
    if (parentData.post_id !== postId) {
      return { success: false, error: "Kommentar gehört nicht zu diesem Post" };
    }
    if (parentData.deleted_at) {
      return { success: false, error: "Auf gelöschte Kommentare kann nicht geantwortet werden" };
    }

    depth = parentData.depth + 1;
    if (depth > MAX_COMMENT_THREAD_DEPTH) {
      return { success: false, error: "Maximale Thread-Tiefe erreicht" };
    }

    rootCommentId = parentData.root_comment_id ?? parentData.id;
    parent = parentData;
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      id: commentId,
      post_id: postId,
      user_id: user.id,
      text: parsed.data.text ?? null,
      image_path: parsed.data.imagePath ?? null,
      parent_comment_id: parentCommentId ?? null,
      depth,
      root_comment_id: rootCommentId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Comment insert failed:", error.message, error.code);
    return { success: false, error: "Kommentar erstellen fehlgeschlagen" };
  }

  // Extract and store @mentions (admin client bypasses RLS)
  const usernames = parsed.data.text ? extractMentions(parsed.data.text) : [];
  let mentionedUserIds: string[] = [];
  if (usernames.length > 0) {
    const admin = createAdminClient();
    const { data: mentionedUsers } = await admin
      .from("profiles")
      .select("id, username")
      .in("username", usernames.slice(0, 10));

    if (mentionedUsers && mentionedUsers.length > 0) {
      mentionedUserIds = mentionedUsers.map((u) => u.id);
      const mentionRows = mentionedUsers.map((u) => ({
        mentioned_user_id: u.id,
        mentioning_user_id: user.id,
        post_id: postId,
        comment_id: data.id,
      }));

      await admin.from("mentions").insert(mentionRows);
    }
  }

  // Auto-mention parent comment author on reply
  if (parentCommentId && parent) {
    const parentAuthorId = parent.user_id;
    if (parentAuthorId !== user.id && !mentionedUserIds.includes(parentAuthorId)) {
      const admin = createAdminClient();
      await admin.from("mentions").insert({
        mentioned_user_id: parentAuthorId,
        mentioning_user_id: user.id,
        post_id: postId,
        comment_id: data.id,
      });
    }
  }

  revalidatePath("/feed");
  revalidatePath(`/post/${postId}`);
  return { success: true, data: { id: data.id } };
}

export async function deleteComment(
  commentId: string
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(commentId).success) {
    return { success: false, error: "Ungültige Kommentar-ID" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  // Check admin status
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.is_admin ?? false;

  // Use admin client to fetch comment (bypasses RLS/time-gate)
  const { data: comment } = await admin
    .from("comments")
    .select("user_id, post_id, deleted_at")
    .eq("id", commentId)
    .single();

  if (!comment) {
    return { success: false, error: "Kommentar nicht gefunden" };
  }

  // Already soft-deleted — idempotent success
  if (comment.deleted_at) {
    return { success: true };
  }

  if (comment.user_id !== user.id && !isAdmin) {
    return { success: false, error: "Nicht berechtigt" };
  }

  // Soft delete via admin client (DELETE RLS policy removed)
  const { error } = await admin
    .from("comments")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq("id", commentId)
    .is("deleted_at", null);

  if (error) {
    return { success: false, error: "Löschen fehlgeschlagen" };
  }

  revalidatePath("/feed");
  revalidatePath(`/post/${comment.post_id}`);
  return { success: true };
}

export async function toggleCommentVote(
  commentId: string
): Promise<ActionResult<{ voted: boolean }>> {
  if (!uuidSchema.safeParse(commentId).success) {
    return { success: false, error: "Ungültige Kommentar-ID" };
  }

  if (!isAppOpen()) {
    return { success: false, error: "Die App ist gerade geschlossen" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  // Reject vote on soft-deleted comment
  const { data: targetComment } = await supabase
    .from("comments")
    .select("deleted_at")
    .eq("id", commentId)
    .single();

  if (!targetComment || targetComment.deleted_at) {
    return { success: false, error: "Kommentar nicht gefunden" };
  }

  // Check if vote exists
  const { data: existingVote } = await supabase
    .from("comment_votes")
    .select("id")
    .eq("user_id", user.id)
    .eq("comment_id", commentId)
    .single();

  if (existingVote) {
    const { error } = await supabase
      .from("comment_votes")
      .delete()
      .eq("id", existingVote.id);

    if (error) {
      return { success: false, error: "Vote entfernen fehlgeschlagen" };
    }

    return { success: true, data: { voted: false } };
  } else {
    const { error } = await supabase.from("comment_votes").insert({
      user_id: user.id,
      comment_id: commentId,
    });

    if (error) {
      return { success: false, error: "Vote fehlgeschlagen" };
    }

    return { success: true, data: { voted: true } };
  }
}
