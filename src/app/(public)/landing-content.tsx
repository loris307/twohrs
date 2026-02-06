"use client";

import Link from "next/link";
import { Clock, Flame, Trash2 } from "lucide-react";
import { CountdownTimer } from "@/components/countdown/countdown-timer";
import { useTimeGate } from "@/lib/hooks/use-time-gate";

export function LandingContent({ isLoggedIn }: { isLoggedIn?: boolean }) {
  const { isOpen } = useTimeGate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-12 text-center">
        {/* Logo / Title */}
        <div className="space-y-4">
          <h1 className="text-6xl font-extrabold tracking-tighter sm:text-7xl">
            2<span className="text-primary">Hours</span>
          </h1>
          <p className="text-xl text-muted-foreground sm:text-2xl">
            Social Media. 2 Stunden. Dann leb dein Leben.
          </p>
        </div>

        {/* State-dependent content */}
        {isOpen ? (
          <div className="space-y-6">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
              <p className="text-lg font-semibold text-primary">
                Die App ist jetzt geöffnet!
              </p>
              <p className="mt-1 text-muted-foreground">
                {isLoggedIn
                  ? "Ab in den Feed!"
                  : "Melde dich an und sei dabei."}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              {isLoggedIn ? (
                <Link
                  href="/feed"
                  className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Zum Feed
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Anmelden
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-background px-8 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    Registrieren
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <CountdownTimer />
            {isLoggedIn ? (
              <p className="text-muted-foreground">
                Du bist eingeloggt. Komm heute Abend um 20:00 Uhr wieder!
              </p>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/auth/signup"
                  className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Account erstellen
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-background px-8 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Anmelden
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Features */}
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2 rounded-lg border border-border p-6">
            <Clock className="mx-auto h-8 w-8 text-primary" />
            <h3 className="font-semibold">20:00 - 22:00</h3>
            <p className="text-sm text-muted-foreground">
              Nur 2 Stunden am Tag. Jeden Abend von 20 bis 22 Uhr.
            </p>
          </div>
          <div className="space-y-2 rounded-lg border border-border p-6">
            <Flame className="mx-auto h-8 w-8 text-primary" />
            <h3 className="font-semibold">Memes & Upvotes</h3>
            <p className="text-sm text-muted-foreground">
              Poste Memes, sammle Upvotes, werde lustigste Person des Tages.
            </p>
          </div>
          <div className="space-y-2 rounded-lg border border-border p-6">
            <Trash2 className="mx-auto h-8 w-8 text-primary" />
            <h3 className="font-semibold">Täglicher Reset</h3>
            <p className="text-sm text-muted-foreground">
              Um Mitternacht wird alles gelöscht. Jeden Tag neu starten.
            </p>
          </div>
        </div>

        {/* Footer link */}
        <p className="text-sm text-muted-foreground">
          <Link href="/about" className="underline underline-offset-4 hover:text-foreground">
            Anti-Attention-Economy Manifesto
          </Link>
        </p>
      </div>
    </div>
  );
}
