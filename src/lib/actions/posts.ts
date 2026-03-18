"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAppOpen } from "@/lib/utils/time";
import { MAX_POSTS_PER_SESSION, MAX_CAPTION_LENGTH } from "@/lib/constants";
import { extractMentions } from "@/lib/utils/mentions";
import { extractHashtags } from "@/lib/utils/hashtags";
import { normalizeText } from "@/lib/utils/normalize-text";
import { detectImageMime, getExtensionFromMime } from "@/lib/utils/magic-bytes";
import { uuidSchema } from "@/lib/validations";
import type { ActionResult } from "@/lib/types";

function isOwnedStoragePath(path: string, userId: string): boolean {
  const normalizedPath = path.replace(/^\/+/, "");
  return (
    normalizedPath.startsWith(`${userId}/`) &&
    !normalizedPath.includes("..") &&
    !normalizedPath.includes("\\")
  );
}

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

  // Rate limit check (Berlin timezone to align with session window)
  const berlinNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const startOfDay = new Date(berlinNow);
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
  const rawCaption = (formData.get("caption") as string) || null;
  const caption = rawCaption ? normalizeText(rawCaption) : null;
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
  let cleanBuffer: Buffer | null = null;
  let detectedMime: string | null = null;

  // Validate and sanitize image locally before moderation/upload.
  if (hasImage) {
    const imageBuffer = await imageFile.arrayBuffer();
    detectedMime = detectImageMime(imageBuffer);
    if (!detectedMime) {
      return { success: false, error: "Ungültiger Dateityp. Nur JPEG, PNG, GIF und WebP erlaubt." };
    }

    const fileExt = getExtensionFromMime(detectedMime);
    fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

    // Strip EXIF metadata (GPS, camera info) before upload
    const { stripExifMetadata } = await import("@/lib/utils/strip-exif");
    cleanBuffer = await stripExifMetadata(Buffer.from(imageBuffer), detectedMime);
  }

  const { checkPostContent } = await import("@/lib/moderation/check-content");
  const contentCheck = await checkPostContent(cleanBuffer, caption);

  if (!contentCheck.allowed) {
    const { addModerationStrike } = await import("@/lib/moderation/strikes");
    const strikeOptions = contentCheck.type === "nsfw_image"
      ? { column: "nsfw_strikes" as const }
      : undefined;
    const { accountDeleted } = await addModerationStrike(user.id, strikeOptions);

    if (accountDeleted) {
      return { success: false, error: "Dein Account wurde gesperrt." };
    }

    return {
      success: false,
      error: contentCheck.type === "blocked_domain"
        ? "Dieser Link ist nicht erlaubt."
        : "Dieses Bild verstößt gegen unsere Richtlinien.",
    };
  }

  if (cleanBuffer && fileName && detectedMime) {
    const { error: uploadError } = await supabase.storage
      .from("memes")
      .upload(fileName, cleanBuffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: detectedMime,
      });

    if (uploadError) {
      console.error("Image upload failed:", uploadError.message);
      return { success: false, error: "Bild-Upload fehlgeschlagen" };
    }

    publicUrl = supabase.storage.from("memes").getPublicUrl(fileName).data.publicUrl;
  }

  // Create post in database
  const { data: newPost, error: insertError } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      image_url: publicUrl,
      image_path: fileName,
      caption,
    })
    .select("id")
    .single();

  if (insertError || !newPost) {
    // Cleanup uploaded image on failure
    if (fileName) {
      await supabase.storage.from("memes").remove([fileName]);
    }
    return { success: false, error: "Post erstellen fehlgeschlagen" };
  }

  // Extract and store @mentions (admin client bypasses RLS)
  if (caption) {
    const usernames = extractMentions(caption);
    if (usernames.length > 0) {
      const admin = createAdminClient();
      const { data: mentionedUsers } = await admin
        .from("profiles")
        .select("id, username")
        .in("username", usernames.slice(0, 10));

      if (mentionedUsers && mentionedUsers.length > 0) {
        const mentionRows = mentionedUsers.map((u) => ({
          mentioned_user_id: u.id,
          mentioning_user_id: user.id,
          post_id: newPost.id,
        }));

        await admin.from("mentions").insert(mentionRows);
      }
    }

    // Extract and store #hashtags
    const hashtags = extractHashtags(caption);
    if (hashtags.length > 0) {
      const adminForTags = createAdminClient();
      await adminForTags.from("post_hashtags").insert(
        hashtags.slice(0, 10).map((tag) => ({ post_id: newPost.id, hashtag: tag }))
      );
    }
  }

  // Atomic increment total_posts_created (prevents race condition)
  await supabase.rpc("increment_posts_created", { p_user_id: user.id });

  revalidatePath("/feed");
  redirect("/feed");
}

export async function createPostRecord(
  imagePath: string | null,
  rawCaption: string | null,
  ogData?: { ogTitle?: string; ogDescription?: string; ogImage?: string; ogUrl?: string }
): Promise<ActionResult> {
  if (!isAppOpen()) {
    return { success: false, error: "Die App ist gerade geschlossen" };
  }

  const caption = rawCaption ? normalizeText(rawCaption) : null;

  // At least caption or image required
  if (!imagePath && !caption?.trim()) {
    return { success: false, error: "Mindestens ein Bild oder Text ist erforderlich" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  // Rate limit check (Berlin timezone to align with session window)
  const berlinNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const startOfDay = new Date(berlinNow);
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

  let ownedImagePath: string | null = null;
  let imageBuffer: Buffer | null = null;
  let publicUrl: string | null = null;

  if (imagePath) {
    const normalizedImagePath = imagePath.replace(/^\/+/, "");
    if (!isOwnedStoragePath(normalizedImagePath, user.id)) {
      return { success: false, error: "Ungültiger Bildpfad" };
    }

    ownedImagePath = normalizedImagePath;

    const { data: storedImage, error: downloadError } = await supabase.storage
      .from("memes")
      .download(ownedImagePath);

    if (downloadError || !storedImage) {
      console.error("Stored image download failed:", downloadError?.message);
      return { success: false, error: "Bild konnte nicht geladen werden" };
    }

    const storedArrayBuffer = await storedImage.arrayBuffer();
    imageBuffer = Buffer.from(storedArrayBuffer);

    if (!detectImageMime(storedArrayBuffer)) {
      await supabase.storage.from("memes").remove([ownedImagePath]);
      return { success: false, error: "Ungültiger Dateityp. Nur JPEG, PNG, GIF und WebP erlaubt." };
    }

    publicUrl = supabase.storage.from("memes").getPublicUrl(ownedImagePath).data.publicUrl;
  }

  const { checkPostContent } = await import("@/lib/moderation/check-content");
  const contentCheck = await checkPostContent(imageBuffer, caption);

  if (!contentCheck.allowed) {
    if (ownedImagePath) {
      await supabase.storage.from("memes").remove([ownedImagePath]);
    }

    // Add strike: domain violations use admin strikes (3), NSFW uses separate counter (100)
    const { addModerationStrike } = await import("@/lib/moderation/strikes");
    const strikeOptions = contentCheck.type === "nsfw_image"
      ? { column: "nsfw_strikes" as const }
      : undefined;
    const { accountDeleted } = await addModerationStrike(user.id, strikeOptions);

    if (accountDeleted) {
      return { success: false, error: "Dein Account wurde gesperrt." };
    }

    return {
      success: false,
      error: contentCheck.type === "blocked_domain"
        ? "Dieser Link ist nicht erlaubt."
        : "Dieses Bild verstößt gegen unsere Richtlinien.",
    };
  }

  const { data: newPost, error: insertError } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      image_url: publicUrl,
      image_path: ownedImagePath,
      caption,
      og_title: ogData?.ogTitle || null,
      og_description: ogData?.ogDescription || null,
      og_image: ogData?.ogImage || null,
      og_url: ogData?.ogUrl || null,
    })
    .select("id")
    .single();

  if (insertError || !newPost) {
    console.error("Post insert failed:", insertError?.message);
    if (ownedImagePath) {
      await supabase.storage.from("memes").remove([ownedImagePath]);
    }
    return { success: false, error: "Post konnte nicht erstellt werden" };
  }

  // Extract and store @mentions (admin client bypasses RLS)
  if (caption) {
    const usernames = extractMentions(caption);
    if (usernames.length > 0) {
      const admin = createAdminClient();
      const { data: mentionedUsers } = await admin
        .from("profiles")
        .select("id, username")
        .in("username", usernames.slice(0, 10));

      if (mentionedUsers && mentionedUsers.length > 0) {
        const mentionRows = mentionedUsers.map((u) => ({
          mentioned_user_id: u.id,
          mentioning_user_id: user.id,
          post_id: newPost.id,
        }));

        await admin.from("mentions").insert(mentionRows);
      }
    }

    // Extract and store #hashtags
    const hashtags = extractHashtags(caption);
    if (hashtags.length > 0) {
      const adminForTags = createAdminClient();
      await adminForTags.from("post_hashtags").insert(
        hashtags.slice(0, 10).map((tag) => ({ post_id: newPost.id, hashtag: tag }))
      );
    }
  }

  // Atomic increment total_posts_created (prevents race condition)
  await supabase.rpc("increment_posts_created", { p_user_id: user.id });

  revalidatePath("/feed");
  return { success: true };
}

export async function deletePost(postId: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(postId).success) {
    return { success: false, error: "Ungültige Post-ID" };
  }

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
