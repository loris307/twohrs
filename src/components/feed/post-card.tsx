import Link from "next/link";
import Image from "next/image";
import { UpvoteButton } from "./upvote-button";
import { formatRelativeTime } from "@/lib/utils/format";
import type { PostWithAuthor } from "@/lib/types";

interface PostCardProps {
  post: PostWithAuthor;
}

export function PostCard({ post }: PostCardProps) {
  const profile = post.profiles;

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link
          href={`/profile/${profile.username}`}
          className="flex items-center gap-3 hover:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.username}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              profile.username[0].toUpperCase()
            )}
          </div>
          <div>
            <p className="text-sm font-medium leading-none">
              {profile.display_name || profile.username}
            </p>
            <p className="text-xs text-muted-foreground">
              @{profile.username}
            </p>
          </div>
        </Link>
        <span className="ml-auto text-xs text-muted-foreground">
          {formatRelativeTime(post.created_at)}
        </span>
      </div>

      {/* Image */}
      <div className="relative w-full">
        <Image
          src={post.image_url}
          alt={post.caption || "Meme"}
          width={800}
          height={600}
          className="w-full object-contain"
          style={{ maxHeight: "600px" }}
        />
      </div>

      {/* Caption + Actions */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <UpvoteButton
            postId={post.id}
            initialCount={post.upvote_count}
            initialVoted={post.has_voted}
          />
        </div>
        {post.caption && (
          <p className="mt-2 text-sm">
            <Link
              href={`/profile/${profile.username}`}
              className="font-medium hover:underline"
            >
              {profile.username}
            </Link>{" "}
            {post.caption}
          </p>
        )}
      </div>
    </article>
  );
}
