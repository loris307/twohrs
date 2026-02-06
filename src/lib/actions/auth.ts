"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAppOpen } from "@/lib/utils/time";
import { signUpSchema, signInSchema } from "@/lib/validations";
import type { ActionResult } from "@/lib/types";

export async function signUp(formData: FormData): Promise<ActionResult> {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    username: formData.get("username") as string,
    displayName: (formData.get("displayName") as string) || undefined,
  };

  const parsed = signUpSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
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
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = signInSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: "E-Mail oder Passwort falsch" };
  }

  redirect(isAppOpen() ? "/feed" : "/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
