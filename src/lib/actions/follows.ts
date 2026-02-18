"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAppOpen } from "@/lib/utils/time";
import { uuidSchema } from "@/lib/validations";
import type { ActionResult } from "@/lib/types";

export async function followUser(followingId: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(followingId).success) {
    return { success: false, error: "Ungültige User-ID" };
  }

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

  if (user.id === followingId) {
    return { success: false, error: "Du kannst dir nicht selbst folgen" };
  }

  const { error } = await supabase.from("follows").insert({
    follower_id: user.id,
    following_id: followingId,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Du folgst diesem User bereits" };
    }
    return { success: false, error: "Folgen fehlgeschlagen" };
  }

  revalidatePath("/profile");
  return { success: true };
}

export async function unfollowUser(followingId: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(followingId).success) {
    return { success: false, error: "Ungültige User-ID" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", followingId);

  if (error) {
    return { success: false, error: "Entfolgen fehlgeschlagen" };
  }

  revalidatePath("/profile");
  return { success: true };
}
