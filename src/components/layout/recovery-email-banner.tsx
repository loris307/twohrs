"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

export function RecoveryEmailBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
      <div className="mx-auto flex max-w-4xl items-center gap-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
        <p className="flex-1 text-xs text-amber-200/90">
          Ohne Recovery-E-Mail kannst du dein Passwort nicht zurücksetzen.{" "}
          <Link
            href="/settings"
            className="font-medium underline underline-offset-2 hover:text-amber-100"
          >
            Jetzt hinzufügen
          </Link>
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-amber-400/70 hover:text-amber-300 transition-colors"
          aria-label="Banner schließen"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
