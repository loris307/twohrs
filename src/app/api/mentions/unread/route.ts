import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUnreadMentionCount } from "@/lib/queries/mentions";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ count: 0 });
  }

  const count = await getUnreadMentionCount(user.id);
  return NextResponse.json({ count });
}
