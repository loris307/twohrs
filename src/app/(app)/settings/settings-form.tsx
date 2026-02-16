"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Camera,
  LogOut,
  Trash2,
  Download,
  Mail,
  Lock,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateProfile,
  updateAvatar,
  removeAvatar,
  changeEmail,
  changePassword,
  deleteAccount,
} from "@/lib/actions/profile";
import { signOut } from "@/lib/actions/auth";
import { PasswordRequirements } from "@/components/shared/password-requirements";
import { PasswordInput } from "@/components/shared/password-input";

interface SettingsFormProps {
  initialDisplayName: string;
  initialBio: string;
  avatarUrl: string | null;
  userEmail: string;
  username: string;
}

export function SettingsForm({
  initialDisplayName,
  initialBio,
  avatarUrl,
  userEmail,
  username,
}: SettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
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

  async function handleRemoveAvatar() {
    setIsRemovingAvatar(true);
    const result = await removeAvatar();

    if (result.success) {
      toast.success("Avatar entfernt");
      router.refresh();
    } else {
      toast.error(result.error);
    }

    setIsRemovingAvatar(false);
  }

  async function handleEmailChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsChangingEmail(true);

    const formData = new FormData(e.currentTarget);
    const result = await changeEmail(formData);

    if (result.success) {
      toast.success("Bestätigungsmail an die neue Adresse gesendet");
      setShowEmailChange(false);
    } else {
      toast.error(result.error);
    }

    setIsChangingEmail(false);
  }

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsChangingPassword(true);

    const formData = new FormData(e.currentTarget);
    const result = await changePassword(formData);

    if (result.success) {
      toast.success("Passwort erfolgreich geändert");
      setShowPasswordChange(false);
      setNewPassword("");
    } else {
      toast.error(result.error);
    }

    setIsChangingPassword(false);
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      window.location.href = "/api/export";
      // Small delay so the user sees the loading state
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch {
      toast.error("Datenexport fehlgeschlagen");
    }
    setIsExporting(false);
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

  const inputClasses =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="space-y-8">
      {/* ── Profil ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Profil</h2>

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
            {avatarUrl && (
              <button
                onClick={handleRemoveAvatar}
                disabled={isRemovingAvatar}
                className="mt-1 text-xs text-destructive hover:underline disabled:opacity-50"
              >
                {isRemovingAvatar ? "Wird entfernt..." : "Avatar entfernen"}
              </button>
            )}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        {/* Username (read-only) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Username
          </label>
          <p className="text-sm">@{username}</p>
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
              className={inputClasses}
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
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      </section>

      <hr className="border-border" />

      {/* ── Konto ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Konto</h2>

        {/* Email */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">E-Mail</p>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
            </div>
            <button
              onClick={() => setShowEmailChange(!showEmailChange)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium transition-colors hover:bg-accent"
            >
              {showEmailChange ? (
                <X className="h-3 w-3" />
              ) : (
                <Mail className="h-3 w-3" />
              )}
              {showEmailChange ? "Abbrechen" : "Ändern"}
            </button>
          </div>

          {showEmailChange && (
            <form onSubmit={handleEmailChange} className="space-y-3">
              <input
                name="email"
                type="email"
                placeholder="Neue E-Mail-Adresse"
                required
                className={inputClasses}
              />
              <button
                type="submit"
                disabled={isChangingEmail}
                className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isChangingEmail
                  ? "Wird gesendet..."
                  : "Bestätigungsmail senden"}
              </button>
            </form>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Passwort</p>
            <button
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium transition-colors hover:bg-accent"
            >
              {showPasswordChange ? (
                <X className="h-3 w-3" />
              ) : (
                <Lock className="h-3 w-3" />
              )}
              {showPasswordChange ? "Abbrechen" : "Ändern"}
            </button>
          </div>

          {showPasswordChange && (
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <PasswordInput
                name="currentPassword"
                placeholder="Aktuelles Passwort"
                required
              />
              <div className="space-y-1">
                <PasswordInput
                  name="newPassword"
                  placeholder="Neues Passwort"
                  minLength={8}
                  maxLength={72}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <PasswordRequirements password={newPassword} />
              </div>
              <PasswordInput
                name="confirmPassword"
                placeholder="Neues Passwort bestätigen"
                minLength={8}
                maxLength={72}
                required
              />
              <button
                type="submit"
                disabled={isChangingPassword}
                className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isChangingPassword
                  ? "Wird geändert..."
                  : "Passwort ändern"}
              </button>
            </form>
          )}
        </div>
      </section>

      <hr className="border-border" />

      {/* ── Daten ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Daten</h2>
        <p className="text-sm text-muted-foreground">
          Lade eine Kopie aller deiner gespeicherten Daten als JSON-Datei
          herunter.
        </p>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {isExporting ? "Wird exportiert..." : "Meine Daten herunterladen"}
        </button>
      </section>

      <hr className="border-border" />

      {/* ── Abmelden ── */}
      <section>
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </button>
        </form>
      </section>

      <hr className="border-border" />

      {/* ── Gefahrenzone ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-destructive">
          Gefahrenzone
        </h2>

        {showDeleteConfirm ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-3">
            <p className="text-sm font-medium text-destructive">
              Bist du sicher? Folgendes wird unwiderruflich gelöscht:
            </p>
            <ul className="text-sm text-destructive/80 list-disc pl-5 space-y-1">
              <li>Dein Profil und alle Account-Daten</li>
              <li>Alle hochgeladenen Bilder (Avatar & Memes)</li>
              <li>Leaderboard-Einträge und Hall of Fame</li>
              <li>Alle Posts, Kommentare und Votes</li>
            </ul>
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
      </section>
    </div>
  );
}
