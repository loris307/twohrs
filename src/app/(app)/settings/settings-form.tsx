"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { updateProfile, updateAvatar, deleteAccount } from "@/lib/actions/profile";
import { signOut } from "@/lib/actions/auth";

interface SettingsFormProps {
  initialDisplayName: string;
  initialBio: string;
  avatarUrl: string | null;
}

export function SettingsForm({
  initialDisplayName,
  initialBio,
  avatarUrl,
}: SettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleProfileUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateProfile(formData);

    if (result.success) {
      toast.success("Profil aktualisiert");
    } else {
      toast.error(result.error);
    }

    setIsSubmitting(false);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    const result = await updateAvatar(formData);
    if (result.success) {
      toast.success("Avatar aktualisiert");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteAccount();

    if (result.success) {
      router.push("/");
    } else {
      toast.error(result.error);
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div
          className="relative cursor-pointer"
          onClick={() => avatarInputRef.current?.click()}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-2xl font-bold">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Avatar"
                width={80}
                height={80}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              "?"
            )}
          </div>
          <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Camera className="h-3.5 w-3.5" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">Avatar ändern</p>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG oder WebP — Max. 2 MB
          </p>
        </div>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleAvatarChange}
          className="hidden"
        />
      </div>

      {/* Profile Form */}
      <form onSubmit={handleProfileUpdate} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="displayName" className="text-sm font-medium">
            Anzeigename
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            defaultValue={initialDisplayName}
            maxLength={50}
            placeholder="Dein Anzeigename"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="bio" className="text-sm font-medium">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            defaultValue={initialBio}
            maxLength={160}
            rows={3}
            placeholder="Kurz über dich..."
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? "Wird gespeichert..." : "Speichern"}
        </button>
      </form>

      {/* Divider */}
      <hr className="border-border" />

      {/* Logout */}
      <form action={signOut}>
        <button
          type="submit"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </button>
      </form>

      {/* Delete Account */}
      <div className="space-y-3">
        {showDeleteConfirm ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-3">
            <p className="text-sm font-medium text-destructive">
              Bist du sicher? Dein Account und alle Daten werden unwiderruflich
              gelöscht.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex h-9 items-center justify-center rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {isDeleting ? "Wird gelöscht..." : "Ja, Account löschen"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
              >
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-destructive/50 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Account löschen
          </button>
        )}
      </div>
    </div>
  );
}
