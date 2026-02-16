import Image from "next/image";
import Link from "next/link";
import type { Profile } from "@/lib/types";

interface FollowListProps {
  users: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">[];
  emptyMessage: string;
}

export function FollowList({ users, emptyMessage }: FollowListProps) {
  if (users.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {users.map((user) => (
        <Link
          key={user.id}
          href={`/profile/${user.username}`}
          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold">
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
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {user.display_name || user.username}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              @{user.username}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
