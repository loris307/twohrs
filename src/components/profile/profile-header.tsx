import Image from "next/image";
import Link from "next/link";
import { Settings } from "lucide-react";
import { FollowButton } from "./follow-button";
import { formatNumber } from "@/lib/utils/format";
import type { Profile } from "@/lib/types";

interface ProfileHeaderProps {
  profile: Profile;
  isOwnProfile: boolean;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

export function ProfileHeader({
  profile,
  isOwnProfile,
  isFollowing,
  followerCount,
  followingCount,
}: ProfileHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-2xl font-bold">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.username}
              width={80}
              height={80}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            profile.username[0].toUpperCase()
          )}
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <h1 className="text-xl font-bold">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-sm text-muted-foreground">
              @{profile.username}
            </p>
          </div>

          {profile.bio && (
            <p className="text-sm">{profile.bio}</p>
          )}

          <div className="flex gap-4 text-sm">
            <span>
              <strong>{formatNumber(followerCount)}</strong>{" "}
              <span className="text-muted-foreground">Follower</span>
            </span>
            <span>
              <strong>{formatNumber(followingCount)}</strong>{" "}
              <span className="text-muted-foreground">Following</span>
            </span>
          </div>
        </div>
      </div>

      <div>
        {isOwnProfile ? (
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Settings className="h-4 w-4" />
            Profil bearbeiten
          </Link>
        ) : (
          <FollowButton
            userId={profile.id}
            initialFollowing={isFollowing}
          />
        )}
      </div>
    </div>
  );
}
