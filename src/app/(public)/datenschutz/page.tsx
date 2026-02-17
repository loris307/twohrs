import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzerklärung | twohrs",
};

export default function DatenschutzPage() {
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
            Datenschutzerklärung
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Stand: Februar 2026
          </p>
        </div>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          {/* 1. Verantwortlicher */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              1. Verantwortlicher
            </h2>
            <p>
              Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO)
              ist:
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
              Deutschland
              <br />
              E-Mail:{" "}
              <a
                href="mailto:lorisgaller.business@gmail.com"
                className="text-primary underline underline-offset-4"
              >
                lorisgaller.business@gmail.com
              </a>
            </p>
          </section>

          {/* 2. Übersicht der Verarbeitungen */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              2. Übersicht der Verarbeitungen
            </h2>
            <p>
              twohrs ist ein zeitbegrenztes soziales Netzwerk. Im Folgenden
              informieren wir dich über die Art, den Umfang und den Zweck der
              Erhebung und Verwendung deiner personenbezogenen Daten.
            </p>
          </section>

          {/* 3. Rechtsgrundlagen */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              3. Rechtsgrundlagen
            </h2>
            <p>
              Die Verarbeitung deiner Daten erfolgt auf Basis folgender
              Rechtsgrundlagen:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong className="text-foreground">
                  Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO):
                </strong>{" "}
                Registrierung, Anmeldung, Nutzung der Plattform-Funktionen
                (Posts, Kommentare, Upvotes, Follows, Mentions).
              </li>
              <li>
                <strong className="text-foreground">
                  Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO):
                </strong>{" "}
                Tägliche Löschung von Inhalten (Kernkonzept des Dienstes),
                Leaderboard-Archivierung, Sicherheit und Missbrauchsprävention,
                Moderation.
              </li>
              <li>
                <strong className="text-foreground">
                  Einwilligung (Art. 6 Abs. 1 lit. a DSGVO):
                </strong>{" "}
                Soweit wir dich um eine ausdrückliche Einwilligung bitten (z. B.
                bei zukünftigen Analyse-Cookies). Diese kann jederzeit
                widerrufen werden.
              </li>
            </ul>
          </section>

          {/* 4. Welche Daten wir erheben */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              4. Welche Daten wir erheben
            </h2>

            <h3 className="font-semibold text-foreground">
              4.1 Registrierung und Profil
            </h3>
            <p>Bei der Registrierung erheben wir:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>E-Mail-Adresse (Pflichtfeld, zur Anmeldung und Passwort-Zurücksetzung)</li>
              <li>Benutzername (Pflichtfeld, öffentlich sichtbar)</li>
              <li>Anzeigename (optional, öffentlich sichtbar)</li>
              <li>Passwort (verschlüsselt gespeichert, niemals im Klartext)</li>
            </ul>
            <p>Zusätzlich kannst du optional angeben:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Profilbild (Avatar)</li>
              <li>Bio-Text (max. 160 Zeichen)</li>
            </ul>
            <p>
              <strong className="text-foreground">Rechtsgrundlage:</strong>{" "}
              Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).
            </p>

            <h3 className="mt-4 font-semibold text-foreground">
              4.2 Nutzergenerierte Inhalte
            </h3>
            <p>
              Wenn du twohrs nutzt, verarbeiten wir folgende Inhalte, die du
              erstellst:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Posts (Bilder, Texte, Links mit Vorschau)</li>
              <li>Kommentare und Antworten</li>
              <li>Upvotes auf Posts und Kommentare</li>
              <li>@Erwähnungen anderer Nutzer</li>
              <li>Hashtags in Posts</li>
            </ul>
            <p>
              <strong className="text-foreground">Wichtig:</strong> Alle
              nutzergenerierten Inhalte (Posts, Kommentare, Upvotes,
              Erwähnungen, Hashtag-Zuordnungen) werden{" "}
              <strong className="text-foreground">täglich automatisch gelöscht</strong>.
              Dies ist ein Kernkonzept von twohrs.
            </p>

            <h3 className="mt-4 font-semibold text-foreground">
              4.3 Follow-Beziehungen und Hashtag-Abonnements
            </h3>
            <p>
              Wem du folgst und welche Hashtags du abonniert hast, wird
              dauerhaft gespeichert, um dir personalisierte Feeds anzeigen zu
              können. Du kannst Follows und Hashtag-Abonnements jederzeit
              aufheben.
            </p>

            <h3 className="mt-4 font-semibold text-foreground">
              4.4 Leaderboard und Hall of Fame
            </h3>
            <p>
              Täglich werden die Top-Nutzer in einem Leaderboard archiviert.
              Der beste Post des Tages wird in der &bdquo;Hall of Fame&ldquo; dauerhaft
              gespeichert, einschließlich der Top-3-Kommentare (Benutzername und
              Kommentartext). Dies dient dem Kernkonzept des Wettbewerbs.
            </p>
            <p>
              <strong className="text-foreground">Rechtsgrundlage:</strong>{" "}
              Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO). Bei
              Löschung deines Accounts werden auch deine Leaderboard- und Hall
              of Fame-Einträge entfernt.
            </p>

            <h3 className="mt-4 font-semibold text-foreground">
              4.5 Automatisch erhobene Daten
            </h3>
            <p>
              Bei der Nutzung von twohrs werden automatisch folgende technische
              Daten verarbeitet:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>IP-Adresse</li>
              <li>Browser-Typ und -Version</li>
              <li>Betriebssystem</li>
              <li>Zeitpunkt des Zugriffs</li>
              <li>User-Agent-String</li>
            </ul>
            <p>
              Diese Daten werden von unseren Hosting- und
              Authentifizierungsdiensten (siehe Abschnitt 6) verarbeitet und
              dienen der Sicherheit sowie der Bereitstellung des Dienstes.
            </p>

            <h3 className="mt-4 font-semibold text-foreground">
              4.6 Bilder und Medien
            </h3>
            <p>
              Hochgeladene Bilder (Posts und Avatare) werden in unserem
              Cloud-Speicher abgelegt. Wir entfernen automatisch
              EXIF-Metadaten (z. B. GPS-Standort, Kamerainformationen) aus
              hochgeladenen Bildern, bevor sie gespeichert werden. Post-Bilder
              werden täglich gelöscht. Avatare werden bei Entfernung oder
              Account-Löschung gelöscht.
            </p>
          </section>

          {/* 5. Cookies */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              5. Cookies
            </h2>
            <p>
              twohrs verwendet ausschließlich{" "}
              <strong className="text-foreground">technisch notwendige Cookies</strong>{" "}
              für die Authentifizierung. Wir verwenden keine Analyse-,
              Tracking- oder Werbe-Cookies.
            </p>

            <div className="overflow-x-auto">
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-4 font-semibold text-foreground">Cookie</th>
                    <th className="py-2 pr-4 font-semibold text-foreground">Zweck</th>
                    <th className="py-2 pr-4 font-semibold text-foreground">Dauer</th>
                    <th className="py-2 font-semibold text-foreground">Notwendig</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">sb-*-auth-token</td>
                    <td className="py-2 pr-4">Authentifizierungs-Session (Access- und Refresh-Token)</td>
                    <td className="py-2 pr-4">Session</td>
                    <td className="py-2">Ja</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">sb-*-auth-token-code-verifier</td>
                    <td className="py-2 pr-4">PKCE-Verifizierung bei der Anmeldung</td>
                    <td className="py-2 pr-4">Session</td>
                    <td className="py-2">Ja</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              Da wir ausschließlich technisch notwendige Cookies verwenden,
              ist gemäß § 25 Abs. 2 TDDDG keine gesonderte Einwilligung
              erforderlich. Wir informieren dich hiermit über deren Einsatz.
            </p>
          </section>

          {/* 6. Drittanbieter und Auftragsverarbeitung */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              6. Drittanbieter und Auftragsverarbeitung
            </h2>
            <p>
              Für den Betrieb von twohrs setzen wir folgende Dienstleister ein,
              mit denen jeweils Auftragsverarbeitungsverträge (AVV) gemäß Art.
              28 DSGVO geschlossen wurden:
            </p>

            <h3 className="mt-4 font-semibold text-foreground">
              6.1 Supabase (Datenbank, Authentifizierung, Speicher)
            </h3>
            <p>
              <strong className="text-foreground">Anbieter:</strong> Supabase
              Inc., San Francisco, USA
              <br />
              <strong className="text-foreground">Zweck:</strong> Datenbank
              (PostgreSQL), Benutzer-Authentifizierung, Dateispeicher für Bilder
              <br />
              <strong className="text-foreground">Verarbeitete Daten:</strong>{" "}
              E-Mail-Adresse, Passwort (verschlüsselt), Profildaten, Posts,
              Kommentare, Upvotes, Follows, hochgeladene Bilder, IP-Adresse,
              User-Agent (in Audit-Logs)
              <br />
              <strong className="text-foreground">Serverstandort:</strong>{" "}
              EU (Irland / AWS eu-west-1)
              <br />
              <strong className="text-foreground">
                Datenübermittlung in Drittländer:
              </strong>{" "}
              Supabase ist ein US-Unternehmen. Die Datenübermittlung erfolgt auf
              Grundlage von EU-Standardvertragsklauseln (SCCs) gemäß Art. 46
              Abs. 2 lit. c DSGVO. Ein Transfer Impact Assessment (TIA) liegt
              vor.
              <br />
              <strong className="text-foreground">Datenschutz:</strong>{" "}
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                supabase.com/privacy
              </a>
            </p>

            <h3 className="mt-4 font-semibold text-foreground">
              6.2 Vercel (Hosting)
            </h3>
            <p>
              <strong className="text-foreground">Anbieter:</strong> Vercel
              Inc., San Francisco, USA
              <br />
              <strong className="text-foreground">Zweck:</strong> Hosting der
              Website, Bereitstellung von Server-Funktionen, CDN
              <br />
              <strong className="text-foreground">Verarbeitete Daten:</strong>{" "}
              IP-Adresse, Browser-Informationen, Zugriffsdaten
              <br />
              <strong className="text-foreground">
                Datenübermittlung in Drittländer:
              </strong>{" "}
              Vercel ist unter dem EU-US Data Privacy Framework (DPF) gemäß
              Art. 45 DSGVO zertifiziert. Zusätzlich gelten
              EU-Standardvertragsklauseln (SCCs) als ergänzende Schutzmaßnahme.
              <br />
              <strong className="text-foreground">Datenschutz:</strong>{" "}
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                vercel.com/legal/privacy-policy
              </a>
            </p>

            <h3 className="mt-4 font-semibold text-foreground">
              6.3 Cloudflare Turnstile (Sicherheit)
            </h3>
            <p>
              <strong className="text-foreground">Anbieter:</strong> Cloudflare
              Inc., San Francisco, USA
              <br />
              <strong className="text-foreground">Zweck:</strong> CAPTCHA-Schutz
              bei Registrierung, Anmeldung und Passwort-Zurücksetzung zum
              Schutz vor automatisierten Angriffen
              <br />
              <strong className="text-foreground">Verarbeitete Daten:</strong>{" "}
              IP-Adresse, Browser-Fingerprint, Verhaltensdaten
              <br />
              <strong className="text-foreground">
                Datenübermittlung in Drittländer:
              </strong>{" "}
              Cloudflare ist unter dem EU-US Data Privacy Framework zertifiziert.
              <br />
              <strong className="text-foreground">Rechtsgrundlage:</strong>{" "}
              Berechtigtes Interesse an der Sicherheit des Dienstes (Art. 6
              Abs. 1 lit. f DSGVO).
              <br />
              <strong className="text-foreground">Datenschutz:</strong>{" "}
              <a
                href="https://www.cloudflare.com/privacypolicy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                cloudflare.com/privacypolicy
              </a>
            </p>
          </section>

          {/* 7. Speicherdauer */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              7. Speicherdauer
            </h2>
            <div className="overflow-x-auto">
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-4 font-semibold text-foreground">Datenart</th>
                    <th className="py-2 font-semibold text-foreground">Speicherdauer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-2 pr-4">Posts, Kommentare, Upvotes, Erwähnungen, Hashtag-Zuordnungen</td>
                    <td className="py-2">Täglich automatisch gelöscht (gegen Mitternacht)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Post-Bilder</td>
                    <td className="py-2">Täglich automatisch gelöscht</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Profildaten (Username, E-Mail, Bio, Avatar)</td>
                    <td className="py-2">Bis zur Account-Löschung</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Follow-Beziehungen, Hashtag-Abonnements</td>
                    <td className="py-2">Bis zur Aufhebung oder Account-Löschung</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Leaderboard-Einträge</td>
                    <td className="py-2">Bis zur Account-Löschung</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Hall of Fame (Top-Post des Tages)</td>
                    <td className="py-2">Bis zur Account-Löschung</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Authentifizierungs-Audit-Logs (IP, User-Agent)</td>
                    <td className="py-2">Gemäß Supabase-Aufbewahrungsrichtlinie</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 8. Deine Rechte */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              8. Deine Rechte
            </h2>
            <p>
              Du hast gemäß DSGVO folgende Rechte bezüglich deiner
              personenbezogenen Daten:
            </p>

            <h3 className="font-semibold text-foreground">
              8.1 Auskunftsrecht (Art. 15 DSGVO)
            </h3>
            <p>
              Du hast das Recht, Auskunft über deine bei uns gespeicherten
              personenbezogenen Daten zu erhalten. Über die Funktion &bdquo;Meine
              Daten herunterladen&ldquo; in den Einstellungen kannst du jederzeit
              einen vollständigen Datenexport im JSON-Format herunterladen.
            </p>

            <h3 className="font-semibold text-foreground">
              8.2 Recht auf Berichtigung (Art. 16 DSGVO)
            </h3>
            <p>
              Du kannst deine Profildaten (Anzeigename, Bio, Avatar) jederzeit
              in den Einstellungen ändern.
            </p>

            <h3 className="font-semibold text-foreground">
              8.3 Recht auf Löschung (Art. 17 DSGVO)
            </h3>
            <p>
              Du kannst deinen Account jederzeit vollständig löschen — auch
              außerhalb der Öffnungszeiten. Die Löschung umfasst:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Dein Profil und alle Profildaten</li>
              <li>Alle deine Posts, Kommentare und Upvotes</li>
              <li>Alle hochgeladenen Bilder</li>
              <li>Alle Follow-Beziehungen</li>
              <li>Leaderboard- und Hall of Fame-Einträge</li>
              <li>Dein Authentifizierungs-Konto</li>
            </ul>
            <p>
              Die Löschung erfolgt unmittelbar und ist unwiderruflich. Du
              findest die Löschfunktion in den Einstellungen unter &bdquo;Account
              löschen&ldquo;.
            </p>

            <h3 className="font-semibold text-foreground">
              8.4 Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)
            </h3>
            <p>
              Du kannst die Einschränkung der Verarbeitung deiner Daten
              verlangen. Kontaktiere uns hierzu per E-Mail.
            </p>

            <h3 className="font-semibold text-foreground">
              8.5 Recht auf Datenübertragbarkeit (Art. 20 DSGVO)
            </h3>
            <p>
              Über die Funktion &bdquo;Meine Daten herunterladen&ldquo; in den
              Einstellungen erhältst du deine Daten in einem strukturierten,
              gängigen und maschinenlesbaren Format (JSON).
            </p>

            <h3 className="font-semibold text-foreground">
              8.6 Widerspruchsrecht (Art. 21 DSGVO)
            </h3>
            <p>
              Sofern die Verarbeitung deiner Daten auf einem berechtigten
              Interesse (Art. 6 Abs. 1 lit. f DSGVO) beruht, hast du das
              Recht, aus Gründen, die sich aus deiner besonderen Situation
              ergeben, Widerspruch einzulegen. Kontaktiere uns hierzu per
              E-Mail.
            </p>

            <h3 className="font-semibold text-foreground">
              8.7 Recht auf Widerruf der Einwilligung (Art. 7 Abs. 3 DSGVO)
            </h3>
            <p>
              Soweit du eine Einwilligung zur Datenverarbeitung erteilt hast,
              kannst du diese jederzeit widerrufen. Die Rechtmäßigkeit der bis
              zum Widerruf erfolgten Verarbeitung bleibt unberührt.
            </p>

            <h3 className="font-semibold text-foreground">
              8.8 Beschwerderecht bei einer Aufsichtsbehörde (Art. 77 DSGVO)
            </h3>
            <p>
              Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde
              über die Verarbeitung deiner personenbezogenen Daten zu
              beschweren. Die zuständige Aufsichtsbehörde richtet sich nach
              deinem Wohnort. Eine Liste der Aufsichtsbehörden findest du
              unter:{" "}
              <a
                href="https://www.bfdi.bund.de/DE/Service/Anschriften/Laender/Laender-node.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                bfdi.bund.de
              </a>
            </p>
          </section>

          {/* 9. Sicherheit */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              9. Sicherheit
            </h2>
            <p>
              Wir setzen technische und organisatorische Maßnahmen ein, um
              deine Daten zu schützen:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Verschlüsselte Übertragung aller Daten via HTTPS/TLS</li>
              <li>Verschlüsselte Speicherung von Passwörtern (bcrypt)</li>
              <li>Row Level Security (RLS) auf Datenbankebene</li>
              <li>Automatische Entfernung von EXIF-Metadaten aus Bildern</li>
              <li>Tägliche automatische Löschung von Inhalten (Privacy by Design)</li>
              <li>CAPTCHA-Schutz gegen automatisierte Angriffe</li>
            </ul>
          </section>

          {/* 10. Minderjährige */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              10. Minderjährige
            </h2>
            <p>
              twohrs richtet sich an Personen ab 16 Jahren. Die Nutzung durch
              Personen unter 16 Jahren ist nur mit Einwilligung eines
              Erziehungsberechtigten gestattet (Art. 8 DSGVO i. V. m. § 2
              BDSG). Bei der Registrierung bestätigst du, dass du mindestens 16
              Jahre alt bist oder die Einwilligung deiner
              Erziehungsberechtigten hast.
            </p>
          </section>

          {/* 11. Link-Vorschau */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              11. Link-Vorschau (OG-Metadaten)
            </h2>
            <p>
              Wenn du einen Link in deinem Post teilst, ruft unser Server die
              Metadaten (Titel, Beschreibung, Vorschaubild) der verlinkten
              Website ab. Dies geschieht serverseitig — deine IP-Adresse wird
              dabei nicht an die verlinkte Website übermittelt. Die
              Vorschaubilder werden jedoch vom Browser der Betrachter direkt
              vom externen Server geladen, wobei deren IP-Adresse an den
              externen Server übermittelt werden kann.
            </p>
          </section>

          {/* 12. E-Mail-Kommunikation */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              12. E-Mail-Kommunikation
            </h2>
            <p>
              Wir senden ausschließlich transaktionale E-Mails, die für die
              Nutzung des Dienstes notwendig sind:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Passwort-Zurücksetzung</li>
              <li>E-Mail-Bestätigung (sofern aktiviert)</li>
            </ul>
            <p>
              Wir versenden keine Werbe-E-Mails oder Newsletter. Die E-Mails
              werden über die Infrastruktur unseres
              Authentifizierungsdienstleisters (Supabase) versendet.
            </p>
          </section>

          {/* 13. Keine automatisierte Entscheidungsfindung */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              13. Automatisierte Entscheidungsfindung
            </h2>
            <p>
              twohrs nutzt eine automatisierte Bildanalyse zur Erkennung von
              nicht jugendfreien Inhalten (NSFW-Erkennung). Diese Analyse
              erfolgt serverseitig beim Hochladen von Bildern. Falls ein Bild
              als nicht regelkonform eingestuft wird, wird es automatisch
              abgelehnt. Du hast das Recht, die Entscheidung durch uns
              überprüfen zu lassen — kontaktiere uns hierzu per E-Mail.
            </p>
            <p>
              Darüber hinaus findet keine automatisierte Entscheidungsfindung
              oder Profiling im Sinne von Art. 22 DSGVO statt.
            </p>
          </section>

          {/* 14. Änderungen */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              14. Änderungen dieser Datenschutzerklärung
            </h2>
            <p>
              Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf
              anzupassen, z. B. bei Änderungen unseres Dienstes oder
              gesetzlicher Vorgaben. Die aktuelle Version findest du stets auf
              dieser Seite.
            </p>
          </section>

          {/* 15. Kontakt */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              15. Kontakt
            </h2>
            <p>
              Bei Fragen zum Datenschutz oder zur Ausübung deiner Rechte
              erreichst du uns unter:
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
