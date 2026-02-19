"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  updateProfileSchema,
  changePasswordSchema,
} from "@/lib/validations";
import { detectImageMime, getExtensionFromMime } from "@/lib/utils/magic-bytes";
import { MAX_AVATAR_SIZE_BYTES, MAX_AVATAR_SIZE_MB } from "@/lib/constants";
import type { ActionResult } from "@/lib/types";

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  const rawData = {
    displayName: (formData.get("displayName") as string) || undefined,
    bio: (formData.get("bio") as string) || undefined,
  };

  const parsed = updateProfileSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName || null,
      bio: parsed.data.bio || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: "Profil-Update fehlgeschlagen" };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function updateAvatar(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  const avatarFile = formData.get("avatar") as File | null;
  if (!avatarFile || avatarFile.size === 0) {
    return { success: false, error: "Kein Bild ausgewählt" };
  }

  // File size check
  if (avatarFile.size > MAX_AVATAR_SIZE_BYTES) {
    return { success: false, error: `Bild ist zu groß. Maximal ${MAX_AVATAR_SIZE_MB} MB erlaubt.` };
  }

  // Server-side magic-byte validation
  const avatarBuffer = await avatarFile.arrayBuffer();
  const detectedMime = detectImageMime(avatarBuffer);
  if (!detectedMime) {
    return { success: false, error: "Ungültiger Dateityp. Nur JPEG, PNG und WebP erlaubt." };
  }

  // Strip EXIF metadata (GPS, camera info) before upload
  const { stripExifMetadata } = await import("@/lib/utils/strip-exif");
  const rawBuffer = Buffer.from(avatarBuffer);
  const cleanBuffer = await stripExifMetadata(rawBuffer, avatarFile.type);

  // NSFW check (fail-closed: reject on error)
  try {
    const { classifyImage } = await import("@/lib/moderation/nsfw");
    const result = await classifyImage(cleanBuffer);
    if (result.isNsfw) {
      const { addModerationStrike } = await import("@/lib/moderation/strikes");
      const { accountDeleted } = await addModerationStrike(user.id, { column: "nsfw_strikes" });
      if (accountDeleted) {
        return { success: false, error: "Dein Account wurde gesperrt." };
      }
      return { success: false, error: "Dieses Bild verstößt gegen unsere Richtlinien." };
    }
  } catch {
    console.error("NSFW check failed for avatar, rejecting as safety fallback");
    return { success: false, error: "Bild konnte nicht überprüft werden. Bitte versuche es erneut." };
  }

  // Delete all existing avatar files (handles extension changes, e.g. avatar.png → avatar.jpg)
  const { data: existingFiles } = await supabase.storage
    .from("avatars")
    .list(user.id);

  if (existingFiles && existingFiles.length > 0) {
    await supabase.storage
      .from("avatars")
      .remove(existingFiles.map((f) => `${user.id}/${f.name}`));
  }

  const fileExt = getExtensionFromMime(detectedMime);
  const fileName = `${user.id}/avatar.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, cleanBuffer, {
      cacheControl: "3600",
      upsert: true,
      contentType: detectedMime,
    });

  if (uploadError) {
    return { success: false, error: "Avatar-Upload fehlgeschlagen" };
  }

  // Cache-busting: append timestamp so browsers/CDN don't serve stale image
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(fileName);
  const avatarUrlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      avatar_url: avatarUrlWithCacheBust,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return { success: false, error: "Avatar-Update fehlgeschlagen" };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function removeAvatar(): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  const { data: files } = await supabase.storage
    .from("avatars")
    .list(user.id);

  if (files && files.length > 0) {
    await supabase.storage
      .from("avatars")
      .remove(files.map((f) => `${user.id}/${f.name}`));
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      avatar_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: "Avatar-Entfernung fehlgeschlagen" };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function changePassword(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword") as string,
    newPassword: formData.get("newPassword") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  // Verify current password by attempting sign-in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });

  if (signInError) {
    return { success: false, error: "Aktuelles Passwort ist falsch" };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (error) {
    console.error("Password change failed:", error.message);
    return { success: false, error: "Passwort-Änderung fehlgeschlagen" };
  }

  return { success: true };
}

export async function deleteAccount(): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();

  // Delete avatar files from storage
  const { data: avatarFiles } = await adminClient.storage
    .from("avatars")
    .list(user.id);

  if (avatarFiles && avatarFiles.length > 0) {
    await adminClient.storage
      .from("avatars")
      .remove(avatarFiles.map((f) => `${user.id}/${f.name}`));
  }

  // Delete meme files from storage (including user's regular posts)
  const { data: memeFiles } = await adminClient.storage
    .from("memes")
    .list(user.id);

  if (memeFiles && memeFiles.length > 0) {
    await adminClient.storage
      .from("memes")
      .remove(memeFiles.map((f) => `${user.id}/${f.name}`));
  }

  // Delete Hall of Fame images from storage (image_path references memes bucket)
  const { data: hallOfFameEntries } = await adminClient
    .from("top_posts_all_time")
    .select("image_path")
    .eq("user_id", user.id);

  if (hallOfFameEntries && hallOfFameEntries.length > 0) {
    const imagePaths = hallOfFameEntries
      .map((e) => e.image_path)
      .filter((p): p is string => p != null);

    if (imagePaths.length > 0) {
      await adminClient.storage.from("memes").remove(imagePaths);
    }
  }

  // Delete auth user (cascades to profiles -> everything else)
  const { error } = await adminClient.auth.admin.deleteUser(user.id);

  if (error) {
    return { success: false, error: "Account-Löschung fehlgeschlagen" };
  }

  await supabase.auth.signOut();

  return { success: true };
}
