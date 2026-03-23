"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  updateProfileSchema,
  changePasswordSchema,
  setRecoveryEmailSchema,
  deleteAccountSchema,
} from "@/lib/validations";
import { normalizeText } from "@/lib/utils/normalize-text";
import { detectImageMime, getExtensionFromMime } from "@/lib/utils/magic-bytes";
import { hasEmailIdentity } from "@/lib/utils/auth-email";
import { checkEmailPolicy } from "@/lib/utils/signup-guards";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { getOwnedMemesFolderPrefixes } from "@/lib/utils/private-media";
import { MAX_AVATAR_SIZE_BYTES, MAX_AVATAR_SIZE_MB, getBaseUrl } from "@/lib/constants";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/public-env";
import type { ActionResult } from "@/lib/types";

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  const rawDisplayName = (formData.get("displayName") as string) || undefined;
  const rawBio = (formData.get("bio") as string) || undefined;

  const rawData = {
    displayName: rawDisplayName ? normalizeText(rawDisplayName) : undefined,
    bio: rawBio ? normalizeText(rawBio) : undefined,
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
  const rawBuffer = Buffer.from(avatarBuffer);
  let cleanBuffer: Buffer;

  try {
    const { stripExifMetadata } = await import("@/lib/utils/strip-exif");
    cleanBuffer = await stripExifMetadata(rawBuffer, detectedMime);
  } catch (error) {
    console.error("Avatar preprocessing failed:", error);
    return {
      success: false,
      error: "Bildverarbeitung ist gerade nicht verfügbar. Bitte versuche es erneut.",
    };
  }

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

  // Verify current password using a standalone client with captcha token
  const captchaToken = formData.get("captchaToken") as string | null;
  const { createClient: createAnonClient } = await import("@supabase/supabase-js");
  const verifyClient = createAnonClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error: signInError } = await verifyClient.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
    options: { captchaToken: captchaToken ?? undefined },
  });

  if (signInError) {
    return { success: false, error: "Aktuelles Passwort ist falsch" };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (error) {
    if (error.message?.toLowerCase().includes("same password") || error.message?.toLowerCase().includes("different from")) {
      return { success: false, error: "Das neue Passwort muss sich vom bisherigen unterscheiden" };
    }
    console.error("Password change failed:", error.message);
    return { success: false, error: "Passwort-Änderung fehlgeschlagen" };
  }

  return { success: true };
}

const RECOVERY_EMAIL_RATE_LIMIT_MAX = 3;
const RECOVERY_EMAIL_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function setRecoveryEmail(formData: FormData): Promise<ActionResult> {
  const captchaToken = formData.get("captchaToken") as string | null;
  if (!captchaToken) {
    return { success: false, error: "Captcha erforderlich" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  // Reject OAuth-only users (no password to verify)
  if (!hasEmailIdentity(user)) {
    return { success: false, error: "Nicht verfügbar für OAuth-Accounts" };
  }

  const parsed = setRecoveryEmailSchema.safeParse({
    email: formData.get("email") as string,
    currentPassword: formData.get("currentPassword") as string,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  // Rate-limit: max 3 email change requests per hour per user
  const rateLimit = await checkRateLimit(
    `auth:recovery-email:${user.id}`,
    RECOVERY_EMAIL_RATE_LIMIT_MAX,
    RECOVERY_EMAIL_RATE_LIMIT_WINDOW_MS
  );
  if (!rateLimit.allowed) {
    return { success: false, error: "Zu viele Anfragen. Bitte versuche es später erneut." };
  }

  // Check email policy (disposable, banned, internal)
  const policyResult = await checkEmailPolicy(parsed.data.email);
  if (!policyResult.ok) {
    return { success: false, error: policyResult.error };
  }

  // Verify current password
  const { createClient: createAnonClient } = await import("@supabase/supabase-js");
  const verifyClient = createAnonClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error: signInError } = await verifyClient.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
    options: { captchaToken },
  });
  if (signInError) {
    return { success: false, error: "Aktuelles Passwort ist falsch" };
  }

  // Start email change via Supabase
  const headersList = await headers();
  const baseUrl = getBaseUrl(headersList.get("origin"));
  const { error } = await supabase.auth.updateUser(
    { email: policyResult.email },
    { emailRedirectTo: `${baseUrl}/auth/callback/email-change` }
  );

  if (error) {
    if (error.message?.toLowerCase().includes("already registered") || error.message?.toLowerCase().includes("already been registered")) {
      return { success: false, error: "Diese E-Mail-Adresse wird bereits verwendet" };
    }
    console.error("Recovery email update failed:", error.message);
    return { success: false, error: "E-Mail-Änderung fehlgeschlagen" };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function resendRecoveryEmail(formData: FormData): Promise<ActionResult> {
  const captchaToken = formData.get("captchaToken") as string | null;
  if (!captchaToken) {
    return { success: false, error: "Captcha erforderlich" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  if (!user.new_email) {
    return { success: false, error: "Keine ausstehende E-Mail-Änderung" };
  }

  // Shares rate-limit bucket with setRecoveryEmail
  const rateLimit = await checkRateLimit(
    `auth:recovery-email:${user.id}`,
    RECOVERY_EMAIL_RATE_LIMIT_MAX,
    RECOVERY_EMAIL_RATE_LIMIT_WINDOW_MS
  );
  if (!rateLimit.allowed) {
    return { success: false, error: "Zu viele Anfragen. Bitte versuche es später erneut." };
  }

  const { error } = await supabase.auth.resend({
    type: "email_change",
    email: user.email,
    options: { captchaToken },
  });

  if (error) {
    console.error("Resend recovery email failed:", error.message);
    return { success: false, error: "Erneutes Senden fehlgeschlagen" };
  }

  return { success: true };
}

export async function cancelRecoveryEmail(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  if (!user.new_email) {
    return { success: false, error: "Keine ausstehende E-Mail-Änderung" };
  }

  // Try clearing pending change by setting email to current email
  // If this doesn't work, fall back to admin API
  const { error } = await supabase.auth.updateUser({ email: user.email });
  if (error) {
    // Fallback: use admin API
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();
    const { error: adminError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { email: user.email }
    );
    if (adminError) {
      console.error("Cancel recovery email failed:", adminError.message);
      return { success: false, error: "Abbrechen fehlgeschlagen" };
    }
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteAccount(formData: FormData): Promise<ActionResult> {
  const parsed = deleteAccountSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Ungültige Eingabe" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  if (!hasEmailIdentity(user)) {
    return { success: false, error: "Account-Löschung ist nur für Accounts mit Passwort verfügbar" };
  }

  // Verify current password before proceeding
  const { createClient: createAnonClient } = await import("@supabase/supabase-js");
  const verifyClient = createAnonClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await verifyClient.auth.signInWithPassword({
    email: user.email!,
    password: parsed.data.currentPassword,
  });
  if (signInError) {
    return { success: false, error: "Aktuelles Passwort ist falsch" };
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

  // Delete meme files from storage (regular posts + comment images)
  for (const prefix of getOwnedMemesFolderPrefixes(user.id)) {
    const { data: memeFiles } = await adminClient.storage
      .from("memes")
      .list(prefix);

    if (memeFiles && memeFiles.length > 0) {
      await adminClient.storage
        .from("memes")
        .remove(memeFiles.map((f) => `${prefix}/${f.name}`));
    }
  }

  // Delete audio files from storage (user's daily audio posts)
  const { data: audioFiles } = await adminClient.storage
    .from("audio-posts")
    .list(user.id);

  if (audioFiles && audioFiles.length > 0) {
    await adminClient.storage
      .from("audio-posts")
      .remove(audioFiles.map((f) => `${user.id}/${f.name}`));
  }

  // Delete Hall of Fame files from storage
  const { data: hallOfFameEntries } = await adminClient
    .from("top_posts_all_time")
    .select("image_path, audio_path")
    .eq("user_id", user.id);

  if (hallOfFameEntries && hallOfFameEntries.length > 0) {
    const imagePaths = hallOfFameEntries
      .map((e) => e.image_path)
      .filter((p): p is string => p != null);

    if (imagePaths.length > 0) {
      await adminClient.storage.from("memes").remove(imagePaths);
    }

    const audioPaths = hallOfFameEntries
      .map((e) => e.audio_path)
      .filter((p): p is string => p != null);

    if (audioPaths.length > 0) {
      await adminClient.storage.from("audio-posts").remove(audioPaths);
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
