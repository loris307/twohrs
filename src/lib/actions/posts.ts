"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAppOpen } from "@/lib/utils/time";
import { MAX_POSTS_PER_SESSION, MAX_CAPTION_LENGTH } from "@/lib/constants";
import type { ActionResult } from "@/lib/types";

export async function createPost(formData: FormData): Promise<ActionResult> {
  // Time-gate check (Server Action layer)
  if (!isAppOpen()) {
    return { success: false, error: "Die App ist gerade geschlossen" };
  }

  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  // Rate limit check
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfDay.toISOString());

  if ((count ?? 0) >= MAX_POSTS_PER_SESSION) {
    return {
      success: false,
      error: `Maximal ${MAX_POSTS_PER_SESSION} Posts pro Tag erlaubt`,
    };
  }

  // Get image from formData
  const imageFile = formData.get("image") as File | null;
  const caption = (formData.get("caption") as string) || null;

  if (!imageFile || imageFile.size === 0) {
    return { success: false, error: "Bild ist erforderlich" };
  }

  if (caption && caption.length > MAX_CAPTION_LENGTH) {
    return {
      success: false,
      error: `Caption darf maximal ${MAX_CAPTION_LENGTH} Zeichen haben`,
    };
  }

  // Upload image to Supabase Storage
  const fileExt = imageFile.name.split(".").pop() || "jpg";
  const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("memes")
    .upload(fileName, imageFile, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return { success: false, error: "Bild-Upload fehlgeschlagen: " + uploadError.message };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("memes").getPublicUrl(fileName);

  // Create post in database
  const { error: insertError } = await supabase.from("posts").insert({
    user_id: user.id,
    image_url: publicUrl,
    image_path: fileName,
    caption,
  });

  if (insertError) {
    // Cleanup uploaded image on failure
    await supabase.storage.from("memes").remove([fileName]);
    return { success: false, error: "Post erstellen fehlgeschlagen" };
  }

  // Increment total_posts_created
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("total_posts_created")
    .eq("id", user.id)
    .single();

  if (currentProfile) {
    await supabase
      .from("profiles")
      .update({
        total_posts_created: currentProfile.total_posts_created + 1,
      })
      .eq("id", user.id);
  }

  redirect("/feed");
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  // Get the post to find image_path
  const { data: post } = await supabase
    .from("posts")
    .select("image_path, user_id")
    .eq("id", postId)
    .single();

  if (!post) {
    return { success: false, error: "Post nicht gefunden" };
  }

  if (post.user_id !== user.id) {
    return { success: false, error: "Nicht berechtigt" };
  }

  // Delete from storage
  await supabase.storage.from("memes").remove([post.image_path]);

  // Delete from database
  const { error } = await supabase.from("posts").delete().eq("id", postId);

  if (error) {
    return { success: false, error: "Löschen fehlgeschlagen" };
  }

  return { success: true };
}
