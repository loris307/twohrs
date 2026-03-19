"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { completePasswordReset } from "@/lib/actions/auth";
import { PasswordRequirements } from "@/components/shared/password-requirements";
import { PasswordInput } from "@/components/shared/password-input";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setHasSession(false);
      } else {
        setHasSession(true);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    formData.set("password", password);
    formData.set("confirmPassword", confirmPassword);

    const result = await completePasswordReset(formData);

    if (result.success) {
      toast.success("Passwort geändert — bitte melde dich neu an");
      document.dispatchEvent(new Event("navigation-start"));
      router.push("/auth/login");
    } else {
      toast.error(result.error);
      setIsLoading(false);
    }
  }

  // Loading state while checking session
  if (hasSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="animate-spin text-muted-foreground">...</span>
      </div>
    );
  }

  // No session — user didn't come from a valid reset link
  if (!hasSession) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Ungültiger Link
          </h1>
          <p className="text-muted-foreground">
            Dieser Link ist abgelaufen oder ungültig. Bitte fordere einen neuen
            an.
          </p>
          <Link
            href="/auth/forgot-password"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Neuen Link anfordern
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Neues Passwort setzen
          </h1>
          <p className="mt-2 text-muted-foreground">
            Wähle ein neues Passwort für dein Konto
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Neues Passwort
            </label>
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="new-password"
              passwordrules="minlength: 8; maxlength: 72; required: lower; required: upper; required: digit; required: special;"
              minLength={8}
              maxLength={72}
              placeholder="Neues Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordRequirements password={password} />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Passwort bestätigen
            </label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              required
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              placeholder="Passwort wiederholen"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">
                Passwörter stimmen nicht überein
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !password || !confirmPassword}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isLoading ? (
              <span className="animate-spin">...</span>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                Passwort ändern
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
