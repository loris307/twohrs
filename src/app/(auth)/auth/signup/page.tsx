"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { UserPlus, Share2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { signUp } from "@/lib/actions/auth";
import { PasswordRequirements } from "@/components/shared/password-requirements";
import { PasswordInput } from "@/components/shared/password-input";

const SHARE_TEXT =
  "Ich bin gerade twohrs beigetreten — ein soziales Netzwerk, das nur 2 Stunden am Tag offen hat. Jeden Abend 20-22 Uhr. Bist du dabei?";
const SHARE_URL = typeof window !== "undefined" ? window.location.origin : "https://twohrs.com";

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"form" | "share">("form");
  const [formData, setFormData] = useState<FormData | null>(null);
  const [hasShared, setHasShared] = useState(false);
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const router = useRouter();

  function isMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

    if (!captchaToken) {
      toast.error("Bitte warte, bis die Sicherheitsprüfung geladen ist");
      return;
    }

    data.set("captchaToken", captchaToken);
    data.set("acceptTerms", acceptTerms ? "true" : "false");

    if (isMobile()) {
      // Mobile: show share step first
      setFormData(data);
      setStep("share");
    } else {
      // Desktop: skip share, create account directly
      setFormData(data);
      setIsLoading(true);
      try {
        const result = await signUp(data);
        if (!result.success) {
          toast.error(result.error);
          turnstileRef.current?.reset();
          setCaptchaToken(null);
        } else {
          toast.success("Willkommen bei twohrs!");
          router.push("/");
        }
      } catch {
        toast.error("Ein Fehler ist aufgetreten");
        turnstileRef.current?.reset();
        setCaptchaToken(null);
      } finally {
        setIsLoading(false);
      }
    }
  }

  const handleShare = useCallback(async () => {
    // Try native Web Share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title: "twohrs — Social Media. 2 Stunden.",
          text: SHARE_TEXT,
          url: SHARE_URL,
        });
        setHasShared(true);
        return;
      } catch {
        // User cancelled or share failed — fall through to mark as shared anyway
        // (they at least opened the share dialog)
        setHasShared(true);
        return;
      }
    }

    // Fallback: open WhatsApp share
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(SHARE_TEXT + " " + SHARE_URL)}`;
    window.open(whatsappUrl, "_blank");
    setHasShared(true);
  }, []);

  async function handleComplete() {
    if (!formData) return;
    setIsLoading(true);

    try {
      const result = await signUp(formData);
      if (!result.success) {
        toast.error(result.error);
        turnstileRef.current?.reset();
        setCaptchaToken(null);
        setStep("form");
      } else {
        toast.success("Willkommen bei twohrs!");
        router.push("/");
      }
    } catch {
      toast.error("Ein Fehler ist aufgetreten");
      turnstileRef.current?.reset();
      setCaptchaToken(null);
      setStep("form");
    } finally {
      setIsLoading(false);
    }
  }

  if (step === "share") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Share2 className="h-10 w-10 text-primary" />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Fast geschafft!
            </h1>
            <p className="text-muted-foreground">
              twohrs lebt von der Community. Teile die App mit einem Freund,
              deiner Oma oder wem auch immer — Hauptsache, jemand erfährt davon.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleShare}
              className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-md border border-border bg-card px-6 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Share2 className="h-5 w-5" />
              Mit jemandem teilen
            </button>

            {hasShared && (
              <button
                onClick={handleComplete}
                disabled={isLoading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isLoading ? (
                  "Account wird erstellt..."
                ) : (
                  <>
                    Weiter
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            )}
          </div>

          {!hasShared && (
            <p className="text-xs text-muted-foreground">
              Du musst die App einmal teilen, um fortzufahren.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Account erstellen
          </h1>
          <p className="mt-2 text-muted-foreground">
            Werde Teil der twohrs-Community
          </p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              E-Mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="deine@email.de"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              placeholder="dein_username"
              pattern="^[a-z0-9_]+$"
              minLength={3}
              maxLength={20}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Nur Kleinbuchstaben, Zahlen und Unterstriche (3-20 Zeichen)
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="displayName" className="text-sm font-medium">
              Anzeigename{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              maxLength={50}
              placeholder="Dein Anzeigename"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Passwort
            </label>
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="new-password"
              placeholder="Sicheres Passwort wählen"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordRequirements password={password} />
          </div>

          <div className="flex items-start gap-3">
            <input
              id="acceptTerms"
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-input accent-primary"
            />
            <label htmlFor="acceptTerms" className="text-sm text-muted-foreground">
              Ich bin mindestens 16 Jahre alt und stimme den{" "}
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
            </label>
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
            disabled={isLoading || !acceptTerms || (!captchaToken && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? (
              "Account wird erstellt..."
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Registrieren
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Schon ein Konto?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
