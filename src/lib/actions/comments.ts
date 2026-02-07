"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAppOpen } from "@/lib/utils/time";
import { createCommentSchema } from "@/lib/validations";
import type { ActionResult } from "@/lib/types";

export async function createComment(
  postId: string,
  text: string
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

  const parsed = createCommentSchema.safeParse({ text });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      user_id: user.id,
      text: parsed.data.text,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Comment insert failed:", error.message, error.code);
    return { success: false, error: "Kommentar erstellen fehlgeschlagen" };
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

  const { data: comment } = await supabase
    .from("comments")
    .select("user_id")
    .eq("id", commentId)
    .single();

  if (!comment) {
    return { success: false, error: "Kommentar nicht gefunden" };
  }

  if (comment.user_id !== user.id) {
    return { success: false, error: "Nicht berechtigt" };
  }

  const { error } = await supabase
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
