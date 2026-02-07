# 2Hours — Zeitbegrenztes Soziales Netzwerk

## Project Overview

A social network that's only open 2 hours per day (20:00-22:00 CET). Users post memes (image + caption), text-only posts, or links with OG previews. They upvote posts and comments, and a daily leaderboard crowns the funniest person. At midnight, all content is deleted. Every day starts fresh. The Hall of Fame preserves the best post of each day with its top comments.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (DB, Auth, Storage) · Vercel

## Quick Start

```bash
pnpm install
pnpm dev        # starts on http://localhost:3000
pnpm build      # production build
pnpm lint       # ESLint
```

**Package manager:** Always use `pnpm`, never `npm` or `yarn`.

## Environment Variables

Copy `.env.example` to `.env` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon (public) key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (secret, for admin/cron operations)
- `CRON_SECRET` — Random secret for authenticating cron job endpoints

## Project Structure

```
src/
├── app/
│   ├── (public)/          # Always accessible (landing, about)
│   ├── (auth)/            # Auth pages (login, signup, callback)
│   ├── (app)/             # Authenticated + time-gated (feed, create, leaderboard, profile, settings)
│   └── api/
│       ├── feed/          # Feed pagination
│       ├── og/            # OG metadata fetching for URL previews
│       ├── comments/      # Comments API (if applicable)
│       └── cron/          # Cron jobs (archive-leaderboard, cleanup)
├── components/
│   ├── layout/            # Navbar, bottom-nav, time-banner, footer
│   ├── feed/              # Post card, post grid, upvote button, comment section, link preview, skeletons
│   ├── create/            # Image upload, create post form, OG preview
│   ├── leaderboard/       # Podium, entry row, table, top post card
│   ├── profile/           # Profile header, stats, follow button
│   └── countdown/         # Countdown timer, session timer, session-ended modal
├── lib/
│   ├── supabase/          # 4 Supabase clients (client, server, middleware, admin)
│   ├── actions/           # Server Actions (auth, posts, votes, comments, follows, profile)
│   ├── queries/           # Data fetching for Server Components (posts, comments, leaderboard, profile)
│   ├── hooks/             # Client hooks (useCountdown, useTimeGate, useInfiniteFeed)
│   ├── utils/             # Pure utilities (cn, time, image, format, upload)
│   ├── constants.ts       # All magic numbers and config
│   ├── types.ts           # TypeScript types
│   └── validations.ts     # Zod schemas
└── middleware.ts           # Auth session refresh + time-gate routing

supabase/
├── migrations/            # 15 SQL files (run in order, 001-015)
├── functions/             # Edge Functions (Deno runtime — excluded from tsconfig)
└── seed.sql               # Initial app_config values
```

## Route Groups

- `(public)` — No auth required, no time gate. Landing page, about page.
- `(auth)` — Auth pages. Login, signup, email callback.
- `(app)` — Requires authentication. Most routes also require the app to be open (time-gated). The layout includes navbar, bottom nav, time banner, and session-ended modal.

## Time-Gating (4 layers)

The app enforces its time window at 4 independent levels:

1. **Middleware** (`src/middleware.ts`) — Server-side route protection. Redirects to `/` when closed.
2. **Database RLS** — `is_app_open()` PostgreSQL function used in Row Level Security policies. Blocks data access even if someone hits the API directly.
3. **Server Actions** — Each write action (createPost, toggleVote, createComment, followUser) checks `isAppOpen()` before proceeding.
4. **Client UI** — Countdown timer, session timer, "session ended" modal. Cosmetic only — real enforcement is server-side.

### Changing the time window

Both the client constants AND the database config must be updated:

- **Client:** `src/lib/constants.ts` → `OPEN_HOUR`, `CLOSE_HOUR`
- **Database:** `app_config` table, key `time_window`

For dev testing, set both to cover the current time (e.g., `OPEN_HOUR=0, CLOSE_HOUR=23`).

## Code Style

### TypeScript

- Strict mode enabled. No `any` unless absolutely necessary.
- Unused variables: use `catch {}` not `catch (error) {}`.
- Supabase SSR `setAll` callbacks need explicit type annotations for `cookiesToSet`.

### Components

- Server Components by default. Only add `"use client"` when the component needs interactivity (hooks, event handlers, browser APIs).
- Client components use `"use client"` directive at the top of the file.
- Tailwind classes directly on elements — no CSS modules, no styled-components.
- Use `cn()` from `@/lib/utils/cn` for conditional class merging.

### Server Actions

- All in `src/lib/actions/`, marked with `"use server"`.
- Return `ActionResult<T>` type: `{ success: boolean; data?: T; error?: string }`.
- Always validate input with Zod schemas from `validations.ts`.
- Always check auth (`supabase.auth.getUser()`) and time gate (`isAppOpen()`) first.

### Data Fetching

- Server Components use functions from `src/lib/queries/`.
- Client-side pagination uses the `/api/feed` route + `useInfiniteFeed` hook.
- Optimistic UI for upvotes and comment votes (immediate visual update, rollback on error).

### Naming Conventions

- Files: kebab-case (`post-card.tsx`, `use-countdown.ts`)
- Components: PascalCase (`PostCard`, `CountdownTimer`)
- Functions/variables: camelCase (`isAppOpen`, `handleSubmit`)
- Database columns: snake_case (`upvote_count`, `created_at`)
- Constants: UPPER_SNAKE_CASE (`MAX_POSTS_PER_SESSION`)

## Supabase Clients

There are 4 separate Supabase clients for different contexts:

| Client | File | Used in | Auth |
|--------|------|---------|------|
| Browser | `lib/supabase/client.ts` | Client Components | User session (cookies) |
| Server | `lib/supabase/server.ts` | Server Components, Server Actions | User session (cookies) |
| Middleware | `lib/supabase/middleware.ts` | `middleware.ts` | Session refresh |
| Admin | `lib/supabase/admin.ts` | Cron jobs, admin operations | Service role key (bypasses RLS) |

## Database

### Tables

| Table | Persistent | Description |
|-------|-----------|-------------|
| `profiles` | Yes | User profiles, lifetime stats |
| `posts` | **No** (deleted at midnight) | Daily posts (image, text-only, or link) |
| `votes` | **No** (deleted at midnight) | Post upvotes |
| `comments` | **No** (deleted at midnight) | Post comments |
| `comment_votes` | **No** (deleted at midnight) | Comment upvotes |
| `follows` | Yes | Follow relationships |
| `daily_leaderboard` | Yes | Historical archive, grows daily |
| `top_posts_all_time` | Yes | Hall of Fame — best post per day with top comments |
| `app_config` | Yes | Server-side configuration (time window, limits) |

### Key Columns

**posts:** `image_url` and `image_path` are **nullable** (text-only posts). Has `og_title`, `og_description`, `og_image`, `og_url` for link previews. Has `comment_count` (denormalized). Constraint: at least `image_url` or `caption` must be non-null.

**comments:** `text` (max 500 chars), `upvote_count` (denormalized via trigger), sorted by upvotes in UI.

**top_posts_all_time:** `top_comments` JSONB column stores archived top 3 comments as `[{ username, text, upvote_count }]`.

### Denormalized Counts & Triggers

- `posts.upvote_count` — maintained by `handle_vote_change()` trigger on `votes`
- `posts.comment_count` — maintained by `handle_comment_count_change()` trigger on `comments`
- `comments.upvote_count` — maintained by `handle_comment_vote_change()` trigger on `comment_votes`
- `profiles.total_upvotes_received` — maintained by `handle_vote_change()` trigger

### Running Migrations

Migrations are in `supabase/migrations/` and must be run in order (001-015). Use psql:

```bash
export PGPASSWORD="your-db-password"
DB_URL="postgresql://postgres:$PGPASSWORD@db.YOUR-PROJECT-REF.supabase.co:5432/postgres"

for f in supabase/migrations/*.sql; do
  psql "$DB_URL" -f "$f"
done

psql "$DB_URL" -f supabase/seed.sql
```

psql is available at `/opt/homebrew/opt/libpq/bin/psql`.

### Supabase Edge Functions

Files in `supabase/functions/` use Deno runtime with URL imports. They are **excluded from tsconfig** to avoid TypeScript errors. Deploy separately with `supabase functions deploy`.

## Features

### Post Types

1. **Image + Caption** — Traditional meme post (image required, caption optional)
2. **Text-only** — No image, just caption text
3. **Link with OG Preview** — URLs in caption are detected, OG metadata fetched via `/api/og`, preview shown in feed

### Comments

- Each post has a collapsible comment section (click to expand)
- Comments can be upvoted (same optimistic UI pattern as post upvotes)
- Sorted by upvote count (most upvoted first)
- Max 500 characters per comment
- Server action: `createComment`, `deleteComment`, `toggleCommentVote` in `src/lib/actions/comments.ts`
- Query: `getCommentsByPost` in `src/lib/queries/comments.ts`

### Feed

- Three tabs: Live (newest), Hot (most upvoted, min threshold), Following
- Infinite scroll with cursor-based pagination
- Post card shows: header (avatar, username, time), caption above image, image, OG link preview, upvote/comment/share buttons

### Hall of Fame

- `/leaderboard/top-posts` — Best post of each day (max 20 stored)
- Archived daily by cron before cleanup
- Includes top 3 comments per post (stored as JSONB)
- Weakest entry gets replaced if a new day's top post is stronger

## Daily Cleanup Cycle

Runs via Vercel Cron (configured in `vercel.json`) or pg_cron:

| Time (UTC) | Endpoint | What it does |
|------------|----------|-------------|
| 22:55 | `/api/cron/archive-leaderboard` | Archives top 100 users to `daily_leaderboard`, increments winner's `days_won`, archives top post + comments to Hall of Fame |
| 23:05 | `/api/cron/cleanup` | Deletes all comment_votes → comments → votes → posts (FK order), then storage files |

Both endpoints require `Authorization: Bearer $CRON_SECRET` header.

## Deployment

### Vercel

The project deploys directly from local to Vercel (no GitHub repo connected).

```bash
vercel --yes --prod
```

Environment variables are set on Vercel. They were configured during the first deploy with `-e` flags. To update them, use:

```bash
vercel env add VARIABLE_NAME production
```

Or update via the Vercel Dashboard → Project Settings → Environment Variables.

### Supabase

- **Dashboard:** Authentication settings (disable email confirmation for dev, set redirect URLs for production domain)
- **Redirect URLs:** Add your Vercel domain (`https://your-app.vercel.app/**`) under Authentication → URL Configuration
- **Storage buckets:** `memes` (public, 5MB limit) and `avatars` (public, 2MB limit) — created by migration 010

### Production Checklist

- [ ] Set `OPEN_HOUR=20` and `CLOSE_HOUR=22` in constants.ts
- [ ] Update `app_config.time_window` in database to match
- [ ] Add Vercel production URL to Supabase redirect URLs
- [ ] Verify `CRON_SECRET` is set in Vercel env vars
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel env vars
- [ ] Enable email confirmation in Supabase if desired (currently disabled)
- [ ] Cron jobs in `vercel.json` are active on Vercel Pro plan

## Build Notes

- **CRITICAL: NEVER run `pnpm build` while dev server is running!** It writes a webpack cache to `.next/` that corrupts Turbopack's cache, causing Internal Server Error. Use `pnpm tsc --noEmit` for type-checking instead.
- `supabase/functions/` must be excluded from tsconfig (Deno imports)
- `serverActions.bodySizeLimit` must be under `experimental` in next.config.ts (Next.js 15)
- Blob preview URLs in image upload use `<img>` with `eslint-disable` comment (Next Image can't handle blob URLs)

## Known Patterns

- **Redirect loop fix:** The landing page checks `isAppOpen()` before redirecting logged-in users to `/feed`. Without this, middleware and landing page fight each other.
- **Signup flow:** Desktop creates account directly. Mobile shows a share gate first (Web Share API → WhatsApp fallback) before account creation.
- **Optimistic UI:** Used for post upvotes and comment upvotes. Immediate state change, rollback on server error.
- **Denormalized counts:** `upvote_count` and `comment_count` are stored directly on rows and maintained by PostgreSQL triggers — never computed client-side.
- **OG fetching:** Done server-side via `/api/og?url=...` to avoid CORS. Parses `og:title`, `og:description`, `og:image` meta tags. 5s timeout.
- **Nullable image fields:** `posts.image_url` and `posts.image_path` can be null (text-only posts). Always check before accessing `.toLowerCase()` or passing to `<Image>`.
