"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { LogIn } from "lucide-react";
import { toast } from "sonner";
import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";
import { signIn } from "@/lib/actions/auth";
import { MAX_EMAIL_LENGTH } from "@/lib/constants";
import { PasswordInput } from "@/components/shared/password-input";

function LoginPageInner({ error }: { error: string | null }) {
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const shownErrorRef = useRef<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!error || shownErrorRef.current === error) return;

    shownErrorRef.current = error;

    if (error === "callback") {
      toast.error("Google-Anmeldung fehlgeschlagen. Bitte versuche es erneut.");
    } else if (error === "disposable_email") {
      toast.error("Temporäre oder Alias-E-Mail-Adressen sind für Registrierungen nicht erlaubt.");
    } else if (error === "oauth_blocked") {
      toast.error("Google-Registrierung ist gerade nicht möglich. Bitte nutze E-Mail oder versuche es später erneut.");
    }
  }, [error]);

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

        <div className="space-y-4">
          <GoogleOAuthButton mode="signin" disabled={isLoading} />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                oder
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="identifier" className="text-sm font-medium">
              Benutzername oder E-Mail
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              required
              autoComplete="username"
              autoCapitalize="none"
              maxLength={MAX_EMAIL_LENGTH}
              placeholder="dein_username oder name@example.com"
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
                Reset per E-Mail
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

        <p className="text-center text-xs text-muted-foreground">
          Mit dem Fortfahren stimmst du den{" "}
          <Link
            href="/agb"
            target="_blank"
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Nutzungsbedingungen
          </Link>{" "}
          und der{" "}
          <Link
            href="/datenschutz"
            target="_blank"
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Datenschutzerklärung
          </Link>{" "}
          zu.
        </p>

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

function LoginPageContent() {
  const searchParams = useSearchParams();
  return <LoginPageInner error={searchParams.get("error")} />;
}

function LoginPageFallback() {
  return <LoginPageInner error={null} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
