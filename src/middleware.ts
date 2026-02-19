import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  PUBLIC_ROUTES,
  ALWAYS_ACCESSIBLE_ROUTES,
  TIME_GATED_ROUTES,
  OPEN_HOUR,
  OPEN_MINUTE,
  CLOSE_HOUR,
  CLOSE_MINUTE,
  GRACE_MINUTES,
} from "@/lib/constants";
import { checkRateLimit, getRateLimitForPath } from "@/lib/utils/rate-limit";

function isTimeGatedRoute(pathname: string): boolean {
  return TIME_GATED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function isAlwaysAccessible(pathname: string): boolean {
  return ALWAYS_ACCESSIBLE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function isAppOpenServer(): boolean {
  // Server-side time check using Europe/Berlin timezone
  const now = new Date();
  const berlinTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Berlin" })
  );
  const hours = berlinTime.getHours();
  const minutes = berlinTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const openMinutes = OPEN_HOUR * 60 + OPEN_MINUTE;
  const closeMinutes = CLOSE_HOUR * 60 + CLOSE_MINUTE + GRACE_MINUTES;

  if (openMinutes <= closeMinutes) {
    // Same day (e.g., 20:00–22:00)
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  } else {
    // Crosses midnight (e.g., 23:00–02:00)
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limit API routes before anything else
  if (pathname.startsWith("/api")) {
    // Skip rate limiting for cron endpoints — they authenticate via Bearer token
    if (pathname.startsWith("/api/cron/")) {
      return NextResponse.next();
    }

    // Prefer x-real-ip (set by Vercel), fall back to last IP in x-forwarded-for
    // (last entry is the one the reverse proxy actually saw, earlier entries are spoofable)
    const ip =
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
      "unknown";
    const limit = getRateLimitForPath(pathname);
    const key = `${ip}:${pathname.split("/").slice(0, 4).join("/")}`;
    const result = checkRateLimit(key, limit);

    if (!result.allowed) {
      return new NextResponse("Too Many Requests", { status: 429 });
    }
    return NextResponse.next();
  }

  // Skip static files
  if (
    pathname.startsWith("/_next") ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|map)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Update Supabase session
  const { user, supabase, supabaseResponse } = await updateSession(request);

  // Public routes: always accessible, no auth needed
  if (isPublicRoute(pathname)) {
    return supabaseResponse;
  }

  // Redirect unauthenticated users to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Admin-only mode: block non-admin users from all authenticated routes
  if (process.env.ADMIN_ONLY_MODE === "true") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("admin_only", "true");
      return NextResponse.redirect(url);
    }
  }

  // Always accessible routes for authenticated users (settings, leaderboard history, profile stats)
  if (isAlwaysAccessible(pathname)) {
    return supabaseResponse;
  }

  // Time-gated routes: check if app is open
  if (isTimeGatedRoute(pathname) || pathname.startsWith("/profile/")) {
    if (!isAppOpenServer()) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("closed", "true");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
