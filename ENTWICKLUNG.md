# Entwicklungsgeschichte: 2Hours

> Diese Datei dokumentiert die Reihenfolge und Begründung aller Features. Wird fortlaufend aktualisiert.

---

## Phase 0: Die Idee & der Plan

**Inspiration:** seven39.com — ein soziales Netzwerk, das nur 3 Stunden am Tag offen ist. Konzept: "Anti-Attention-Economy".

**Die Idee:** Ein eigenes zeitbegrenztes soziales Netzwerk. Nutzer posten Memes, voten sich gegenseitig hoch, und am Ende des Tages gibt es ein Leaderboard — wer war die lustigste Person? Um Mitternacht wird alles gelöscht. Jeden Tag fängt man bei null an.

**Der Plan:** Claude Code hat einen 668-Zeilen-Umsetzungsplan erstellt (`PLAN.md`) — komplettes Datenbankschema, alle Features, Implementierungsreihenfolge, Tech Stack.

---

## Phase 1: MVP

Claude Code hat den gesamten Plan funktionierend umgesetzt (88 Dateien, 9.121 Zeilen):

- **Auth-System** — Login, Signup, Email-Verifizierung
- **Feed** — Chronologisch, Infinite Scroll
- **Post-Erstellung** — Bild-Upload mit Kompression + Caption
- **Upvoting** — Toggle mit Optimistic UI
- **Leaderboard** — Live-Ranking + historisches Archiv
- **Profile** — Avatar, Bio, Stats, Follow/Unfollow
- **Settings** — Profil bearbeiten, Logout, Account löschen
- **4-Schichten Time-Gating** — Middleware, RLS, Server Actions, Client UI
- **Täglicher Cleanup** — Cron-Jobs für Archivierung + Löschung
- **Responsive Design** — Dark Theme, Navbar + Bottom-Nav

---

## Phase 2: Viraler Signup-Flow

**Warum:** Email-Verifizierung hatte zu viel Friction. Stattdessen: Nutzer müssen die App auf WhatsApp teilen, bevor ihr Account erstellt wird — virales Wachstum.

- Email-Verifizierung entfernt
- Zweistufiger Signup: Formular → WhatsApp teilen → Account
- Share-Gate nur auf Mobile (Desktop kann direkt registrieren)

---

## Phase 3: Kommentare, neue Post-Typen & Hall of Fame

**Warum:** Das MVP war nur ein Meme-Board. Für ein echtes soziales Netzwerk fehlte Interaktion (Kommentare), Content-Vielfalt (Text/Links) und ein Anreiz langfristig dabei zu bleiben (Hall of Fame).

### Kommentar-System
- Kommentare unter jedem Post (aufklappbar)
- Kommentar-Upvoting, sortiert nach Votes
- **Begründung:** Ohne Kommentare gab es keine Diskussion — nur stilles Upvoten.

### Text-Only & Link-Posts
- Posts brauchen kein Bild mehr — reiner Text oder Links mit OG-Preview möglich
- **Begründung:** Nicht jeder hat ein Meme parat. Text-Posts senken die Hürde zum Posten. Links ermöglichen das Teilen von externem Content.

### Feed-Tabs (Live, Hot, Following)
- **Begründung:** Ein chronologischer Feed reicht nicht. "Hot" zeigt die besten Posts, "Following" filtert auf Leute die man kennt.

### Hall of Fame
- Bester Post jedes Tages wird dauerhaft archiviert (mit Top-3-Kommentaren)
- **Begründung:** Tägliches Löschen ist das Kernkonzept — aber die allerbesten Momente verdienen es, erhalten zu bleiben.

### Weitere Ergänzungen
- Share-Button an jedem Post
- Favicon (gelbe "2" auf schwarz)

---

## Phase 4: Zeitfenster-Änderung & Infrastruktur

**Warum:** 20–22 Uhr war zu früh. 23–02 Uhr passt besser zur Zielgruppe (junge Leute, Late-Night-Vibe). Das erforderte technische Anpassungen.

- Zeitfenster von 20–22 auf 23–02 Uhr geändert (konfigurierbar via Env-Vars)
- Mitternachts-Überschreitung: Alle Zeitberechnungen angepasst
- Cron-Jobs von Vercel auf PostgreSQL pg_cron migriert (zuverlässiger)

---

## Phase 5: Kommentar-Antworten

**Warum:** Kommentare waren flach — man konnte nicht auf einen bestimmten Kommentar antworten. Das fehlte für echte Diskussionen.

- One-Level Replies (eine Antwort-Ebene)
- Antworten eingerückt dargestellt

---

## Phase 6: @Mentions

**Warum:** Man konnte niemanden direkt ansprechen. @Mentions machen das Netzwerk persönlicher und erhöhen Engagement (Benachrichtigung wenn man erwähnt wird).

- `@username` in Posts und Kommentaren
- Autocomplete-Dropdown mit Keyboard-Navigation
- Unread-Badge in Navbar/Bottom-Nav
- "Erwähnungen"-Tab im eigenen Profil
- Mentions als klickbare Profillinks

---

## Phase 7: Post-Detailseite

**Warum:** Posts waren nur im Feed sichtbar. Zum Teilen und für Deep-Links brauchte es eine eigene URL pro Post.

- `/post/[id]` mit vollem Kommentar-Thread
- OG-Metadaten zum Teilen (Caption als Titel, Bild als Preview)
- Share-Button teilt jetzt den direkten Post-Link

---

## Phase 8: User-Suche

**Warum:** Man konnte andere User nur finden, wenn man ihren Post im Feed sah. Suche macht das Netzwerk navigierbar.

- `/search` — Suche nach Username oder Display-Name
- Debounced Prefix-Suche, max 20 Ergebnisse

---

## Phase 9: Neue-Posts-Banner

**Warum:** Im Feed sah man neue Posts erst nach manuellem Refresh. Das Banner zeigt "X neue Posts" und hält den Feed lebendig.

- Pollt alle 15 Sekunden nach neuen Posts
- Floating-Banner, Klick refreshed den Feed
- Pausiert wenn Browser-Tab im Hintergrund

---

## Phase 10: Settings-Erweiterung & GDPR-Export

**Warum:** Die Settings waren minimal. Für ein ernsthaftes Produkt braucht man Email/Passwort-Änderung und GDPR-Compliance.

- Email ändern, Passwort ändern
- Avatar entfernen
- Daten exportieren (vollständiger JSON-Download)
- Account löschen: Räumt jetzt auch Storage-Dateien auf

---

## Phase 11: UI-Polish

Diverse UX-Verbesserungen:

- **Follow-Button auf Post-Cards** — Man sieht sofort ob man jemandem folgt
- **Navigations-Fortschrittsbalken** — Visuelles Feedback beim Seitenwechsel
- **Profil-Tabs** — "Posts" und "Erwähnungen" getrennt
- **Leaderboard-Archiv-Tabs** — "Tagessieger" und "Meiste Follower"
- **Active Users Count** — Zeigt wie viele User registriert sind
- **Navbar: "Suche" statt "Settings"** — Suche ist wichtiger als Settings im Hauptmenü

---

## Phase 12: Hashtags

**Warum:** Content-Discovery war bisher nur über User-Suche und den Feed möglich. Hashtags ermöglichen thematische Entdeckung — man kann Themen folgen, nicht nur Personen. Der "Folgend"-Tab im Feed zeigt jetzt auch Posts mit gefolgten Hashtags.

- `#hashtag` in Post-Captions werden erkannt und gespeichert (max 10 pro Post)
- Hashtags als klickbare Links in Captions gerendert (→ `/search/hashtag/[tag]`)
- Hashtag-Detailseite: Alle Posts mit einem Hashtag, sortiert nach Upvotes
- Hashtag folgen/entfolgen — gefolgte Hashtags erscheinen im "Folgend"-Feed
- Suche umbenannt zu "Entdecken" mit Compass-Icon
- `#`-Prefix in Suche zeigt Hashtags des Tages mit Post-Count
- Normaler Text sucht weiter nach Usern
- Hashtag-Follows sind persistent (überleben Daily Cleanup)
- Post-Hashtags werden täglich gelöscht (mit Posts)
- GDPR-Export um Hashtag-Follows erweitert

---

## Phase 13: Admin-Moderation mit Strike-System

**Warum:** Wenn die Plattform wächst, braucht man Moderation. Kein überladenes Admin-Dashboard — einfach `is_admin` Flag in Supabase setzen, und Admins können unangemessene Posts direkt im Feed löschen. Das Strike-System (3 Strikes = Account gelöscht) automatisiert die Konsequenzen.

- `is_admin` Boolean + `moderation_strikes` Integer auf Profiles (manuell in DB setzen)
- Admins sehen Shield-Icon bei fremden Posts → Bestätigung → Post gelöscht
- Strike 1: Stille Löschung
- Strike 2: Löschung + Warnungs-Banner für den User ("Verwarnung 2/3")
- Strike 3: Automatische Account-Löschung (Storage + Auth-User, kaskadiert)
- Admins können auch Kommentare löschen (ohne Strikes)
- Toast-Feedback für Admins: "Strike X/3 für @username — Post gelöscht / Warnung / Account gelöscht"
- RLS-Policies aktualisiert: Admins dürfen beliebige Posts/Kommentare löschen
- Moderation funktioniert unabhängig vom Zeitfenster
- Migration 021

---

## Phase 14: Kontoverwaltung außerhalb des Zeitfensters

**Warum:** Nutzer müssen ihre Daten auch dann verwalten und löschen können, wenn die App geschlossen ist (z.B. GDPR-Recht auf Löschung). Vorher gab es keinen sichtbaren Weg von der Startseite zu den Einstellungen, wenn die App zu war — obwohl das Backend es bereits erlaubte.

- Eigenständige `/account`-Seite in der `(public)` Route Group — komplett unabhängig vom App-Shell
- Minimaler Header (Logo + Zurück-Link), kein Navbar/Feed/Bottom-Nav
- "Konto verwalten"-Button auf der Startseite für eingeloggte Nutzer (wenn App geschlossen)
- Nutzt die bestehende `SettingsForm`-Komponente (kein Code dupliziert)
- `/account` in `ALWAYS_ACCESSIBLE_ROUTES` — funktioniert 24/7, erfordert aber Auth
- Alle Server Actions (deleteAccount, changePassword, changeEmail, etc.) haben kein Time-Gate

---

## Feature-Evolution

```
Plan       → Meme-Board (Bild + Caption, Upvotes, Leaderboard)
MVP        → + Auth, Feed, Profiles, Settings, Time-Gating, Cleanup
Phase 2    → + Viraler Signup (Share-Gate)
Phase 3    → + Kommentare, Text-Posts, Links, Feed-Tabs, Hall of Fame
Phase 4    → + 23–02 Uhr Zeitfenster, pg_cron
Phase 5    → + Kommentar-Antworten
Phase 6    → + @Mentions mit Autocomplete & Unread-Tracking
Phase 7    → + Post-Detailseite mit OG-Sharing
Phase 8    → + User-Suche
Phase 9    → + Neue-Posts-Banner (Polling)
Phase 10   → + Settings-Erweiterung, GDPR-Export
Phase 11   → + UI-Polish (Follow-Buttons, Progress-Bar, Tabs)
Phase 12   → + Hashtags (Folgen, Entdecken-Seite, Feed-Integration)
Phase 13   → + Admin-Moderation mit Strike-System
Phase 14   → + Kontoverwaltung außerhalb des Zeitfensters
```
