"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, PlusSquare, User, Settings } from "lucide-react";
import { SessionTimer } from "@/components/countdown/session-timer";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/create", label: "Posten", icon: PlusSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Navbar({ username }: { username?: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/feed" className="text-xl font-bold tracking-tight">
          2<span className="text-primary">Hours</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {username && (
            <Link
              href={`/profile/${username}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname.startsWith("/profile/")
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <User className="h-4 w-4" />
              Profil
            </Link>
          )}
        </nav>

        <SessionTimer />
      </div>
    </header>
  );
}
