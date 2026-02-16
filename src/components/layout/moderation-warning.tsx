"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ModerationWarningProps {
  strikes: number;
}

export function ModerationWarning({ strikes }: ModerationWarningProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3">
      <div className="mx-auto flex max-w-4xl items-center gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
        <p className="flex-1 text-sm text-destructive">
          <span className="font-semibold">Verwarnung ({strikes}/3):</span>{" "}
          Dein Post wurde wegen Regelverstoß entfernt.
          Bei 3 Verwarnungen wird dein Account automatisch gelöscht.
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-destructive/60 hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
