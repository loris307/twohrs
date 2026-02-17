"use server";

import { createHash } from "crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAppOpen } from "@/lib/utils/time";
import { signUpSchema, signInSchema } from "@/lib/validations";
import type { ActionResult } from "@/lib/types";

export async function signUp(formData: FormData): Promise<ActionResult> {
  const captchaToken = formData.get("captchaToken") as string | null;
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    username: formData.get("username") as string,
    displayName: (formData.get("displayName") as string) || undefined,
    acceptTerms: formData.get("acceptTerms") === "true" ? true as const : undefined,
  };

  const parsed = signUpSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  // Check if email is banned (hash comparison)
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();

  const emailHash = createHash("sha256")
    .update(parsed.data.email.toLowerCase().trim())
    .digest("hex");

  const { data: banned } = await adminClient
    .from("banned_email_hashes")
    .select("hash")
    .eq("hash", emailHash)
    .single();

  if (banned) {
    return { success: false, error: "Registrierung nicht möglich" };
  }

  const supabase = await createClient();

  // Check username availability
  const { data: existingUser } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", parsed.data.username)
    .single();

  if (existingUser) {
    return { success: false, error: "Dieser Username ist bereits vergeben" };
  }

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      ...(captchaToken ? { captchaToken } : {}),
      data: {
        username: parsed.data.username,
        display_name: parsed.data.displayName || parsed.data.username,
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: undefined,
  };
}

export async function signIn(formData: FormData): Promise<ActionResult> {
  const captchaToken = formData.get("captchaToken") as string | null;
  const rawData = {
    identifier: formData.get("identifier") as string,
    password: formData.get("password") as string,
  };

  const parsed = signInSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { identifier, password } = parsed.data;
  let email: string;

  if (identifier.includes("@")) {
    // Input is an email
    email = identifier;
  } else {
    // Input is a username — look up the email
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();

    const { data: profile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("username", identifier.toLowerCase())
      .single();

    if (!profile) {
      return { success: false, error: "Benutzername/E-Mail oder Passwort falsch" };
    }

    const { data: authUser } = await adminClient.auth.admin.getUserById(profile.id);
    if (!authUser?.user?.email) {
      return { success: false, error: "Benutzername/E-Mail oder Passwort falsch" };
    }

    email = authUser.user.email;
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: captchaToken ? { captchaToken } : undefined,
  });

  if (error) {
    return { success: false, error: "Benutzername/E-Mail oder Passwort falsch" };
  }

  redirect(isAppOpen() ? "/feed" : "/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
