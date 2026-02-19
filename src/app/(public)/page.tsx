import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAppOpen } from "@/lib/utils/time";
import { getLatestTopPost } from "@/lib/queries/leaderboard";
import { LandingContent } from "./landing-content";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminOnly = process.env.ADMIN_ONLY_MODE === "true";

  // In admin-only mode, only redirect admins to feed
  if (user && isAppOpen()) {
    if (adminOnly) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (profile?.is_admin) {
        redirect("/feed");
      }
    } else {
      redirect("/feed");
    }
  }

  const [yesterdayTopPost, { count: userCount }] = await Promise.all([
    getLatestTopPost(),
    createAdminClient().from("profiles").select("*", { count: "exact", head: true }),
  ]);

  return <LandingContent isLoggedIn={!!user} isAdminOnly={adminOnly} yesterdayTopPost={yesterdayTopPost} userCount={userCount ?? 0} />;
}
