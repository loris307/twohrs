import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  // Get the user's profile for the username, admin status, and moderation strikes
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, is_admin, moderation_strikes")
    .eq("id", user.id)
    .single();

  const unreadMentionCount = await getUnreadMentionCount(user.id);

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
