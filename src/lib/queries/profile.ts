import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getProfile(
  username: string
): Promise<Profile | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  return data;
}

export async function getFollowCounts(
  userId: string
): Promise<{ followers: number; following: number }> {
  const supabase = await createClient();

  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);

  return {
    followers: followers ?? 0,
    following: following ?? 0,
  };
}

export async function getFollowers(
  userId: string
): Promise<Pick<Profile, "id" | "username" | "display_name" | "avatar_url">[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("follows")
    .select("profiles:follower_id(id, username, display_name, avatar_url)")
    .eq("following_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => row.profiles as unknown as Pick<Profile, "id" | "username" | "display_name" | "avatar_url">);
}

export async function getFollowing(
  userId: string
): Promise<Pick<Profile, "id" | "username" | "display_name" | "avatar_url">[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("follows")
    .select("profiles:following_id(id, username, display_name, avatar_url)")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => row.profiles as unknown as Pick<Profile, "id" | "username" | "display_name" | "avatar_url">);
}

export async function isFollowing(
  followerId: string,
  followingId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .single();

  return !!data;
}
