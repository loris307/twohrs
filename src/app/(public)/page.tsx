import { createElement } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCachedLandingSnapshot } from "@/lib/queries/landing";
import { isAppOpen } from "@/lib/utils/time";
import { LandingContent } from "./landing-content";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && isAppOpen()) {
    redirect("/feed");
  }

  const { yesterdayTopPost, userCount } = await getCachedLandingSnapshot();

  return createElement(LandingContent, {
    isLoggedIn: !!user,
    isAdminOnly: false,
    yesterdayTopPost,
    userCount,
  });
}
