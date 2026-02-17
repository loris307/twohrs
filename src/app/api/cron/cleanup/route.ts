import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function verifySecret(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!authHeader || !verifySecret(authHeader, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const { error } = await supabase.rpc("cleanup_daily_content");

    if (error) {
      console.error("Cleanup daily content failed:", error.message);
      return NextResponse.json(
        { error: "Cleanup failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Cleanup completed" });
  } catch {
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
