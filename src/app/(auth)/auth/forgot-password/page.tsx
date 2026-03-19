"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { requestPasswordReset } from "@/lib/actions/auth";
import { MAX_EMAIL_LENGTH } from "@/lib/constants";
import { requiredEmailSchema } from "@/lib/validations";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!captchaToken) {
      toast.error("Bitte warte, bis die Sicherheitsprüfung geladen ist");
      return;
    }

    setIsLoading(true);

    const parsedEmail = requiredEmailSchema.safeParse(email);
    if (!parsedEmail.success) {
      toast.error(parsedEmail.error.errors[0]?.message ?? "Ungültige E-Mail-Adresse");
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.set("email", parsedEmail.data);
    formData.set("captchaToken", captchaToken);

    await requestPasswordReset(formData);

    // Always show success (generic response to prevent account enumeration)
    setSent(true);
    setIsLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Passwort vergessen
          </h1>
          <p className="mt-2 text-muted-foreground">
            Dieser Reset funktioniert nur für Konten mit bestätigter
            Recovery-E-Mail.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-accent/50 p-4 text-center text-sm">
              Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen
              Link zum Zurücksetzen geschickt. Schau in deinem Posteingang nach.
            </div>
            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/auth/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Zurück zum Login
              </Link>
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="rounded-md border border-border bg-accent/50 p-3 text-sm text-muted-foreground">
                Wenn du dich ohne E-Mail registriert hast, logge dich ein und
                hinterlege zuerst eine Recovery-E-Mail in den Einstellungen.
              </p>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  E-Mail-Adresse
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  maxLength={MAX_EMAIL_LENGTH}
                  placeholder="deine@email.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    <Mail className="h-4 w-4" />
                    Link senden
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Erinnerst du dich wieder?{" "}
              <Link
                href="/auth/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Zum Login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
