"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Mail, Clock, Check, X, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  setRecoveryEmail,
  resendRecoveryEmail,
  cancelRecoveryEmail,
} from "@/lib/actions/profile";
import { PasswordInput } from "@/components/shared/password-input";
import { MAX_EMAIL_LENGTH } from "@/lib/constants";
import type { RecoveryEmailStatus } from "@/lib/utils/auth-email";

interface RecoveryEmailSectionProps {
  recoveryEmailStatus: RecoveryEmailStatus;
  visibleEmail: string | null;
  pendingEmail: string | null;
}

export function RecoveryEmailSection({
  recoveryEmailStatus,
  visibleEmail,
  pendingEmail,
}: RecoveryEmailSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [resendCaptchaToken, setResendCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const resendTurnstileRef = useRef<TurnstileInstance | null>(null);

  // Handle query params from email-change callback
  useEffect(() => {
    if (searchParams.get("email-updated") === "1") {
      toast.success("E-Mail-Adresse erfolgreich bestätigt");
      router.replace("/settings", { scroll: false });
    } else if (searchParams.get("email-error") === "1") {
      toast.error("E-Mail-Bestätigung fehlgeschlagen. Bitte versuche es erneut.");
      router.replace("/settings", { scroll: false });
    }
  }, [searchParams, router]);

  // OAuth-only: show email read-only (managed by Google)
  if (recoveryEmailStatus === "oauth_only") {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">E-Mail</p>
        {visibleEmail && (
          <p className="text-sm text-muted-foreground">{visibleEmail}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Wird über deinen Anmeldeanbieter verwaltet.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!captchaToken) {
      toast.error("Bitte warte, bis die Sicherheitsprüfung geladen ist");
      return;
    }
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.set("captchaToken", captchaToken);

    const result = await setRecoveryEmail(formData);

    if (result.success) {
      toast.success("Bestätigungs-Mail gesendet. Bitte prüfe dein Postfach.");
      setShowForm(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }

    turnstileRef.current?.reset();
    setCaptchaToken(null);
    setIsSubmitting(false);
  }

  async function handleResend() {
    if (!resendCaptchaToken) {
      toast.error("Bitte warte, bis die Sicherheitsprüfung geladen ist");
      return;
    }
    setIsResending(true);

    const formData = new FormData();
    formData.set("captchaToken", resendCaptchaToken);

    const result = await resendRecoveryEmail(formData);

    if (result.success) {
      toast.success("Bestätigungs-Mail erneut gesendet");
    } else {
      toast.error(result.error);
    }

    resendTurnstileRef.current?.reset();
    setResendCaptchaToken(null);
    setIsResending(false);
  }

  async function handleCancel() {
    setIsCancelling(true);
    const result = await cancelRecoveryEmail();

    if (result.success) {
      toast.success("E-Mail-Änderung abgebrochen");
      router.refresh();
    } else {
      toast.error(result.error);
    }

    setIsCancelling(false);
  }

  const isPending =
    recoveryEmailStatus === "pending_first_email" ||
    recoveryEmailStatus === "pending_email_change";

  const inputClasses =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">E-Mail</p>
        {recoveryEmailStatus === "verified_recovery_email" && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium transition-colors hover:bg-accent"
          >
            <Mail className="h-3 w-3" />
            Ändern
          </button>
        )}
      </div>

      {/* Verified state */}
      {recoveryEmailStatus === "verified_recovery_email" && !showForm && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-green-500" />
          <span>{visibleEmail}</span>
        </div>
      )}

      {/* Missing state */}
      {recoveryEmailStatus === "missing_recovery_email" && !showForm && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Ohne Recovery-E-Mail kannst du dein Passwort nicht zurücksetzen.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Mail className="h-4 w-4" />
            E-Mail hinzufügen
          </button>
        </div>
      )}

      {/* Pending state */}
      {isPending && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-amber-500">
            <Clock className="h-4 w-4" />
            <span>Bestätigung ausstehend für {pendingEmail}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Prüfe dein Postfach und klicke auf den Bestätigungslink.
          </p>
          <div className="flex gap-2">
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <Turnstile
                ref={resendTurnstileRef}
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                onSuccess={setResendCaptchaToken}
                onExpire={() => setResendCaptchaToken(null)}
                options={{ theme: "dark", size: "compact" }}
              />
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleResend}
              disabled={isResending || (!resendCaptchaToken && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
            >
              {isResending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Erneut senden
            </button>
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
            >
              {isCancelling ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <X className="h-3 w-3" />
              )}
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Add / Change form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <label htmlFor="recovery-email" className="text-sm font-medium">
              {recoveryEmailStatus === "missing_recovery_email"
                ? "E-Mail-Adresse"
                : "Neue E-Mail-Adresse"}
            </label>
            <input
              id="recovery-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoCapitalize="none"
              maxLength={MAX_EMAIL_LENGTH}
              placeholder="deine@email.de"
              className={inputClasses}
            />
          </div>
          <PasswordInput
            name="currentPassword"
            placeholder="Aktuelles Passwort"
            required
          />
          {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
            <Turnstile
              ref={turnstileRef}
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              onSuccess={setCaptchaToken}
              onExpire={() => setCaptchaToken(null)}
              options={{ theme: "dark", size: "flexible" }}
            />
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting || (!captchaToken && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Bestätigungs-Mail senden
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
