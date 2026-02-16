"use client";

import { useUserCount } from "@/lib/hooks/use-online-users";

export function ActiveUsersCount() {
  const count = useUserCount();

  if (count === 0) return null;

  return (
    <span className="text-muted-foreground">
      {count} User
    </span>
  );
}
