"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function adminDeletePost(
  postId: string
): Promise<ActionResult<{ strikes: number; accountDeleted: boolean; username: string }>> {
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

  // Increment moderation strikes
  const newStrikes = (authorProfile.moderation_strikes ?? 0) + 1;

  await adminClient
    .from("profiles")
    .update({ moderation_strikes: newStrikes })
    .eq("id", post.user_id);

  // Strike 3: ban email hash + delete entire account
  let accountDeleted = false;
  if (newStrikes >= 3) {
    // Get the user's email before deleting and store its hash
    const { data: authUser } = await adminClient.auth.admin.getUserById(post.user_id);
    if (authUser?.user?.email) {
      const { createHash } = await import("crypto");
      const emailHash = createHash("sha256")
        .update(authUser.user.email.toLowerCase().trim())
        .digest("hex");
      await adminClient
        .from("banned_email_hashes")
        .upsert({ hash: emailHash });
    }

    // Delete avatar files
    const { data: avatarFiles } = await adminClient.storage
      .from("avatars")
      .list(post.user_id);

    if (avatarFiles && avatarFiles.length > 0) {
      await adminClient.storage
        .from("avatars")
        .remove(avatarFiles.map((f) => `${post.user_id}/${f.name}`));
    }

    // Delete meme files
    const { data: memeFiles } = await adminClient.storage
      .from("memes")
      .list(post.user_id);

    if (memeFiles && memeFiles.length > 0) {
      await adminClient.storage
        .from("memes")
        .remove(memeFiles.map((f) => `${post.user_id}/${f.name}`));
    }

    // Delete auth user (cascades to profiles → everything)
    await adminClient.auth.admin.deleteUser(post.user_id);
    accountDeleted = true;
  }

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
