"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function markMentionsSeen(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ last_mentions_seen_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: "Fehler beim Aktualisieren" };
  }

  return { success: true };
}
