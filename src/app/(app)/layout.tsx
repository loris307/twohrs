import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPrivateProfileById } from "@/lib/queries/private-profile";
import { getUnreadMentionCount } from "@/lib/queries/mentions";
import { AppShell } from "./app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [profile, unreadMentionCount] = await Promise.all([
    getPrivateProfileById(user.id),
    getUnreadMentionCount(user.id),
  ]);

  return (
    <AppShell
      userId={user.id}
      username={profile?.username}
      unreadMentionCount={unreadMentionCount}
      moderationStrikes={profile?.moderation_strikes ?? 0}
    >
      {children}
    </AppShell>
  );
}
