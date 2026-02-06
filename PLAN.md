# Vollständiger Umsetzungsplan: "2Hours" — Zeitbegrenztes Soziales Netzwerk

## Projektbeschreibung

Ein soziales Netzwerk, das nur 2 Stunden am Tag geöffnet hat (20:00-22:00 CET). Nutzer posten Memes (Bilder + kurze Caption), geben sich gegenseitig Upvotes, und am Ende des Tages wird ein Leaderboard erstellt, wer die meisten Upvotes bekommen hat ("lustigste Person des Tages"). Um Mitternacht wird sämtlicher Content gelöscht — jeden Tag beginnt alles von Null. Marketing-Claim: "Anti-Attention-Economy".

Inspiriert von seven39.com (gleiches Konzept mit 3h-Fenster, Next.js + React, nur abends verfügbar).

---

## Zielplattform & Tech Stack

| Komponente | Technologie | Version |
|---|---|---|
| Frontend + Backend | Next.js (App Router) | 15.x |
| Sprache | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| UI-Komponenten | shadcn/ui | latest |
| Datenbank | Supabase (PostgreSQL) | - |
| Auth | Supabase Auth | - |
| Media Storage | Supabase Storage | - |
| Icons | lucide-react | latest |
| Zeitberechnung | date-fns + date-fns-tz | 4.x / 3.x |
| Validierung | zod | 3.x |
| Bildkompression | browser-image-compression | 2.x |
| CSS Utils | tailwind-merge, clsx | 2.x |
| Deployment Frontend | Vercel | - |
| Deployment Backend | Supabase Cloud | - |

**Dev Dependencies:** typescript, tailwindcss, @types/react, @types/node, supabase CLI

---

## Gesamtstruktur des Projekts

Das Projekt wird als einzelnes Next.js-Monorepo aufgebaut. Alle Dateien liegen unter `src/`.

### Verzeichnisbaum

```
social_network/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (public)/                 # Route-Gruppe: Immer zugänglich (kein Auth, kein Zeitfenster nötig)
│   │   │   ├── page.tsx              # Landing-Page mit Countdown (wenn geschlossen) oder Redirect zu /feed (wenn offen + eingeloggt)
│   │   │   ├── about/
│   │   │   │   └── page.tsx          # "Anti-Attention-Economy" Manifesto-Seite
│   │   │   └── layout.tsx            # Layout ohne Navigation
│   │   │
│   │   ├── (auth)/                   # Route-Gruppe: Auth-Seiten
│   │   │   └── auth/
│   │   │       ├── login/
│   │   │       │   └── page.tsx      # Login-Formular (Email + Passwort)
│   │   │       ├── signup/
│   │   │       │   └── page.tsx      # Signup-Formular (Email, Passwort, Username, Display Name)
│   │   │       └── callback/
│   │   │           └── route.ts      # Supabase Auth Callback Handler (für Email-Bestätigung)
│   │   │
│   │   ├── (app)/                    # Route-Gruppe: Authentifiziert + Zeitfenster-beschränkt
│   │   │   ├── feed/
│   │   │   │   └── page.tsx          # Haupt-Feed mit allen Posts (chronologisch, infinite scroll)
│   │   │   ├── create/
│   │   │   │   └── page.tsx          # Neuen Post erstellen (Bild-Upload + Caption)
│   │   │   ├── leaderboard/
│   │   │   │   ├── page.tsx          # Live-Leaderboard des heutigen Tages (zeitbeschränkt)
│   │   │   │   └── history/
│   │   │   │       └── page.tsx      # Historisches Leaderboard-Archiv (immer zugänglich)
│   │   │   ├── profile/
│   │   │   │   └── [username]/
│   │   │   │       └── page.tsx      # Profil eines Users (Avatar, Bio, Stats, heutige Posts)
│   │   │   ├── settings/
│   │   │   │   └── page.tsx          # Profil bearbeiten, Logout, Account löschen
│   │   │   └── layout.tsx            # App-Layout: Navbar oben, Bottom-Nav mobil, Time-Banner
│   │   │
│   │   ├── api/
│   │   │   └── cron/                 # Vercel Cron Endpoints (Backup zu pg_cron)
│   │   │       ├── archive-leaderboard/
│   │   │       │   └── route.ts      # Leaderboard archivieren
│   │   │       └── cleanup/
│   │   │           └── route.ts      # Täglichen Content löschen
│   │   │
│   │   ├── layout.tsx                # Root-Layout: Providers, Fonts, Meta, Dark Theme
│   │   ├── globals.css               # Tailwind-Imports + globale Styles
│   │   └── not-found.tsx             # 404-Seite
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui Basis-Komponenten (Button, Input, Card, Dialog, Avatar, Badge, Skeleton, Toast, etc.)
│   │   ├── layout/
│   │   │   ├── navbar.tsx            # Desktop-Navigation (Logo, Feed, Leaderboard, Create, Profile)
│   │   │   ├── bottom-nav.tsx        # Mobile Bottom-Navigation (gleiche Links als Icons)
│   │   │   ├── time-banner.tsx       # Sticky Banner: "Noch X Minuten" mit Fortschrittsbalken
│   │   │   └── footer.tsx            # Minimaler Footer
│   │   ├── feed/
│   │   │   ├── post-card.tsx         # Einzelner Post: Avatar+Username, Bild, Caption, Upvote-Button+Count, Zeitangabe
│   │   │   ├── post-grid.tsx         # Liste/Grid aller Posts mit Infinite Scroll
│   │   │   ├── upvote-button.tsx     # Upvote-Interaktion mit Optimistic UI
│   │   │   ├── feed-toggle.tsx       # Toggle: "Alle" / "Following" (Following erst ab Phase 2)
│   │   │   └── feed-skeleton.tsx     # Lade-Skelett für Feed
│   │   ├── create/
│   │   │   ├── image-upload.tsx      # Drag-and-Drop oder Klick zum Bild-Auswählen, Vorschau
│   │   │   └── create-post-form.tsx  # Gesamtes Erstellungsformular (Upload + Caption + Submit)
│   │   ├── leaderboard/
│   │   │   ├── leaderboard-table.tsx # Ranking-Tabelle mit allen Platzierungen
│   │   │   ├── leaderboard-podium.tsx# Top 3 hervorgehoben (Gold/Silber/Bronze)
│   │   │   └── leaderboard-entry.tsx # Einzelne Zeile im Ranking
│   │   ├── profile/
│   │   │   ├── profile-header.tsx    # Avatar, Name, Bio, Follow-Button, Follower/Following-Count
│   │   │   ├── profile-stats.tsx     # Lifetime-Statistiken
│   │   │   └── follow-button.tsx     # Follow/Unfollow-Button
│   │   ├── countdown/
│   │   │   ├── countdown-timer.tsx   # Großer Countdown auf der Landing-Page ("Öffnet in X:XX:XX")
│   │   │   ├── session-timer.tsx     # Kleiner Timer im Header ("Noch 47 Min")
│   │   │   └── session-ended-modal.tsx # Modal-Overlay wenn die Session endet
│   │   └── providers/
│   │       ├── supabase-provider.tsx  # React Context für den Browser-Supabase-Client
│   │       └── theme-provider.tsx     # Dark/Light Theme Provider
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts            # Supabase-Client für Browser (createBrowserClient)
│   │   │   ├── server.ts            # Supabase-Client für Server Components/Actions (createServerClient mit Cookies)
│   │   │   ├── middleware.ts         # Supabase-Client für Middleware (createServerClient mit Request/Response)
│   │   │   └── admin.ts             # Supabase-Client mit Service Role Key (für Cron-Jobs, bypassed RLS)
│   │   ├── actions/                  # Next.js Server Actions ("use server")
│   │   │   ├── posts.ts             # createPost (Bild validieren, Zeitfenster prüfen, in DB speichern), deletePost
│   │   │   ├── votes.ts             # toggleVote (Upvote geben oder zurücknehmen)
│   │   │   ├── follows.ts           # followUser, unfollowUser
│   │   │   ├── profile.ts           # updateProfile (Name, Bio, Avatar ändern)
│   │   │   └── auth.ts              # signUp, signIn, signOut (Wrapper um Supabase Auth)
│   │   ├── queries/                  # Datenbankabfragen für Server Components
│   │   │   ├── posts.ts             # getFeed (alle Posts, paginiert), getPostsByUser
│   │   │   ├── leaderboard.ts       # getTodayLeaderboard, getLeaderboardHistory
│   │   │   └── profile.ts           # getProfile, getFollowers, getFollowing, getUserStats
│   │   ├── hooks/                    # Custom React Hooks
│   │   │   ├── use-countdown.ts     # Countdown-Logik bis zur nächsten Öffnung
│   │   │   ├── use-time-gate.ts     # Aktueller Zustand: offen/geschlossen, verbleibende Zeit
│   │   │   └── use-infinite-feed.ts # Infinite Scroll mit Cursor-basierter Pagination
│   │   ├── utils/
│   │   │   ├── time.ts              # isAppOpen(), getNextOpenTime(), getTimeRemaining() — alles in Europe/Berlin
│   │   │   ├── image.ts             # Bildvalidierung (Typ, Größe), Kompression
│   │   │   ├── format.ts            # Zahlenformatierung, relative Zeitangaben ("vor 5 Min")
│   │   │   └── cn.ts                # Tailwind Class-Merge Utility (clsx + tailwind-merge)
│   │   ├── constants.ts             # OPEN_HOUR=20, CLOSE_HOUR=22, TIMEZONE="Europe/Berlin", MAX_POSTS=10, MAX_CAPTION=280, MAX_IMAGE_SIZE_MB=5
│   │   ├── types.ts                 # TypeScript-Typen: Post, Profile, Vote, LeaderboardEntry, etc.
│   │   └── validations.ts           # Zod-Schemas: createPostSchema, updateProfileSchema, etc.
│   │
│   └── middleware.ts                 # Next.js Middleware: Time-Gating + Auth-Session-Refresh
│
├── supabase/
│   ├── migrations/                   # SQL-Migrationsdateien (in dieser Reihenfolge ausführen)
│   │   ├── 001_create_profiles.sql
│   │   ├── 002_create_posts.sql
│   │   ├── 003_create_votes.sql
│   │   ├── 004_create_follows.sql
│   │   ├── 005_create_daily_leaderboard.sql
│   │   ├── 006_create_app_config.sql
│   │   ├── 007_create_functions.sql       # is_app_open(), handle_new_user(), handle_vote_change()
│   │   ├── 008_create_triggers.sql        # Trigger für Signup und Votes
│   │   ├── 009_create_rls_policies.sql    # Alle RLS-Policies
│   │   ├── 010_create_storage.sql         # Bucket + Storage-Policies
│   │   └── 011_create_cron_jobs.sql       # pg_cron Jobs
│   ├── functions/
│   │   └── cleanup-storage/
│   │       └── index.ts                   # Supabase Edge Function: Alle Dateien im memes-Bucket löschen
│   └── seed.sql                           # Initiale Config-Werte für app_config
│
├── public/
│   ├── favicon.ico
│   └── og-image.png                       # Social-Sharing-Bild
│
├── .env.local                             # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET
├── .env.example                           # Template mit Platzhaltern
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── vercel.json                            # Cron-Job-Config als Backup
└── .gitignore
```

---

## Datenbank-Design (Detailliert)

### Tabelle: `profiles`
Erweitert die Supabase-interne `auth.users` Tabelle um öffentliche Profildaten. Wird automatisch per Trigger erstellt, wenn ein neuer User sich anmeldet.

| Spalte | Typ | Constraints | Beschreibung |
|---|---|---|---|
| id | UUID | PK, FK → auth.users(id) ON DELETE CASCADE | User-ID von Supabase Auth |
| username | TEXT | UNIQUE, NOT NULL | Eindeutiger Username |
| display_name | TEXT | nullable | Anzeigename |
| avatar_url | TEXT | nullable | URL zum Avatar-Bild |
| bio | TEXT | CHECK(length <= 160) | Kurzbeschreibung |
| total_upvotes_received | INTEGER | DEFAULT 0 | Lifetime-Gesamtzahl erhaltener Upvotes |
| total_posts_created | INTEGER | DEFAULT 0 | Lifetime-Gesamtzahl erstellter Posts |
| days_won | INTEGER | DEFAULT 0 | Wie oft Platz 1 im Leaderboard |
| created_at | TIMESTAMPTZ | DEFAULT now() | Erstellungszeitpunkt |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Letzte Änderung |

Index auf `username` für schnelle Lookups.

### Tabelle: `posts`
Täglicher Content. Wird jeden Tag um Mitternacht komplett gelöscht.

| Spalte | Typ | Constraints | Beschreibung |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | Post-ID |
| user_id | UUID | NOT NULL, FK → profiles(id) ON DELETE CASCADE | Ersteller |
| image_url | TEXT | NOT NULL | Öffentliche URL des Bildes (Supabase Storage) |
| image_path | TEXT | NOT NULL | Interner Storage-Pfad (für Cleanup: `{user_id}/{uuid}.{ext}`) |
| caption | TEXT | CHECK(length <= 280) | Bild-Beschreibung |
| upvote_count | INTEGER | DEFAULT 0 | Denormalisierter Zähler (per Trigger aktualisiert) |
| created_at | TIMESTAMPTZ | DEFAULT now() | Erstellungszeitpunkt |

Indexes: `created_at DESC` (Feed), `user_id` (Profil-Posts), `upvote_count DESC` (Leaderboard).

### Tabelle: `votes`
Ein Upvote pro User pro Post. Kein Downvote (bewusste Designentscheidung — positiv halten). Wird zusammen mit Posts gelöscht.

| Spalte | Typ | Constraints | Beschreibung |
|---|---|---|---|
| id | UUID | PK | Vote-ID |
| user_id | UUID | NOT NULL, FK → profiles(id) ON DELETE CASCADE | Wer hat gevotet |
| post_id | UUID | NOT NULL, FK → posts(id) ON DELETE CASCADE | Für welchen Post |
| created_at | TIMESTAMPTZ | DEFAULT now() | Zeitpunkt |

UNIQUE Constraint auf `(user_id, post_id)`. Index auf `(user_id, post_id)` und `post_id`.

### Tabelle: `follows`
Überlebt den täglichen Reset. Persistent.

| Spalte | Typ | Constraints | Beschreibung |
|---|---|---|---|
| follower_id | UUID | FK → profiles(id) ON DELETE CASCADE | Wer folgt |
| following_id | UUID | FK → profiles(id) ON DELETE CASCADE | Wem wird gefolgt |
| created_at | TIMESTAMPTZ | DEFAULT now() | Seit wann |

PK auf `(follower_id, following_id)`. CHECK dass follower != following. Index auf `following_id`.

### Tabelle: `daily_leaderboard`
Historisches Archiv. Wird jeden Abend vor dem Cleanup befüllt. Wächst täglich. Wird nie gelöscht.

| Spalte | Typ | Constraints | Beschreibung |
|---|---|---|---|
| id | UUID | PK | Eintrag-ID |
| date | DATE | NOT NULL | Welcher Tag |
| user_id | UUID | NOT NULL, FK → profiles(id) ON DELETE CASCADE | User |
| rank | INTEGER | NOT NULL | Platzierung an diesem Tag |
| total_upvotes | INTEGER | NOT NULL | Gesamte Upvotes des Users an diesem Tag |
| total_posts | INTEGER | NOT NULL | Anzahl Posts des Users an diesem Tag |
| best_post_caption | TEXT | nullable | Caption des bestbewerteten Posts (zur Archivierung) |
| best_post_upvotes | INTEGER | nullable | Upvotes des bestbewerteten Posts |
| created_at | TIMESTAMPTZ | DEFAULT now() | Archivierungszeitpunkt |

UNIQUE auf `(date, user_id)`. Indexes auf `(date DESC)`, `(date DESC, rank ASC)`, `(user_id, date DESC)`.

### Tabelle: `app_config`
Key-Value-Store für serverseitige Konfiguration. Ermöglicht Änderungen ohne Redeployment.

| Spalte | Typ | Constraints | Beschreibung |
|---|---|---|---|
| key | TEXT | PK | Konfigurationsschlüssel |
| value | JSONB | NOT NULL | Wert als JSON |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Letzte Änderung |

Initiale Werte:
- `time_window`: `{"open_hour": 20, "open_minute": 0, "close_hour": 22, "close_minute": 0, "timezone": "Europe/Berlin"}`
- `grace_period_minutes`: `5`
- `max_posts_per_session`: `10`
- `max_image_size_mb`: `5`

### Supabase Storage Bucket: `memes`
- Name: `memes`
- Public: Ja (Bilder über CDN abrufbar)
- Max Dateigröße: 5 MB
- Erlaubte MIME-Types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Ordnerstruktur: `{user_id}/{uuid}.{extension}` — jeder User hat seinen eigenen Ordner

### Datenbank-Funktionen

**`handle_new_user()`** — TRIGGER FUNCTION
- Triggert AFTER INSERT auf `auth.users`
- Erstellt automatisch einen Eintrag in `profiles` mit den Metadaten aus dem Signup (username, display_name, avatar_url)
- SECURITY DEFINER (läuft mit erhöhten Rechten)

**`handle_vote_change()`** — TRIGGER FUNCTION
- Triggert AFTER INSERT OR DELETE auf `votes`
- Bei INSERT: Erhöht `upvote_count` im zugehörigen Post um 1 UND erhöht `total_upvotes_received` im Profil des Post-Erstellers um 1
- Bei DELETE: Verringert beide Werte um 1
- SECURITY DEFINER

**`is_app_open()`** — REGULAR FUNCTION, gibt BOOLEAN zurück
- Liest die Konfiguration aus `app_config` (Zeitfenster + Grace Period)
- Konvertiert aktuelle UTC-Zeit nach Europe/Berlin
- Gibt TRUE zurück wenn aktuelle Zeit zwischen `open_hour:open_minute` und `close_hour:close_minute + grace_period_minutes` liegt
- Wird in RLS-Policies verwendet — das ist die Datenbank-Ebene der Zeitbeschränkung

### Row Level Security Policies

**Grundprinzip:** Alle Tabellen haben RLS aktiviert. Zugriff nur für `authenticated` Rolle (eingeloggte User).

**profiles:**
- SELECT: Alle authenticated können alle Profile lesen (immer)
- UPDATE: Nur eigenes Profil (WHERE auth.uid() = id)

**posts:**
- SELECT: Nur wenn `is_app_open()` = true
- INSERT: Nur wenn `is_app_open()` = true UND `auth.uid() = user_id`
- DELETE: Nur eigene Posts (WHERE auth.uid() = user_id), unabhängig vom Zeitfenster

**votes:**
- SELECT: Nur wenn `is_app_open()` = true
- INSERT: Nur wenn `is_app_open()` = true UND `auth.uid() = user_id`
- DELETE: Nur eigene Votes (WHERE auth.uid() = user_id)

**follows:**
- SELECT: Alle authenticated können alle Follows lesen (immer)
- INSERT: Nur wenn `is_app_open()` UND `auth.uid() = follower_id`
- DELETE: Nur eigene Follows (WHERE auth.uid() = follower_id)

**daily_leaderboard:**
- SELECT: Alle authenticated können lesen (immer)
- INSERT/UPDATE/DELETE: Nur service_role (Cron-Jobs)

**app_config:**
- SELECT: Alle authenticated können lesen
- INSERT/UPDATE/DELETE: Nur über Supabase Dashboard (kein API-Zugriff)

**Storage (memes bucket):**
- Upload: Nur authenticated, nur in eigenen Ordner (Pfad muss mit eigener user_id beginnen)
- Lesen: Öffentlich (public bucket)
- Löschen: Nur service_role (Cleanup-Job)

---

## Time-Gating: 4 Schichten

Die Zeitbeschränkung wird auf 4 Ebenen durchgesetzt — selbst wenn eine Ebene umgangen wird, greifen die anderen.

### Schicht 1: Next.js Middleware (`src/middleware.ts`)
- Läuft bei jedem Request
- Prüft serverseitig (nicht Client-Zeit!) ob die aktuelle Zeit in Europe/Berlin zwischen 20:00 und 22:05 liegt
- Immer zugängliche Routen: `/`, `/auth/*`, `/about`, `/settings`, `/leaderboard/history`, `/profile/*/stats`
- Zeitbeschränkte Routen: `/feed`, `/create`, `/leaderboard` (live)
- Wenn geschlossen → Redirect zu `/?closed=true` (Landing-Page mit Countdown)
- Prüft zusätzlich ob User eingeloggt ist (Supabase Session Cookie)

### Schicht 2: Database Row Level Security
- Die `is_app_open()` PostgreSQL-Funktion wird direkt in RLS-Policies verwendet
- Selbst wenn jemand die Supabase-API direkt anspricht (ohne über die Next.js-App zu gehen), verweigert die Datenbank den Zugriff außerhalb des Fensters

### Schicht 3: Server Actions
- Jede Server Action die Daten schreibt (createPost, toggleVote, followUser) prüft nochmals serverseitig `isAppOpen()` als erste Aktion
- Gibt einen Fehler zurück wenn geschlossen

### Schicht 4: Client-Side UX
- Countdown-Timer auf der Landing-Page ("Öffnet in X:XX:XX")
- "Noch X Minuten"-Banner im Header während die App offen ist
- 5 Minuten vor Schluss (21:55): Toast-Warnung "Noch 5 Minuten!"
- Um 22:00: Modal-Overlay "Session beendet! Bis morgen um 20:00 Uhr."
- Dies ist rein kosmetisch — die echte Durchsetzung passiert serverseitig

### Grace Period (5 Minuten nach 22:00)
- Zwischen 22:00 und 22:05 können User laufende Aktionen fertigstellen
- Der "Create"-Button wird um 22:00 deaktiviert (keine neuen Posts)
- Bereits begonnene Posts können noch abgeschickt werden
- Upvoten ist noch möglich
- Der Feed ist noch sichtbar
- Nach 22:05 wird alles gesperrt

---

## Täglicher Reset

### Zeitplan (alle Zeiten CET)

| Uhrzeit | Job | Beschreibung |
|---|---|---|
| 23:55 | Leaderboard archivieren | Die Top 100 User des Tages (nach Gesamtupvotes) werden in `daily_leaderboard` geschrieben. Der User auf Platz 1 bekommt `days_won` + 1. |
| 00:05 | Content löschen | Alle Einträge aus `votes` und `posts` werden gelöscht. Die Lifetime-Stats in `profiles` bleiben erhalten. |
| 00:10 | Storage aufräumen | Edge Function löscht alle Dateien im `memes`-Storage-Bucket. |

### Implementierung

**Primär:** pg_cron (PostgreSQL-Extension, in Supabase verfügbar)
- Leaderboard-Archivierung: SQL-Query der die Top 100 per GROUP BY/SUM aggregiert und in `daily_leaderboard` inserted
- Content-Löschung: Einfaches `DELETE FROM votes; DELETE FROM posts;`
- Storage-Cleanup: pg_cron ruft via `net.http_post()` eine Supabase Edge Function auf, die per Supabase Storage API alle Dateien löscht

**Backup:** Vercel Cron (`vercel.json`)
- Gleiche Jobs als API-Routes unter `/api/cron/`
- Geschützt durch ein `CRON_SECRET` im Header
- Verwenden den Service-Role-Key um RLS zu bypassen

### Was bleibt erhalten vs. was wird gelöscht

| Daten | Bleibt? | Grund |
|---|---|---|
| User-Accounts (auth.users) | Ja | Permanent |
| Profile (profiles) mit Lifetime-Stats | Ja | Permanent, Stats akkumulieren |
| Follow-Beziehungen (follows) | Ja | Permanent |
| Leaderboard-Archiv (daily_leaderboard) | Ja | Wächst täglich |
| App-Config (app_config) | Ja | Permanent |
| Posts (posts) | NEIN | Gelöscht um Mitternacht |
| Votes (votes) | NEIN | Gelöscht um Mitternacht |
| Bilder im Storage (memes bucket) | NEIN | Gelöscht um Mitternacht |

### DST-Handling (Sommerzeit/Winterzeit)
CET wechselt zwischen UTC+1 (Winter) und UTC+2 (Sommer/CEST). Die pg_cron-Jobs werden in UTC definiert. Es gibt zwei Ansätze:
1. **Empfohlen:** Die Cron-Jobs auf eine UTC-Zeit setzen die für beide Varianten sicher nach Mitternacht CET liegt (z.B. UTC 23:55 = 00:55 CET Winter / 01:55 CEST Sommer — beides OK)
2. **Alternativ:** Die `is_app_open()` Funktion und alle Zeitberechnungen verwenden `AT TIME ZONE 'Europe/Berlin'` was DST automatisch berücksichtigt

---

## Seiten & Features (Detail)

### Landing Page (`/`)
- **Wenn geschlossen:** Großer Countdown-Timer bis 20:00 CET. Tagline/Claim (z.B. "Social Media. 2 Stunden. Dann leb dein Leben."). Login/Signup-Buttons. Kurze Erklärung des Konzepts.
- **Wenn offen + nicht eingeloggt:** Login/Signup-Aufforderung mit Dringlichkeit ("Noch X Minuten! Jetzt einsteigen.").
- **Wenn offen + eingeloggt:** Redirect zu `/feed`.
- Design: Fullscreen, zentriert, Dark Theme, minimalistisch.

### Login (`/auth/login`)
- Email + Passwort Formular
- Link zum Signup
- Nach erfolgreichem Login → Redirect zu `/feed` (wenn offen) oder `/` (wenn geschlossen)

### Signup (`/auth/signup`)
- Email, Passwort, Username (Eindeutigkeit prüfen!), Display Name
- Username-Validierung: Nur Kleinbuchstaben, Zahlen, Unterstriche. Min 3, Max 20 Zeichen.
- Nach Signup wird per Trigger automatisch ein Profil erstellt
- Email-Verifizierung: Supabase sendet eine Bestätigungs-Email. User wird auf Callback-Route geleitet.

### Feed (`/feed`) — Zeitbeschränkt
- Vertikal scrollende Liste aller Posts (chronologisch, neueste zuerst)
- Jeder Post zeigt: Avatar + Username (klickbar → Profil), das Bild, die Caption, Upvote-Count + Upvote-Button, relative Zeitangabe ("vor 5 Min")
- Infinite Scroll mit Cursor-basierter Pagination (Cursor = `created_at` + `id` des letzten sichtbaren Posts)
- Loading-Skeletons beim Laden
- Floating Action Button (rechts unten, mobil) → Link zu `/create`
- Sticky Header mit Session-Timer

### Post erstellen (`/create`) — Zeitbeschränkt
- Bild-Upload: Drag-and-Drop Zone oder Klick zum Datei-Auswählen
- Bildvalidierung: Nur JPEG, PNG, GIF, WebP. Max 5 MB. Client-seitig prüfen.
- Bildkompression: Vor dem Upload client-seitig komprimieren (browser-image-compression)
- Bildvorschau nach Auswahl
- Caption-Textfeld (max 280 Zeichen, Zeichenzähler anzeigen)
- Submit-Button (disabled wenn kein Bild oder beim Upload)
- Upload-Flow: Bild → Supabase Storage (`memes/{user_id}/{uuid}.{ext}`) → Öffentliche URL erhalten → Post in DB erstellen mit image_url und image_path
- Nach erfolgreichem Post → Redirect zu `/feed`
- Rate Limit: Max 10 Posts pro Tag (Server Action prüft das)

### Leaderboard (`/leaderboard`) — Zeitbeschränkt
- Tabelle/Liste aller User sortiert nach Gesamtupvotes des heutigen Tages
- Top 3 mit besonderer Darstellung (Gold/Silber/Bronze Icons, größer)
- Jeder Eintrag: Rang, Avatar, Username, Gesamtupvotes heute, Anzahl Posts heute
- Session-Timer im Header
- Link zum historischen Leaderboard

### Leaderboard-Historie (`/leaderboard/history`) — Immer zugänglich
- Liste vergangener Tage mit dem jeweiligen Gewinner (Platz 1)
- Klick auf einen Tag zeigt das vollständige Top-100-Ranking dieses Tages
- Pagination nach Datum

### Profil (`/profile/[username]`)
- Header: Avatar, Display Name, Username, Bio
- Follow/Unfollow-Button (nur wenn nicht eigenes Profil)
- Follower-Count und Following-Count
- Lifetime-Stats: Total Upvotes erhalten, Total Posts erstellt, Tage gewonnen
- Heutige Posts (Grid/Liste) — nur während Öffnungszeiten sichtbar
- Wenn eigenes Profil: "Profil bearbeiten"-Link zu /settings

### Settings (`/settings`) — Immer zugänglich
- Display Name ändern
- Bio ändern
- Avatar ändern (Bild-Upload nach Supabase Storage, separater Ordner `avatars/{user_id}`)
- Logout-Button
- Account-löschen-Button (mit Bestätigungsdialog)

---

## Sicherheit & Rate Limiting

| Maßnahme | Implementierung |
|---|---|
| Post-Limit | Max 10 Posts pro Session/Tag — Server Action zählt Posts des Users am heutigen Tag |
| Vote-Limit | 1 Vote pro User pro Post — UNIQUE Constraint in DB |
| Bildgröße | Max 5 MB — Supabase Storage Bucket-Config + Client-Validierung |
| Bildtyp | Nur JPEG/PNG/GIF/WebP — Bucket-Config + Client-Validierung |
| Caption-Länge | Max 280 Zeichen — DB CHECK Constraint + Zod-Validierung + Client UI |
| Auth Rate Limiting | Supabase Auth built-in |
| API Rate Limiting | Vercel DDoS-Schutz (built-in) |
| Email-Verifizierung | Pflicht bei Signup (Supabase Auth Config) |
| CRON-Secret | Vercel Cron-Endpoints prüfen `CRON_SECRET` Header |

---

## Umgebungsvariablen

```
# .env.local (NICHT committen)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
CRON_SECRET=ein-langes-zufälliges-secret
```

```
# .env.example (committen, Platzhalter)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

---

## MVP-Scope

### Im MVP enthalten:
- Landing Page mit Countdown
- Email/Password Auth (Signup + Login + Email-Verifizierung)
- Profilerstellung (Username, Display Name, Avatar)
- Bild-Upload + Post erstellen (Meme + Caption)
- Chronologischer Feed ("Alle" — nur ein Feed, kein Toggle)
- Upvoting (Toggle on/off, Optimistic UI)
- Leaderboard (heutige Top-User)
- Time-Gating auf allen 4 Schichten
- Täglicher Content-Cleanup
- Leaderboard-Archivierung
- Responsive Design mit Dark Theme
- Rate Limiting (10 Posts/Session, Bildgröße)

### NICHT im MVP (spätere Phasen):
- Follow-System und "Following"-Feed
- Detaillierte Profilseiten mit Posts-Grid
- Historisches Leaderboard (Archiv-Ansicht)
- Realtime-Updates (im MVP: manuelles Refresh oder Polling alle 30s)
- Bild-Cropping/Editing
- Content Moderation (außer manuell via Supabase Dashboard)
- OAuth (Google, Apple, GitHub)
- Push Notifications
- PWA-Support
- Admin-Dashboard
- Report-System
- "Trending"-Sortierung

---

## Implementierungs-Reihenfolge

### Schritt 1: Projekt-Setup
1. Next.js 15 Projekt initialisieren mit App Router, TypeScript, Tailwind CSS, src-Verzeichnis
2. shadcn/ui initialisieren und Basis-Komponenten installieren (Button, Input, Card, Dialog, Avatar, Badge, Skeleton, Toast)
3. Alle Dependencies installieren (siehe Tech-Stack-Tabelle oben)
4. Supabase-Projekt erstellen (auf supabase.com) — Database, Auth und Storage aktivieren
5. `.env.local` mit den Supabase-Keys befüllen, `.env.example` anlegen
6. Die 4 Supabase-Client-Dateien erstellen (`lib/supabase/client.ts`, `server.ts`, `middleware.ts`, `admin.ts`)
7. `lib/utils/cn.ts` erstellen (clsx + tailwind-merge Utility)
8. `lib/constants.ts` mit allen Konstanten
9. `lib/types.ts` mit TypeScript-Typen
10. Root-Layout (`app/layout.tsx`) mit Providers, Dark Theme, Fonts
11. `.gitignore` einrichten (node_modules, .env.local, .next, etc.)

### Schritt 2: Datenbank-Schema
1. Alle SQL-Migrations-Dateien erstellen und ausführen (über Supabase SQL Editor oder CLI)
2. In dieser Reihenfolge: Tabellen → Funktionen → Trigger → RLS Policies → Storage Bucket + Policies → Cron Jobs
3. `seed.sql` mit den initialen `app_config`-Werten ausführen
4. Manuell testen: RLS-Policies im SQL-Editor prüfen (als authenticated User Abfragen ausführen)

### Schritt 3: Auth
1. Supabase Auth konfigurieren: Email-Provider aktivieren, Email-Templates anpassen (optional), Redirect-URLs setzen
2. `lib/actions/auth.ts` erstellen: signUp (mit username in Metadaten), signIn, signOut
3. Auth-Callback-Route (`app/(auth)/auth/callback/route.ts`) implementieren
4. Signup-Seite bauen: Formular mit Zod-Validierung, Username-Verfügbarkeitsprüfung (live), Error-Handling
5. Login-Seite bauen: Email + Passwort Formular
6. Supabase Provider erstellen (`components/providers/supabase-provider.tsx`)
7. Middleware-Grundgerüst für Auth-Session-Refresh
8. Testen: Signup → Email-Bestätigung → Login → Session Cookie → Profil in DB prüfen

### Schritt 4: Time-Gating
1. `lib/utils/time.ts` erstellen: `isAppOpen()`, `getNextOpenTime()`, `getTimeRemaining()`, `getSessionProgress()`
2. `lib/constants.ts` ergänzen: OPEN_HOUR, CLOSE_HOUR, GRACE_MINUTES, TIMEZONE
3. Middleware erweitern: Time-Gate-Logik hinzufügen, Route-Matching
4. `components/countdown/countdown-timer.tsx`: Großer Countdown für die Landing-Page
5. `components/countdown/session-timer.tsx`: Kleiner Timer für den Header
6. `components/countdown/session-ended-modal.tsx`: Modal wenn die Zeit abgelaufen ist
7. Landing-Page (`app/(public)/page.tsx`) bauen: Zwei Zustände (offen/geschlossen)
8. `components/layout/time-banner.tsx`: Sticky Banner mit verbleibender Zeit
9. Testen: `app_config` temporär auf die aktuelle Zeit anpassen → Prüfen dass Redirect funktioniert → Zeitfenster zurücksetzen

### Schritt 5: App-Layout & Navigation
1. `app/(app)/layout.tsx`: Gemeinsames Layout für alle authentifizierten Seiten
2. `components/layout/navbar.tsx`: Desktop-Navigation
3. `components/layout/bottom-nav.tsx`: Mobile Bottom-Navigation
4. Time-Banner in das Layout einbauen
5. Responsive testen (Mobile 375px, Desktop 1440px)

### Schritt 6: Post-Erstellung
1. `lib/validations.ts`: Zod-Schema für Post-Erstellung (image required, caption max 280)
2. `components/create/image-upload.tsx`: Drag-and-Drop, Dateiauswahl, Validierung, Vorschau
3. `lib/utils/image.ts`: Bildkompression und -validierung
4. `lib/actions/posts.ts` → `createPost`: Zeitfenster prüfen → Rate-Limit prüfen (max 10) → Bild nach Storage hochladen → Post in DB erstellen → Redirect
5. `components/create/create-post-form.tsx`: Gesamtes Formular
6. `app/(app)/create/page.tsx`: Seite zusammenbauen
7. Testen: Bild hochladen → In Supabase Storage sichtbar → Post in DB → Korrekte URL

### Schritt 7: Feed
1. `lib/queries/posts.ts` → `getFeed`: SELECT posts JOIN profiles, ORDER BY created_at DESC, Cursor-Pagination (WHERE created_at < cursor_date OR (created_at = cursor_date AND id < cursor_id))
2. `components/feed/post-card.tsx`: Einzelner Post (Avatar, Username, Bild, Caption, Upvote-Count, Zeitangabe)
3. `components/feed/feed-skeleton.tsx`: Lade-Skelett
4. `lib/hooks/use-infinite-feed.ts`: Infinite Scroll Hook (IntersectionObserver + nächste Seite laden)
5. `components/feed/post-grid.tsx`: Feed-Container mit Infinite Scroll
6. `app/(app)/feed/page.tsx`: Feed-Seite (Server Component lädt erste Seite, Client Component für Infinite Scroll)
7. Testen: Mehrere Posts erstellen → Alle erscheinen chronologisch → Scroll lädt weitere

### Schritt 8: Upvoting
1. `lib/actions/votes.ts` → `toggleVote`: Zeitfenster prüfen → Prüfen ob Vote existiert → Wenn ja: löschen, wenn nein: erstellen
2. `components/feed/upvote-button.tsx`: Button mit Herz/Pfeil-Icon, aktueller Count, Toggle-Zustand, Optimistic UI (sofort visuell updaten, bei Fehler zurückrollen)
3. In `post-card.tsx` einbauen: Initialer Zustand (hat User schon gevotet?) per Query mitgeben
4. `lib/queries/posts.ts` erweitern: Feed-Query muss für jeden Post auch `has_voted` des aktuellen Users mitgeben (LEFT JOIN auf votes)
5. Testen: Upvote → Count +1 → Nochmal klicken → Count -1 → Trigger prüfen (denormalisierter Count korrekt?)

### Schritt 9: Leaderboard
1. `lib/queries/leaderboard.ts` → `getTodayLeaderboard`: SELECT user_id, SUM(upvote_count), COUNT(posts) FROM posts GROUP BY user_id ORDER BY SUM DESC, JOIN profiles für Avatar/Username
2. `components/leaderboard/leaderboard-podium.tsx`: Top 3 mit Gold/Silber/Bronze
3. `components/leaderboard/leaderboard-entry.tsx`: Einzelne Zeile
4. `components/leaderboard/leaderboard-table.tsx`: Gesamttabelle
5. `app/(app)/leaderboard/page.tsx`: Seite zusammenbauen
6. Testen: Mehrere Posts von verschiedenen Usern mit verschiedenen Upvote-Zahlen → Ranking korrekt?

### Schritt 10: Täglicher Cleanup
1. Leaderboard-Archivierungs-Query als pg_cron Job einrichten (oder als Vercel Cron API-Route)
2. Content-Löschungs-Query als pg_cron Job
3. `supabase/functions/cleanup-storage/index.ts`: Edge Function die alle Dateien im memes-Bucket auflistet und löscht
4. Vercel Cron als Backup in `vercel.json` konfigurieren
5. API-Routes `/api/cron/archive-leaderboard` und `/api/cron/cleanup` mit CRON_SECRET-Validierung
6. Testen: Jobs manuell triggern → Posts/Votes weg → Leaderboard-Archiv da → Storage leer → Profile/Follows intakt

### Schritt 11: Polish & Deploy
1. Error-Handling überall: Server Actions geben strukturierte Fehler zurück, UI zeigt Toast-Nachrichten
2. Loading States: Skeletons auf allen Seiten, Disabled-States bei Buttons während Aktionen
3. Responsive Design Pass: Alle Seiten auf 375px (Mobile) und 1440px (Desktop) testen
4. About-Seite (`/about`) mit Manifesto-Text
5. 404-Seite
6. SEO: Metadata in Root-Layout, OG-Image, Seitentitel
7. Auf Vercel deployen, Custom Domain einrichten
8. Supabase-Projekt auf Production-Settings prüfen (RLS, Auth-Config, Storage)
9. Einen vollständigen Zyklus in Production testen (Zeitfenster temporär anpassen)

---

## Verifikation & Testing

Nach jedem Schritt diese Prüfungen durchführen:

1. **Auth-Flow**: Signup → Email-Bestätigung → Login → Profil in DB vorhanden → Logout → Erneut Login
2. **Time-Gate**: Zeitfenster in `app_config` auf aktuelle Zeit setzen → `/feed` erreichbar → Zeitfenster auf andere Zeit setzen → Redirect zu Landing
3. **Post-Flow**: Bild hochladen → Post im Feed sichtbar → Bild lädt korrekt → Caption korrekt → Zeitangabe korrekt
4. **Upvote-Flow**: Post upvoten → Count steigt → Nochmal klicken → Count sinkt → In DB prüfen (denormalisierter Count + Vote-Eintrag)
5. **Leaderboard**: Verschiedene User, verschiedene Votes → Ranking stimmt → Top 3 hervorgehoben
6. **Cleanup-Zyklus**: Archivierung manuell triggern → Leaderboard-Eintrag in daily_leaderboard → Cleanup triggern → Posts/Votes/Storage leer → Profile/Follows intakt
7. **RLS-Test**: Im Supabase SQL Editor: Als authenticated User außerhalb des Zeitfensters SELECT auf posts → Sollte leer sein
8. **Responsive**: Jede Seite im Browser-DevTools auf 375px und 1440px prüfen
9. **Rate Limit**: 11 Posts versuchen → 11. wird abgelehnt
10. **Edge Cases**: Post erstellen kurz vor 22:00 → Grace Period → Post geht noch durch → Nach 22:05 → Redirect
