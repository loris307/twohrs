"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, PlusSquare, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function BottomNav({ username }: { username?: string }) {
  const pathname = usePathname();

  const items = [
    { href: "/feed", label: "Feed", icon: Home },
    { href: "/leaderboard", label: "Ranking", icon: Trophy },
    { href: "/create", label: "Posten", icon: PlusSquare },
    {
      href: username ? `/profile/${username}` : "/settings",
      label: "Profil",
      icon: User,
    },
    { href: "/settings", label: "Mehr", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur md:hidden supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-around py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
