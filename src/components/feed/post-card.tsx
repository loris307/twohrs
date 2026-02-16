import Link from "next/link";
import Image from "next/image";
import { UpvoteButton } from "./upvote-button";
import { ShareButton } from "./share-button";
import { PostActions } from "./post-actions";
import { LinkPreview } from "./link-preview";
import { PostCardLink } from "./post-card-link";
import { PostFollowButton } from "./post-follow-button";
import { AdminDeleteButton } from "./admin-delete-button";
import { formatRelativeTime } from "@/lib/utils/format";
import { renderTextWithMentions } from "@/lib/utils/render-mentions";
import type { PostWithAuthor } from "@/lib/types";

interface PostCardProps {
  post: PostWithAuthor;
  currentUserId?: string;
  hideCommentSection?: boolean;
  isAdmin?: boolean;
}

export function PostCard({ post, currentUserId, hideCommentSection, isAdmin }: PostCardProps) {
  const profile = post.profiles;
  const isOwn = currentUserId === post.user_id;
  const showFollow = !!currentUserId && !isOwn && !post.is_followed;
  const isGif = post.image_url?.toLowerCase().includes(".gif") ?? false;
  const hasOgData = post.og_url && (post.og_title || post.og_description || post.og_image);

  const cardContent = (
    <>
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
        {showFollow && <PostFollowButton userId={post.user_id} />}
        {isAdmin && !isOwn && <AdminDeleteButton postId={post.id} />}
        <span className="ml-auto text-xs text-muted-foreground">
          {formatRelativeTime(post.created_at)}
        </span>
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="px-4 pb-3">
          <p className="text-sm whitespace-pre-wrap break-words">
            {renderTextWithMentions(post.caption)}
          </p>
        </div>
      )}

      {/* Image / OG preview */}
      {post.image_url && (
        <div className="relative w-full overflow-hidden">
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

      {hasOgData && (
        <LinkPreview
          title={post.og_title}
          description={post.og_description}
          image={post.og_image}
          url={post.og_url!}
        />
      )}

      {/* Actions */}
      {hideCommentSection ? (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <UpvoteButton
              postId={post.id}
              initialCount={post.upvote_count}
              initialVoted={post.has_voted}
            />
            <ShareButton postId={post.id} caption={post.caption} />
          </div>
        </div>
      ) : (
        <PostActions
          postId={post.id}
          initialUpvoteCount={post.upvote_count}
          initialVoted={post.has_voted}
          initialCommentCount={post.comment_count}
          caption={post.caption}
          isAdmin={isAdmin}
        />
      )}
    </>
  );

  // On the post detail page, render a plain article (no click-to-navigate)
  if (hideCommentSection) {
    return (
      <article className="rounded-lg border border-border bg-card">
        {cardContent}
      </article>
    );
  }

  // In the feed, the entire card is clickable → navigates to /post/[id]
  return (
    <PostCardLink postId={post.id}>
      {cardContent}
    </PostCardLink>
  );
}
