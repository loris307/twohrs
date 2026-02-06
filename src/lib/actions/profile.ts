"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateProfileSchema } from "@/lib/validations";
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

  const fileExt = avatarFile.name.split(".").pop() || "jpg";
  const fileName = `${user.id}/avatar.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, avatarFile, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    return { success: false, error: "Avatar-Upload fehlgeschlagen" };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(fileName);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return { success: false, error: "Avatar-Update fehlgeschlagen" };
  }

  revalidatePath("/settings");
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

  // Note: Deleting from auth.users will cascade to profiles due to FK
  // We need the admin client for this
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();

  const { error } = await adminClient.auth.admin.deleteUser(user.id);

  if (error) {
    return { success: false, error: "Account-Löschung fehlgeschlagen" };
  }

  // Sign out the user
  await supabase.auth.signOut();

  return { success: true };
}
