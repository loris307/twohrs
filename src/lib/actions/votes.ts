"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAppOpen } from "@/lib/utils/time";
import { uuidSchema } from "@/lib/validations";
import type { ActionResult } from "@/lib/types";

export async function toggleVote(
  postId: string
): Promise<ActionResult<{ voted: boolean }>> {
  if (!uuidSchema.safeParse(postId).success) {
    return { success: false, error: "Ungültige Post-ID" };
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

  // Atomic vote toggle via DB function (prevents race conditions + self-voting)
  const { data: voted, error } = await supabase.rpc("toggle_vote", {
    p_user_id: user.id,
    p_post_id: postId,
  });

  if (error) {
    if (error.message.includes("Cannot vote on own post")) {
      return { success: false, error: "Du kannst deinen eigenen Post nicht upvoten" };
    }
    return { success: false, error: "Vote fehlgeschlagen" };
  }

  revalidatePath("/feed");
  return { success: true, data: { voted: voted as boolean } };
}
