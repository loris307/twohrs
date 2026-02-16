"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAppOpen } from "@/lib/utils/time";
import type { ActionResult } from "@/lib/types";

export async function followHashtag(hashtag: string): Promise<ActionResult> {
  if (!isAppOpen()) {
    return { success: false, error: "Die App ist gerade geschlossen" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  const normalized = hashtag.toLowerCase().trim();
  if (!normalized || normalized.length > 50) {
    return { success: false, error: "Ungültiger Hashtag" };
  }

  const { error } = await supabase.from("hashtag_follows").insert({
    user_id: user.id,
    hashtag: normalized,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Du folgst diesem Hashtag bereits" };
    }
    return { success: false, error: "Hashtag folgen fehlgeschlagen" };
  }

  revalidatePath("/feed");
  return { success: true };
}

export async function unfollowHashtag(hashtag: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  const { error } = await supabase
    .from("hashtag_follows")
    .delete()
    .eq("user_id", user.id)
    .eq("hashtag", hashtag.toLowerCase().trim());

  if (error) {
    return { success: false, error: "Hashtag entfolgen fehlgeschlagen" };
  }

  revalidatePath("/feed");
  return { success: true };
}
