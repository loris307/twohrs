"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const tabs = [
  { key: "winners", label: "Tagessieger" },
  { key: "followers", label: "Meiste Follower" },
] as const;

export type ArchiveTab = (typeof tabs)[number]["key"];

export function ArchiveTabs({ active }: { active: ArchiveTab }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleTabChange(tab: ArchiveTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "winners") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(`/leaderboard/history${query ? `?${query}` : ""}`, {
      scroll: false,
    });
  }

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => handleTabChange(tab.key)}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            active === tab.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
