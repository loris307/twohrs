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

  // Only redirect to feed if logged in AND app is open
  if (user && isAppOpen()) {
    redirect("/feed");
  }

  const [yesterdayTopPost, { count: userCount }] = await Promise.all([
    getLatestTopPost(),
    createAdminClient().from("profiles").select("*", { count: "exact", head: true }),
  ]);

  return <LandingContent isLoggedIn={!!user} yesterdayTopPost={yesterdayTopPost} userCount={userCount ?? 0} />;
}
