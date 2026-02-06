"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTimeGate } from "@/lib/hooks/use-time-gate";
import { Moon } from "lucide-react";

export function SessionEndedModal() {
  const { isOpen } = useTimeGate();
  const [wasOpen, setWasOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setWasOpen(true);
    } else if (wasOpen && !isOpen) {
      setShowModal(true);
    }
  }, [isOpen, wasOpen]);

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 text-center shadow-lg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Moon className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Session beendet!</h2>
        <p className="text-muted-foreground">
          Die heutige Session ist vorbei. Komm morgen um 20:00 Uhr wieder!
        </p>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
