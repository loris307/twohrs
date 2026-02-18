import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/app/(app)/settings/settings-form";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, bio, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Link>
          <span className="text-sm font-bold tracking-tight">
            two<span className="text-primary">hrs</span>
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Konto verwalten</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Profil bearbeiten, Daten exportieren oder Account löschen.
          </p>
        </div>

        <SettingsForm
          initialDisplayName={profile.display_name || ""}
          initialBio={profile.bio || ""}
          avatarUrl={profile.avatar_url}
          userEmail={user.email || ""}
          username={profile.username}
        />
      </div>
    </div>
  );
}
