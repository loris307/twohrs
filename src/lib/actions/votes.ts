"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAppOpen } from "@/lib/utils/time";
import type { ActionResult } from "@/lib/types";

export async function toggleVote(
  postId: string
): Promise<ActionResult<{ voted: boolean }>> {
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

  // Check if vote exists
  const { data: existingVote } = await supabase
    .from("votes")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .single();

  if (existingVote) {
    // Remove vote
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("id", existingVote.id);

    if (error) {
      return { success: false, error: "Vote entfernen fehlgeschlagen" };
    }

    revalidatePath("/feed");
    return { success: true, data: { voted: false } };
  } else {
    // Add vote
    const { error } = await supabase.from("votes").insert({
      user_id: user.id,
      post_id: postId,
    });

    if (error) {
      return { success: false, error: "Vote fehlgeschlagen" };
    }

    revalidatePath("/feed");
    return { success: true, data: { voted: true } };
  }
}
