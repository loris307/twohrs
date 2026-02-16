import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            Anti-Attention-Economy
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Ein Manifest für bewusstere Social Media Nutzung.
          </p>
        </div>

        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <p>
            Soziale Netzwerke sind darauf designt, dich so lange wie möglich
            festzuhalten. Unendliche Feeds, Push-Benachrichtigungen, Like-Zähler
            — alles optimiert auf maximale Bildschirmzeit.
          </p>

          <p>
            <strong className="text-foreground">twohrs</strong> macht es anders.
            Die App ist nur 2 Stunden am Tag geöffnet. Von 20:00 bis 22:00 Uhr.
            Danach ist Schluss. Kein Scrollen um 3 Uhr nachts, kein Doom-Scrolling
            in der Mittagspause.
          </p>

          <p>
            Und um Mitternacht wird alles gelöscht. Jeder Post, jeder Upvote,
            jedes Bild. Morgen ist ein neuer Tag. Kein Content-Archiv, kein
            &ldquo;Memories&rdquo;-Feature, kein digitaler Ballast.
          </p>

          <p>
            Was bleibt: Die Erinnerung an einen guten Abend mit deiner Community.
            Und das Leaderboard — wer war heute am lustigsten?
          </p>

          <p className="text-foreground font-medium">
            Social Media sollte ein kurzer, bewusster Moment am Tag sein.
            Nicht ein endloser Zeitfresser. Das ist die Anti-Attention-Economy.
          </p>
        </div>
      </div>
    </div>
  );
}
