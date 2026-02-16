"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Hash } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { HashtagFollowButton } from "@/components/shared/hashtag-follow-button";

interface SearchResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface HashtagResult {
  hashtag: string;
  postCount: number;
  isFollowed: boolean;
}

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [userResults, setUserResults] = useState<SearchResult[]>([]);
  const [hashtagResults, setHashtagResults] = useState<HashtagResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isHashtagSearch = query.trimStart().startsWith("#");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setUserResults([]);
      setHashtagResults([]);
      setSearched(false);
      return;
    }

    // For hashtag search, need at least # + 1 char
    if (isHashtagSearch && trimmed.length < 2) {
      setHashtagResults([]);
      setSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`
        );
        const data = await res.json();

        if (isHashtagSearch) {
          setHashtagResults(data.hashtags ?? []);
          setUserResults([]);
        } else {
          setUserResults(data.users ?? []);
          setHashtagResults([]);
        }
      } catch {
        setUserResults([]);
        setHashtagResults([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isHashtagSearch]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Benutzer oder #Hashtag suchen..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4 text-base outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        </div>
      )}

      {/* Hashtag results */}
      {!loading && hashtagResults.length > 0 && (
        <div className="divide-y divide-border rounded-lg border border-border">
          {hashtagResults.map((result) => (
            <div
              key={result.hashtag}
              className="flex items-center justify-between px-4 py-3"
            >
              <Link
                href={`/search/hashtag/${result.hashtag}`}
                className="flex min-w-0 flex-1 items-center gap-3 transition-colors hover:text-primary"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Hash className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    #{result.hashtag}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {result.postCount} {result.postCount === 1 ? "Post" : "Posts"}
                  </p>
                </div>
              </Link>
              <HashtagFollowButton
                hashtag={result.hashtag}
                initialFollowed={result.isFollowed}
              />
            </div>
          ))}
        </div>
      )}

      {/* User results */}
      {!loading && userResults.length > 0 && (
        <div className="divide-y divide-border rounded-lg border border-border">
          {userResults.map((user) => (
            <Link
              key={user.id}
              href={`/profile/${user.username}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.username}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  user.username[0].toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {user.display_name || user.username}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  @{user.username}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Empty states */}
      {!loading && searched && isHashtagSearch && hashtagResults.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Keine Hashtags gefunden
        </p>
      )}

      {!loading && searched && !isHashtagSearch && userResults.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Keine Benutzer gefunden
        </p>
      )}
    </div>
  );
}
