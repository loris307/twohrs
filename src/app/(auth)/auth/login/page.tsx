"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { LogIn } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "@/lib/actions/auth";
import { PasswordInput } from "@/components/shared/password-input";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!captchaToken) {
      toast.error("Bitte warte, bis die Sicherheitsprüfung geladen ist");
      return;
    }

    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("captchaToken", captchaToken);

    try {
      const result = await signIn(formData);
      if (result && !result.success) {
        toast.error(result.error);
        turnstileRef.current?.reset();
        setCaptchaToken(null);
      }
    } catch {
      // signIn redirects on success, so if we're here and no error, it worked
      router.push("/feed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Willkommen zurück
          </h1>
          <p className="mt-2 text-muted-foreground">
            Melde dich an, um mitzumachen
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="identifier" className="text-sm font-medium">
              E-Mail oder Benutzername
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              required
              autoComplete="username email"
              placeholder="E-Mail oder Benutzername"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">
                Passwort
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                Passwort vergessen?
              </Link>
            </div>
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="Dein Passwort"
            />
          </div>

          {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
            <Turnstile
              ref={turnstileRef}
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              onSuccess={setCaptchaToken}
              onExpire={() => setCaptchaToken(null)}
              options={{ theme: "dark", size: "flexible" }}
            />
          )}

          <button
            type="submit"
            disabled={isLoading || (!captchaToken && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isLoading ? (
              <span className="animate-spin">...</span>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Anmelden
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Noch kein Konto?{" "}
          <Link
            href="/auth/signup"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Jetzt registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
