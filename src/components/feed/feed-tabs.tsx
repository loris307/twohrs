import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { Users, Flame, Radio } from "lucide-react";
import type { FeedTab } from "@/lib/constants";

const tabs: { value: FeedTab; label: string; icon: typeof Users }[] = [
  { value: "following", label: "Folgend", icon: Users },
  { value: "hot", label: "Hot", icon: Flame },
  { value: "live", label: "Live", icon: Radio },
];

interface FeedTabsProps {
  activeTab: FeedTab;
}

export function FeedTabs({ activeTab }: FeedTabsProps) {
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.value;
        const href =
          tab.value === "live" ? "/feed" : `/feed?tab=${tab.value}`;

        return (
          <Link
            key={tab.value}
            href={href}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
