import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen | twohrs",
};

export default function AGBPage() {
  return (
    <div className="normal-case mx-auto max-w-2xl px-4 py-16">
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
            Nutzungsbedingungen
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Stand: Februar 2026
          </p>
        </div>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          {/* 1. Geltungsbereich */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              1. Geltungsbereich
            </h2>
            <p>
              Diese Nutzungsbedingungen regeln die Nutzung der Plattform
              &bdquo;twohrs&ldquo; (erreichbar unter twohrs.com), betrieben von:
            </p>
            <p>
              Loris Jaro Galler
              <br />
              c/o IP-Management #5476
              <br />
              Ludwig-Erhard-Str. 18
              <br />
              20459 Hamburg
              <br />
              E-Mail: lorisgaller.business@gmail.com
            </p>
            <p>
              Mit der Registrierung erklärst du dich mit diesen
              Nutzungsbedingungen einverstanden.
            </p>
          </section>

          {/* 2. Leistungsbeschreibung */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              2. Leistungsbeschreibung
            </h2>
            <p>
              twohrs ist ein zeitbegrenztes soziales Netzwerk. Die Plattform
              bietet folgende Funktionen:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Erstellen von Posts (Bilder, Texte, Links)</li>
              <li>Kommentieren und Antworten auf Posts</li>
              <li>Upvoten von Posts und Kommentaren</li>
              <li>Folgen von Nutzern und Hashtags</li>
              <li>@Erwähnung anderer Nutzer</li>
              <li>Tägliches Leaderboard und Hall of Fame</li>
            </ul>

            <h3 className="mt-4 font-semibold text-foreground">
              2.1 Zeitbegrenzung
            </h3>
            <p>
              twohrs ist nur zu bestimmten Uhrzeiten nutzbar. Die aktuellen
              Öffnungszeiten werden auf der Startseite angezeigt. Außerhalb
              dieser Zeiten ist die Erstellung von Inhalten nicht möglich.
            </p>

            <h3 className="mt-4 font-semibold text-foreground">
              2.2 Tägliche Löschung
            </h3>
            <p>
              <strong className="text-foreground">
                Alle nutzergenerierten Inhalte werden täglich automatisch
                gelöscht.
              </strong>{" "}
              Dies umfasst Posts, Kommentare, Upvotes, Erwähnungen und
              hochgeladene Bilder. Dies ist ein bewusstes Kernkonzept von
              twohrs und kein Fehler. Mit der Nutzung des Dienstes erklärst
              du dich ausdrücklich mit der täglichen Löschung einverstanden.
            </p>
            <p>
              Ausgenommen von der täglichen Löschung sind: Profildaten,
              Follow-Beziehungen, Hashtag-Abonnements sowie archivierte
              Leaderboard- und Hall of Fame-Einträge.
            </p>
          </section>

          {/* 3. Registrierung und Account */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              3. Registrierung und Account
            </h2>

            <h3 className="font-semibold text-foreground">3.1 Mindestalter</h3>
            <p>
              Die Nutzung von twohrs ist ab einem Alter von{" "}
              <strong className="text-foreground">16 Jahren</strong> gestattet.
              Personen unter 16 Jahren benötigen die Einwilligung eines
              Erziehungsberechtigten. Mit der Registrierung bestätigst du, dass
              du mindestens 16 Jahre alt bist oder die entsprechende
              Einwilligung vorliegt.
            </p>

            <h3 className="font-semibold text-foreground">
              3.2 Accountdaten
            </h3>
            <p>
              Du bist verpflichtet, bei der Registrierung wahrheitsgemäße
              Angaben zu machen. Dein Passwort ist vertraulich zu behandeln.
              Du bist für alle Aktivitäten unter deinem Account verantwortlich.
            </p>

            <h3 className="font-semibold text-foreground">
              3.3 Account-Löschung
            </h3>
            <p>
              Du kannst deinen Account jederzeit löschen — auch außerhalb der
              Öffnungszeiten. Die Löschung ist unwiderruflich und umfasst alle
              deine gespeicherten Daten.
            </p>
          </section>

          {/* 4. Verhaltensregeln */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              4. Verhaltensregeln
            </h2>
            <p>Bei der Nutzung von twohrs ist Folgendes untersagt:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                Veröffentlichung von rechtswidrigen, beleidigenden,
                diskriminierenden, gewaltverherrlichenden oder
                pornografischen Inhalten
              </li>
              <li>
                Veröffentlichung von Inhalten, die gegen das Urheberrecht oder
                andere Schutzrechte Dritter verstoßen
              </li>
              <li>
                Verbreitung von Spam, Werbung oder unerwünschten kommerziellen
                Inhalten
              </li>
              <li>
                Belästigung, Bedrohung oder Einschüchterung anderer Nutzer
              </li>
              <li>
                Veröffentlichung personenbezogener Daten Dritter ohne deren
                Einwilligung (Doxxing)
              </li>
              <li>
                Versuche, die Plattform technisch zu manipulieren oder zu
                überlasten
              </li>
              <li>
                Erstellung mehrerer Accounts zur Umgehung von Sperren oder
                Einschränkungen
              </li>
              <li>
                Veröffentlichung von nicht jugendfreien Bildern (NSFW-Inhalte)
              </li>
            </ul>
          </section>

          {/* 5. Moderation */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              5. Moderation und Durchsetzung
            </h2>
            <p>
              twohrs behält sich das Recht vor, Inhalte zu entfernen, die
              gegen diese Nutzungsbedingungen verstoßen. Die Moderation
              erfolgt durch ein Verwarnungssystem:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong className="text-foreground">1. Verstoß:</strong>{" "}
                Der betreffende Inhalt wird entfernt.
              </li>
              <li>
                <strong className="text-foreground">2. Verstoß:</strong>{" "}
                Der Inhalt wird entfernt und du erhältst eine sichtbare
                Verwarnung.
              </li>
              <li>
                <strong className="text-foreground">3. Verstoß:</strong>{" "}
                Dein Account wird dauerhaft gesperrt und gelöscht.
              </li>
            </ul>
            <p>
              Zusätzlich erfolgt eine automatisierte Prüfung von
              hochgeladenen Bildern auf nicht jugendfreie Inhalte
              (NSFW-Erkennung). Bilder, die als nicht regelkonform
              eingestuft werden, werden automatisch abgelehnt.
            </p>
            <p>
              Wenn du der Meinung bist, dass eine Moderation zu Unrecht
              erfolgt ist, kannst du dich per E-Mail an uns wenden.
            </p>
          </section>

          {/* 6. Inhalte und Rechte */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              6. Inhalte und geistiges Eigentum
            </h2>
            <p>
              Du behältst alle Rechte an deinen Inhalten. Mit dem Hochladen
              räumst du twohrs ein einfaches, zeitlich auf die Dauer der
              Veröffentlichung begrenztes Nutzungsrecht ein, um deine Inhalte
              auf der Plattform anzuzeigen und (für Hall of Fame-Einträge) zu
              archivieren.
            </p>
            <p>
              Du stellst sicher, dass du über die erforderlichen Rechte an
              deinen Inhalten verfügst und keine Rechte Dritter verletzt
              werden.
            </p>
          </section>

          {/* 7. Haftung */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              7. Haftung
            </h2>
            <p>
              twohrs wird als kostenloser Dienst bereitgestellt. Die Haftung
              für leichte Fahrlässigkeit wird ausgeschlossen, soweit nicht
              wesentliche Vertragspflichten (Kardinalpflichten), Leben,
              Körper, Gesundheit oder Ansprüche nach dem Produkthaftungsgesetz
              betroffen sind.
            </p>
            <p>
              Für die Verfügbarkeit des Dienstes wird keine Garantie
              übernommen. twohrs kann jederzeit ohne Vorankündigung geändert,
              eingeschränkt oder eingestellt werden.
            </p>
            <p>
              Für nutzergenerierte Inhalte sind allein die jeweiligen Nutzer
              verantwortlich.
            </p>
          </section>

          {/* 8. Datenschutz */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              8. Datenschutz
            </h2>
            <p>
              Informationen zur Verarbeitung deiner personenbezogenen Daten
              findest du in unserer{" "}
              <Link
                href="/datenschutz"
                className="text-primary underline underline-offset-4"
              >
                Datenschutzerklärung
              </Link>
              .
            </p>
          </section>

          {/* 9. Kündigung */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              9. Kündigung
            </h2>
            <p>
              Du kannst die Nutzung von twohrs jederzeit beenden, indem du
              deinen Account löschst. Wir behalten uns vor, Accounts bei
              schwerwiegenden oder wiederholten Verstößen gegen diese
              Nutzungsbedingungen zu sperren oder zu löschen.
            </p>
          </section>

          {/* 10. Änderungen */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              10. Änderungen der Nutzungsbedingungen
            </h2>
            <p>
              Wir behalten uns vor, diese Nutzungsbedingungen bei Bedarf
              anzupassen. Wesentliche Änderungen werden auf der Plattform
              kommuniziert. Die weitere Nutzung nach einer Änderung gilt als
              Zustimmung zu den geänderten Bedingungen.
            </p>
          </section>

          {/* 11. Schlussbestimmungen */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              11. Schlussbestimmungen
            </h2>
            <p>
              Es gilt deutsches Recht. Sollten einzelne Bestimmungen dieser
              Nutzungsbedingungen unwirksam sein oder werden, bleibt die
              Wirksamkeit der übrigen Bestimmungen hiervon unberührt.
            </p>
          </section>

          {/* 12. Kontakt */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              12. Kontakt
            </h2>
            <p>
              Bei Fragen zu diesen Nutzungsbedingungen erreichst du uns unter:
            </p>
            <p>
              E-Mail:{" "}
              <a
                href="mailto:lorisgaller.business@gmail.com"
                className="text-primary underline underline-offset-4"
              >
                lorisgaller.business@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
