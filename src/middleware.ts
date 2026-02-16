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

  // Skip static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Update Supabase session
  const { user, supabaseResponse } = await updateSession(request);

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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
