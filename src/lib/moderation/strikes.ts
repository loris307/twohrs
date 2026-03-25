import { createAdminClient } from "@/lib/supabase/admin";
import { NSFW_STRIKE_BAN_THRESHOLD } from "@/lib/constants";
import { hashNormalizedAuthEmail } from "@/lib/utils/auth-email";
import { getOwnedMemesFolderPrefixes } from "@/lib/utils/private-media";

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
    .select(`is_admin, ${column}`)
    .eq("id", userId)
    .single();

  const currentStrikes = (profile as Record<string, number> | null)?.[column] ?? 0;

  if (profile && "is_admin" in profile && profile.is_admin) {
    return {
      newStrikes: currentStrikes,
      accountDeleted: false,
    };
  }

  const newStrikes = currentStrikes + 1;

  await adminClient
    .from("profiles")
    .update({ [column]: newStrikes })
    .eq("id", userId);

  let accountDeleted = false;

  if (newStrikes >= banThreshold) {
    const { data: authUser } = await adminClient.auth.admin.getUserById(userId);
    if (authUser?.user?.email) {
      await adminClient
        .from("banned_email_hashes")
        .upsert({ hash: hashNormalizedAuthEmail(authUser.user.email) });
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

    // Delete meme files (regular posts + comment images)
    for (const prefix of getOwnedMemesFolderPrefixes(userId)) {
      const { data: memeFiles } = await adminClient.storage
        .from("memes")
        .list(prefix);

      if (memeFiles && memeFiles.length > 0) {
        await adminClient.storage
          .from("memes")
          .remove(memeFiles.map((f) => `${prefix}/${f.name}`));
      }
    }

    // Delete audio files
    const { data: audioFiles } = await adminClient.storage
      .from("audio-posts")
      .list(userId);

    if (audioFiles && audioFiles.length > 0) {
      await adminClient.storage
        .from("audio-posts")
        .remove(audioFiles.map((f) => `${userId}/${f.name}`));
    }

    // Delete Hall of Fame storage files (before cascade deletes the rows)
    const { data: hallOfFameEntries } = await adminClient
      .from("top_posts_all_time")
      .select("image_path, audio_path")
      .eq("user_id", userId);

    if (hallOfFameEntries && hallOfFameEntries.length > 0) {
      const hofImagePaths = hallOfFameEntries
        .map((e) => e.image_path)
        .filter((p): p is string => p != null);
      if (hofImagePaths.length > 0) {
        await adminClient.storage.from("memes").remove(hofImagePaths);
      }

      const hofAudioPaths = hallOfFameEntries
        .map((e) => e.audio_path)
        .filter((p): p is string => p != null);
      if (hofAudioPaths.length > 0) {
        await adminClient.storage.from("audio-posts").remove(hofAudioPaths);
      }
    }

    // Delete auth user (cascades to profiles -> everything)
    await adminClient.auth.admin.deleteUser(userId);
    accountDeleted = true;
  }

  return { newStrikes, accountDeleted };
}
