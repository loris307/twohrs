import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getFollowCounts, isFollowing } from "@/lib/queries/profile";
import { getPostsByUser } from "@/lib/queries/posts";
import { getUnreadMentionCount } from "@/lib/queries/mentions";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileStats } from "@/components/profile/profile-stats";
import { ProfileTabs } from "@/components/profile/profile-tabs";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const profile = await getProfile(username);
  if (!profile) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwnProfile = user?.id === profile.id;

  let isAdmin = false;
  if (user) {
    const { data: currentUserProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = currentUserProfile?.is_admin ?? false;
  }

  const [followCounts, following, posts, unreadMentionCount] = await Promise.all([
    getFollowCounts(profile.id),
    user && !isOwnProfile
      ? isFollowing(user.id, profile.id)
      : Promise.resolve(false),
    getPostsByUser(profile.id),
    isOwnProfile && user ? getUnreadMentionCount(user.id) : Promise.resolve(0),
  ]);

  return (
    <div className="space-y-8">
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        isFollowing={following}
        followerCount={followCounts.followers}
        followingCount={followCounts.following}
      />

      <ProfileStats profile={profile} />

      <ProfileTabs
        isOwnProfile={isOwnProfile}
        userId={profile.id}
        posts={posts}
        currentUserId={user?.id}
        isAdmin={isAdmin}
        hasUnreadMentions={unreadMentionCount > 0}
      />
    </div>
  );
}
