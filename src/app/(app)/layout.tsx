import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPrivateProfileById } from "@/lib/queries/private-profile";
import { getUnreadMentionCount } from "@/lib/queries/mentions";
import { getRecoveryEmailStatus } from "@/lib/utils/auth-email";
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

  const recoveryEmailStatus = getRecoveryEmailStatus(user);
  const showRecoveryBanner =
    recoveryEmailStatus === "missing_recovery_email" ||
    recoveryEmailStatus === "pending_first_email";

  return (
    <AppShell
      userId={user.id}
      username={profile?.username}
      unreadMentionCount={unreadMentionCount}
      moderationStrikes={profile?.moderation_strikes ?? 0}
      isAdmin={profile?.is_admin ?? false}
      showRecoveryBanner={showRecoveryBanner}
    >
      {children}
    </AppShell>
  );
}
