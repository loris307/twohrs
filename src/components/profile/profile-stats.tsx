import { ArrowBigUp, ImageIcon, Trophy } from "lucide-react";
import { formatNumber } from "@/lib/utils/format";
import type { Profile } from "@/lib/types";

interface ProfileStatsProps {
  profile: Profile;
}

export function ProfileStats({ profile }: ProfileStatsProps) {
  const stats = [
    {
      icon: ArrowBigUp,
      label: "Upvotes erhalten",
      value: formatNumber(profile.total_upvotes_received),
    },
    {
      icon: ImageIcon,
      label: "Posts erstellt",
      value: formatNumber(profile.total_posts_created),
    },
    {
      icon: Trophy,
      label: "Tage gewonnen",
      value: formatNumber(profile.days_won),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="flex flex-col items-center gap-1 rounded-lg border border-border p-4"
          >
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-bold tabular-nums">
              {stat.value}
            </span>
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
        );
      })}
    </div>
  );
}
