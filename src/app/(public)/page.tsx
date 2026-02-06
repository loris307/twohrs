import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAppOpen } from "@/lib/utils/time";
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

  return <LandingContent isLoggedIn={!!user} />;
}
