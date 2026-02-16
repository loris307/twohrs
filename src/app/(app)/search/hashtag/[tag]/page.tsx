import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getFeedByHashtag, isHashtagFollowed } from "@/lib/queries/posts";
import { HashtagFollowButton } from "@/components/shared/hashtag-follow-button";
import { HashtagPostGrid } from "./hashtag-post-grid";

interface HashtagPageProps {
  params: Promise<{ tag: string }>;
}

export default async function HashtagPage({ params }: HashtagPageProps) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag).toLowerCase();

  return (
    <div className="space-y-4">
      <Link
        href="/search"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Entdecken
      </Link>

      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
          </div>
        }
      >
        <HashtagContent tag={decodedTag} />
      </Suspense>
    </div>
  );
}

async function HashtagContent({ tag }: { tag: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.is_admin ?? false;
  }

  const [{ posts, nextCursor }, followed] = await Promise.all([
    getFeedByHashtag(tag),
    isHashtagFollowed(tag),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">#{tag}</h1>
          <p className="text-sm text-muted-foreground">
            {posts.length} {posts.length === 1 ? "Post" : "Posts"} heute
          </p>
        </div>
        <HashtagFollowButton
          hashtag={tag}
          initialFollowed={followed}
          size="md"
        />
      </div>

      {posts.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg font-medium">Keine Posts</p>
          <p className="mt-1 text-muted-foreground">
            Heute hat noch niemand #{tag} benutzt.
          </p>
        </div>
      ) : (
        <HashtagPostGrid
          initialPosts={posts}
          initialCursor={nextCursor}
          hashtag={tag}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
