"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAppOpen } from "@/lib/utils/time";
import { MAX_COMMENTS_PER_SESSION } from "@/lib/constants";
import { createCommentSchema } from "@/lib/validations";
import { extractMentions } from "@/lib/utils/mentions";
import type { ActionResult } from "@/lib/types";

export async function createComment(
  postId: string,
  text: string,
  parentCommentId?: string
): Promise<ActionResult<{ id: string }>> {
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

  // Rate limit check
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("comments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
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
  let parent: { id: string; post_id: string; parent_comment_id: string | null; user_id: string } | null = null;
  if (parentCommentId) {
    const { data } = await supabase
      .from("comments")
      .select("id, post_id, parent_comment_id, user_id")
      .eq("id", parentCommentId)
      .single();

    if (!data) {
      return { success: false, error: "Elternkommentar nicht gefunden" };
    }
    if (data.post_id !== postId) {
      return { success: false, error: "Kommentar gehört nicht zu diesem Post" };
    }
    if (data.parent_comment_id !== null) {
      return { success: false, error: "Antworten auf Antworten nicht möglich" };
    }
    parent = data;
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      user_id: user.id,
      text: parsed.data.text,
      parent_comment_id: parentCommentId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Comment insert failed:", error.message, error.code);
    return { success: false, error: "Kommentar erstellen fehlgeschlagen" };
  }

  // Extract and store @mentions (admin client bypasses RLS)
  const usernames = extractMentions(parsed.data.text);
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
  return { success: true, data: { id: data.id } };
}

export async function deleteComment(
  commentId: string
): Promise<ActionResult> {
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
    .select("user_id")
    .eq("id", commentId)
    .single();

  if (!comment) {
    return { success: false, error: "Kommentar nicht gefunden" };
  }

  if (comment.user_id !== user.id && !isAdmin) {
    return { success: false, error: "Nicht berechtigt" };
  }

  // Admin uses admin client, owner uses regular client
  const client = isAdmin ? admin : supabase;
  const { error } = await client
    .from("comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    return { success: false, error: "Löschen fehlgeschlagen" };
  }

  revalidatePath("/feed");
  return { success: true };
}

export async function toggleCommentVote(
  commentId: string
): Promise<ActionResult<{ voted: boolean }>> {
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
