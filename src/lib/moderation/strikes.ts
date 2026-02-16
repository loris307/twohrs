import { createAdminClient } from "@/lib/supabase/admin";
import { NSFW_STRIKE_BAN_THRESHOLD } from "@/lib/constants";

export type StrikeResult = {
  newStrikes: number;
  accountDeleted: boolean;
};

type StrikeOptions = {
  /** Which column to increment. Default: "moderation_strikes" (admin, threshold 3) */
  column?: "moderation_strikes" | "nsfw_strikes";
  /** How many strikes before account deletion. Default: 3 for admin, 100 for nsfw */
  banThreshold?: number;
};

/**
 * Add a moderation strike to a user.
 *
 * Admin moderation (default): column "moderation_strikes", ban at 3
 * NSFW auto-moderation: column "nsfw_strikes", ban at 100
 */
export async function addModerationStrike(
  userId: string,
  options?: StrikeOptions
): Promise<StrikeResult> {
  const column = options?.column ?? "moderation_strikes";
  const banThreshold = options?.banThreshold ?? (column === "nsfw_strikes" ? NSFW_STRIKE_BAN_THRESHOLD : 3);

  const adminClient = createAdminClient();

  const { data: profile } = await adminClient
    .from("profiles")
    .select(column)
    .eq("id", userId)
    .single();

  const currentStrikes = (profile as Record<string, number> | null)?.[column] ?? 0;
  const newStrikes = currentStrikes + 1;

  await adminClient
    .from("profiles")
    .update({ [column]: newStrikes })
    .eq("id", userId);

  let accountDeleted = false;

  if (newStrikes >= banThreshold) {
    const { data: authUser } = await adminClient.auth.admin.getUserById(userId);
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
      .list(userId);

    if (avatarFiles && avatarFiles.length > 0) {
      await adminClient.storage
        .from("avatars")
        .remove(avatarFiles.map((f) => `${userId}/${f.name}`));
    }

    // Delete meme files
    const { data: memeFiles } = await adminClient.storage
      .from("memes")
      .list(userId);

    if (memeFiles && memeFiles.length > 0) {
      await adminClient.storage
        .from("memes")
        .remove(memeFiles.map((f) => `${userId}/${f.name}`));
    }

    // Delete auth user (cascades to profiles -> everything)
    await adminClient.auth.admin.deleteUser(userId);
    accountDeleted = true;
  }

  return { newStrikes, accountDeleted };
}
