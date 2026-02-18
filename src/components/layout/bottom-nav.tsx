"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, PlusSquare, User, Compass } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function BottomNav({
  username,
  mentionCount = 0,
}: {
  username?: string;
  mentionCount?: number;
}) {
  const pathname = usePathname();

  const items = [
    { href: "/feed", label: "Feed", icon: Home },
    { href: "/leaderboard", label: "Ranking", icon: Trophy },
    { href: "/create", label: "Posten", icon: PlusSquare },
    {
      href: username ? `/profile/${username}` : "/settings",
      label: "Profil",
      icon: User,
      badge: mentionCount,
    },
    { href: "/search", label: "Entdecken", icon: Compass },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur md:hidden supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-around py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const badge = "badge" in item ? item.badge : 0;
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {!!badge && badge > 0 && (
                <span className="absolute -right-0.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-black">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
