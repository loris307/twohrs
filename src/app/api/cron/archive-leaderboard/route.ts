import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function verifySecret(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${cronSecret}`;
  if (!authHeader || !verifySecret(authHeader, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const { error } = await supabase.rpc("archive_daily_leaderboard");

    if (error) {
      console.error("Archive leaderboard failed:", error.message);
      return NextResponse.json(
        { error: "Archive failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Archive completed" });
  } catch {
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
