"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validations";
import type { ActionResult } from "@/lib/types";

export async function adminDeletePost(
  postId: string
): Promise<ActionResult<{ strikes: number; accountDeleted: boolean; username: string }>> {
  if (!uuidSchema.safeParse(postId).success) {
    return { success: false, error: "Ungültige Post-ID" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  // Use admin client for all operations (bypasses RLS + time-gate)
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();

  // Check if caller is admin
  const { data: adminProfile } = await adminClient
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!adminProfile?.is_admin) {
    return { success: false, error: "Nicht berechtigt" };
  }

  // Get the post
  const { data: post } = await adminClient
    .from("posts")
    .select("id, user_id, image_path")
    .eq("id", postId)
    .single();

  if (!post) {
    return { success: false, error: "Post nicht gefunden" };
  }

  // Prevent self-moderation
  if (post.user_id === user.id) {
    return { success: false, error: "Eigene Posts normal löschen" };
  }

  // Get author profile for username and current strikes
  const { data: authorProfile } = await adminClient
    .from("profiles")
    .select("username, moderation_strikes")
    .eq("id", post.user_id)
    .single();

  if (!authorProfile) {
    return { success: false, error: "User nicht gefunden" };
  }

  // Delete storage file if image exists
  if (post.image_path) {
    await adminClient.storage.from("memes").remove([post.image_path]);
  }

  // Delete the post
  const { error: deleteError } = await adminClient
    .from("posts")
    .delete()
    .eq("id", postId);

  if (deleteError) {
    return { success: false, error: "Löschen fehlgeschlagen" };
  }

  // Increment moderation strikes (shared logic with auto-moderation)
  const { addModerationStrike } = await import("@/lib/moderation/strikes");
  const { newStrikes, accountDeleted } = await addModerationStrike(post.user_id);

  revalidatePath("/feed");

  return {
    success: true,
    data: {
      strikes: newStrikes,
      accountDeleted,
      username: authorProfile.username,
    },
  };
}
