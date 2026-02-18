import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function isSafeRedirect(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("@") && !path.includes(":");
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/feed";
  const next = isSafeRedirect(rawNext) ? rawNext : "/feed";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/login?error=callback`);
}
