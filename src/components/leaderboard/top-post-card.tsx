import Link from "next/link";
import Image from "next/image";
import { ArrowBigUp, MessageCircle } from "lucide-react";
import { AudioPlayer } from "@/components/shared/audio-player";
import { formatNumber } from "@/lib/utils/format";
import { profilePath } from "@/lib/utils/profile-path";
import { buildPrivateMediaUrl } from "@/lib/utils/private-media";
import type { TopPostAllTime } from "@/lib/types";

interface TopPostCardProps {
  post: TopPostAllTime;
  rank: number;
}

export function TopPostCard({ post, rank }: TopPostCardProps) {
  const profile = post.profiles;

  // Prefer image_path (private media proxy) over legacy image_url
  const resolvedImageUrl = post.image_path
    ? buildPrivateMediaUrl("memes", post.image_path)
    : post.image_url;
  const resolvedAudioUrl = post.audio_path
    ? buildPrivateMediaUrl("audio-posts", post.audio_path)
    : post.audio_url;

  const isGif = resolvedImageUrl?.toLowerCase().includes(".gif") ?? false;
  const isProxied = resolvedImageUrl?.startsWith("/media/") ?? false;

  const formattedDate = new Date(post.date).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          #{rank}
        </span>
        <Link
          href={profilePath(profile.username)}
          className="flex items-center gap-2 hover:opacity-80"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.username}
                width={28}
                height={28}
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              profile.username[0].toUpperCase()
            )}
          </div>
          <span className="text-sm font-medium">
            @{profile.username}
          </span>
        </Link>
        <span className="ml-auto text-xs text-muted-foreground">
          {formattedDate}
        </span>
      </div>

      {resolvedAudioUrl ? (
        <AudioPlayer src={resolvedAudioUrl} durationMs={post.audio_duration_ms} />
      ) : resolvedImageUrl ? (
        <div className="relative w-full">
          <Image
            src={resolvedImageUrl}
            alt={post.caption || "Top Meme"}
            width={800}
            height={600}
            className="w-full object-contain"
            style={{ maxHeight: "500px" }}
            unoptimized={isGif || isProxied}
          />
        </div>
      ) : null}

      <div className="px-4 py-3">
        <div className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
          <ArrowBigUp className="h-5 w-5 fill-primary" />
          <span className="tabular-nums">{formatNumber(post.upvote_count)}</span>
        </div>
        {post.caption && (
          <p className="mt-2 text-sm">
            <Link
              href={profilePath(profile.username)}
              className="font-medium hover:underline"
            >
              {profile.username}
            </Link>{" "}
            {post.caption}
          </p>
        )}

        {/* Top Comments */}
        {post.top_comments && post.top_comments.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-border pt-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MessageCircle className="h-3.5 w-3.5" />
              Top Kommentare
            </div>
            {post.top_comments.map((comment, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <span className="font-medium">@{comment.username}</span>{" "}
                  <span className="text-muted-foreground">{comment.text}</span>
                </div>
                {comment.upvote_count > 0 && (
                  <span className="flex shrink-0 items-center gap-0.5 text-xs text-primary">
                    <ArrowBigUp className="h-3.5 w-3.5 fill-primary" />
                    {formatNumber(comment.upvote_count)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
