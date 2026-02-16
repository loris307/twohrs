"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { PostCard } from "@/components/feed/post-card";
import { MentionsList } from "./mentions-list";
import type { PostWithAuthor } from "@/lib/types";

interface ProfileTabsProps {
  isOwnProfile: boolean;
  userId: string;
  posts: PostWithAuthor[];
  currentUserId?: string;
  isAdmin?: boolean;
  hasUnreadMentions?: boolean;
}

export function ProfileTabs({
  isOwnProfile,
  userId,
  posts,
  currentUserId,
  isAdmin,
  hasUnreadMentions,
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<"posts" | "mentions">("posts");

  const tabs = [
    { id: "posts" as const, label: "Posts" },
    ...(isOwnProfile
      ? [{ id: "mentions" as const, label: "Erwähnungen" }]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      {isOwnProfile && (
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-2.5 text-center text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="relative inline-flex items-center">
                {tab.label}
                {tab.id === "mentions" && hasUnreadMentions && activeTab !== "mentions" && (
                  <span className="ml-1.5 h-2 w-2 rounded-full bg-orange-500" />
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      {activeTab === "posts" && (
        <>
          {posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Noch keine Posts heute
            </p>
          )}
        </>
      )}

      {activeTab === "mentions" && isOwnProfile && (
        <MentionsList userId={userId} currentUserId={currentUserId} />
      )}
    </div>
  );
}
