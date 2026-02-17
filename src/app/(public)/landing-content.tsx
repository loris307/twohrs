"use client";

import Link from "next/link";
import { Clock, Flame, Trash2, Trophy, ArrowBigUp, MessageCircle, Users, Settings } from "lucide-react";
import { CountdownTimer } from "@/components/countdown/countdown-timer";
import { useTimeGate } from "@/lib/hooks/use-time-gate";
import { formatNumber } from "@/lib/utils/format";
import type { TopPostAllTime } from "@/lib/types";

interface LandingContentProps {
  isLoggedIn?: boolean;
  yesterdayTopPost?: TopPostAllTime | null;
  userCount?: number;
}

export function LandingContent({ isLoggedIn, yesterdayTopPost, userCount = 0 }: LandingContentProps) {
  const { isOpen } = useTimeGate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-12 text-center">
        {/* Logo / Title */}
        <div className="space-y-4">
          <h1 className="text-6xl font-extrabold tracking-tighter sm:text-7xl">
            two<span className="text-primary">hrs</span>
          </h1>
          <p className="text-xl text-muted-foreground sm:text-2xl">
            Social Media. 2 Stunden. Dann leb dein Leben.
          </p>
          {userCount > 0 && (
            <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{userCount} leute mit dabei</span>
            </div>
          )}
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
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  Du bist eingeloggt. Komm heute Abend um 20:00 Uhr wieder!
                </p>
                <Link
                  href="/account"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-6 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Settings className="h-4 w-4" />
                  Konto verwalten
                </Link>
              </div>
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

        {/* Yesterday's Best Post */}
        {yesterdayTopPost && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Bester Post des Abends
            </div>
            <article className="mx-auto max-w-md overflow-hidden rounded-lg border border-border bg-card text-left">
              <div className="flex items-center gap-2 px-4 py-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {yesterdayTopPost.profiles.avatar_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={yesterdayTopPost.profiles.avatar_url}
                      alt={yesterdayTopPost.profiles.username}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    yesterdayTopPost.profiles.username[0].toUpperCase()
                  )}
                </div>
                <span className="text-sm font-medium">
                  @{yesterdayTopPost.profiles.username}
                </span>
                <span className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
                  <ArrowBigUp className="h-4 w-4 fill-primary" />
                  {formatNumber(yesterdayTopPost.upvote_count)}
                </span>
              </div>

              {yesterdayTopPost.image_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={yesterdayTopPost.image_url}
                  alt={yesterdayTopPost.caption || "Top Post"}
                  className="w-full object-contain"
                  style={{ maxHeight: "400px" }}
                />
              )}

              {yesterdayTopPost.caption && (
                <div className="px-4 py-2">
                  <p className="text-sm">
                    <span className="font-medium">{yesterdayTopPost.profiles.username}</span>{" "}
                    {yesterdayTopPost.caption}
                  </p>
                </div>
              )}

              {yesterdayTopPost.top_comments && yesterdayTopPost.top_comments.length > 0 && (
                <div className="border-t border-border px-4 py-2">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <MessageCircle className="h-3.5 w-3.5" />
                    Top Kommentare
                  </div>
                  <div className="space-y-1">
                    {yesterdayTopPost.top_comments.map((comment, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">@{comment.username}</span>{" "}
                          <span className="text-muted-foreground">{comment.text}</span>
                        </div>
                        {comment.upvote_count > 0 && (
                          <span className="flex shrink-0 items-center gap-0.5 text-xs text-primary">
                            <ArrowBigUp className="h-3.5 w-3.5 fill-primary" />
                            {formatNumber(comment.upvote_count)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
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

        {/* Footer links */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <Link href="/about" className="underline underline-offset-4 hover:text-foreground">
              Anti-Attention-Economy Manifesto
            </Link>
          </p>
          <div className="flex items-center justify-center gap-4 text-xs">
            <Link href="/impressum" className="underline underline-offset-4 hover:text-foreground">
              Impressum
            </Link>
            <Link href="/datenschutz" className="underline underline-offset-4 hover:text-foreground">
              Datenschutz
            </Link>
            <Link href="/agb" className="underline underline-offset-4 hover:text-foreground">
              AGB
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
