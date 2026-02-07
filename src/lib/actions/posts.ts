"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
  const hasImage = imageFile && imageFile.size > 0;

  if (!hasImage && !caption?.trim()) {
    return { success: false, error: "Mindestens ein Bild oder Text ist erforderlich" };
  }

  if (caption && caption.length > MAX_CAPTION_LENGTH) {
    return {
      success: false,
      error: `Caption darf maximal ${MAX_CAPTION_LENGTH} Zeichen haben`,
    };
  }

  let publicUrl: string | null = null;
  let fileName: string | null = null;

  // Upload image if present
  if (hasImage) {
    const fileExt = imageFile.name.split(".").pop() || "jpg";
    fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("memes")
      .upload(fileName, imageFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: "Bild-Upload fehlgeschlagen: " + uploadError.message };
    }

    publicUrl = supabase.storage.from("memes").getPublicUrl(fileName).data.publicUrl;
  }

  // Create post in database
  const { error: insertError } = await supabase.from("posts").insert({
    user_id: user.id,
    image_url: publicUrl,
    image_path: fileName,
    caption,
  });

  if (insertError) {
    // Cleanup uploaded image on failure
    if (fileName) {
      await supabase.storage.from("memes").remove([fileName]);
    }
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

  revalidatePath("/feed");
  redirect("/feed");
}

export async function createPostRecord(
  imageUrl: string | null,
  imagePath: string | null,
  caption: string | null,
  ogData?: { ogTitle?: string; ogDescription?: string; ogImage?: string; ogUrl?: string }
): Promise<ActionResult> {
  if (!isAppOpen()) {
    return { success: false, error: "Die App ist gerade geschlossen" };
  }

  // At least caption or image required
  if (!imageUrl && !caption?.trim()) {
    return { success: false, error: "Mindestens ein Bild oder Text ist erforderlich" };
  }

  const supabase = await createClient();

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

  if (caption && caption.length > MAX_CAPTION_LENGTH) {
    return {
      success: false,
      error: `Caption darf maximal ${MAX_CAPTION_LENGTH} Zeichen haben`,
    };
  }

  const { error: insertError } = await supabase.from("posts").insert({
    user_id: user.id,
    image_url: imageUrl,
    image_path: imagePath,
    caption,
    og_title: ogData?.ogTitle || null,
    og_description: ogData?.ogDescription || null,
    og_image: ogData?.ogImage || null,
    og_url: ogData?.ogUrl || null,
  });

  if (insertError) {
    console.error("Post insert failed:", insertError.message);
    if (imagePath) {
      await supabase.storage.from("memes").remove([imagePath]);
    }
    return { success: false, error: "Post erstellen fehlgeschlagen: " + insertError.message };
  }

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

  revalidatePath("/feed");
  return { success: true };
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

  // Delete from storage (only if image exists)
  if (post.image_path) {
    await supabase.storage.from("memes").remove([post.image_path]);
  }

  // Delete from database
  const { error } = await supabase.from("posts").delete().eq("id", postId);

  if (error) {
    return { success: false, error: "Löschen fehlgeschlagen" };
  }

  return { success: true };
}
