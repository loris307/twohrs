import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getFollowCounts, isFollowing } from "@/lib/queries/profile";
import { getPostsByUser } from "@/lib/queries/posts";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileStats } from "@/components/profile/profile-stats";
import { PostCard } from "@/components/feed/post-card";

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

  const [followCounts, following, posts] = await Promise.all([
    getFollowCounts(profile.id),
    user && !isOwnProfile
      ? isFollowing(user.id, profile.id)
      : Promise.resolve(false),
    getPostsByUser(profile.id),
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

      {posts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Heutige Posts</h2>
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
