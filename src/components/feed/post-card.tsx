import Link from "next/link";
import Image from "next/image";
import { UpvoteButton } from "./upvote-button";
import { ShareButton } from "./share-button";
import { CommentSection } from "./comment-section";
import { LinkPreview } from "./link-preview";
import { formatRelativeTime } from "@/lib/utils/format";
import type { PostWithAuthor } from "@/lib/types";

interface PostCardProps {
  post: PostWithAuthor;
}

export function PostCard({ post }: PostCardProps) {
  const profile = post.profiles;
  const isGif = post.image_url?.toLowerCase().includes(".gif") ?? false;
  const hasOgData = post.og_url && (post.og_title || post.og_description || post.og_image);

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

      {/* Caption — always above image */}
      {post.caption && (
        <div className="px-4 pb-3">
          <p className="text-sm whitespace-pre-wrap">{post.caption}</p>
        </div>
      )}

      {/* Image */}
      {post.image_url && (
        <div className="relative w-full">
          <Image
            src={post.image_url}
            alt={post.caption || "Meme"}
            width={800}
            height={600}
            className="w-full object-contain"
            style={{ maxHeight: "600px" }}
            unoptimized={isGif}
          />
        </div>
      )}

      {/* OG Link Preview */}
      {hasOgData && (
        <LinkPreview
          title={post.og_title}
          description={post.og_description}
          image={post.og_image}
          url={post.og_url!}
        />
      )}

      {/* Actions */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <UpvoteButton
              postId={post.id}
              initialCount={post.upvote_count}
              initialVoted={post.has_voted}
            />
            <CommentSection
              postId={post.id}
              initialCount={post.comment_count}
            />
          </div>
          <ShareButton caption={post.caption} />
        </div>
      </div>
    </article>
  );
}
