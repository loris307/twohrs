import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type PrivateProfile = {
  username: string;
  is_admin: boolean;
  moderation_strikes: number;
  last_mentions_seen_at: string;
};

export async function getPrivateProfileById(
  userId: string
): Promise<PrivateProfile | null> {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("username, is_admin, moderation_strikes, last_mentions_seen_at")
    .eq("id", userId)
    .maybeSingle();

  return data;
}
