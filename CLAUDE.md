# twohrs — Zeitbegrenztes Soziales Netzwerk

## Project Overview

A social network that's only open a few hours per day (currently 20:00-22:00 CET, configurable via env vars). Users post memes (image + caption), text-only posts, or links with OG previews. They upvote posts and comments, and a daily leaderboard crowns the funniest person. Content is cleaned up daily. Every day starts fresh. The Hall of Fame preserves the best post of each day with its top comments.

## Tech Stack

- **Runtime:** Next.js 15 (App Router) · TypeScript (strict) · Node v25
- **Styling:** Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Hosting:** Vercel (2 environments: production + preview)
- **Source Control:** GitHub ([loris307/twohrs](https://github.com/loris307/twohrs)) — public, open-source
- **CI:** GitHub Actions — 6 workflows in `.github/workflows/` (CI, CodeQL, preview smoke, Supabase schema lint, dependency review, Lighthouse)
- **Package manager:** pnpm (never npm or yarn)

## Commands

```bash
pnpm install          # install dependencies
pnpm dev              # dev server on http://localhost:3000
pnpm build            # production build (NEVER while dev server is running!)
pnpm lint             # ESLint
pnpm tsc --noEmit     # type-check without emitting (safe during dev)
pnpm typecheck        # full type-check (next typegen + tsc --noEmit)
```

Deploy:
```bash
vercel --yes --prod                                            # production → twohrs.com
vercel --yes && vercel alias <url> socialnetwork-dev.vercel.app  # preview → dev alias
```

Database (Supabase CLI):
```bash
supabase login                           # one-time: authenticate CLI with Supabase
supabase link --project-ref <ref>        # one-time: link project (prompts for DB password)
supabase migration list                  # show local vs remote migration status
supabase db push                         # push pending migrations to remote DB
supabase migration repair --status applied <version>  # mark migration as already applied
```

## Boundaries

### Always (do without asking)
- Use **"twohrs"** as the brand name everywhere (lowercase, one word). Never use "2Hours", "2 Hours", or "2hours".
- Use `pnpm`, never `npm` or `yarn`
- Check `isAppOpen()` in every new server action before writes
- Check auth (`supabase.auth.getUser()`) in every new server action
- Validate input with Zod schemas from `validations.ts`
- Check nullable `image_url`/`image_path` before `.toLowerCase()` or `<Image>`
- Return `ActionResult<T>` from all server actions
- Use `catch {}` not `catch (error) {}` when error var is unused
- Use `cn()` from `@/lib/utils/cn` for conditional Tailwind classes
- Document new features in `ENTWICKLUNG.md` (and big ones in `CLAUDE.md`)
- Dispatch `new Event("navigation-start")` before `router.push()` calls
- **All UI text must be lowercase** — global `text-transform: lowercase` is on `<body>`. CSS handles it. Only legal pages use `normal-case`. Never add `uppercase` or `capitalize` classes.

### Ask First (get approval)
- Adding new dependencies
- Database schema changes (new migrations)
- Changing RLS policies
- Modifying the time-gating logic (any of the 4 layers)
- Changes to cron jobs / cleanup order
- Changing public API signatures
- Modifying deployment configuration

### Never (hard stops)
- Run `pnpm build` while dev server is running (corrupts Turbopack cache)
- Commit `.env` files, secrets, or API keys
- Edit `pnpm-lock.yaml` manually
- Modify `supabase/functions/` with Node-style imports (Deno runtime)
- Include `supabase/functions/` in tsconfig
- Bypass time-gate enforcement without explicit approval
- Delete persistent tables (`profiles`, `follows`, `daily_leaderboard`, etc.)
- Force push to main
- Deploy to production (`vercel --yes --prod`) from any branch other than `main`
- Connect Vercel to GitHub (deploys are manual via CLI)
- Push secrets, Supabase URLs/keys, or credentials to the public repo

## Project Structure

```
src/
├── app/
│   ├── (public)/          # Always accessible (landing, about)
│   ├── (auth)/            # Auth pages (login, signup, callback)
│   ├── (app)/             # Authenticated + time-gated (feed, create, leaderboard, profile, settings, search)
│   ├── post/[id]/         # Post detail page (outside route groups for OG metadata)
│   └── api/               # feed, og, comments, search, mentions, export, cron
├── components/
│   ├── auth/              # Google OAuth button, username setup form
│   ├── layout/            # Navbar, bottom-nav, time-banner, navigation-progress, active-users-count
│   ├── feed/              # Post card, post grid, upvote button, comment section, link preview
│   ├── create/            # Image upload, create post form, OG preview
│   ├── leaderboard/       # Podium, entry row, table, top post card, archive-tabs
│   ├── profile/           # Profile header, stats, follow button, profile-tabs, mentions-list
│   ├── shared/            # Reusable components (mention-autocomplete)
│   └── countdown/         # Countdown timer, session timer, session-ended modal
├── lib/
│   ├── supabase/          # Supabase clients (client, server, middleware, admin) + env helpers
│   ├── actions/           # Server Actions (auth, posts, votes, comments, follows, profile, mentions, moderation, hashtags)
│   ├── queries/           # Data fetching (posts, comments, leaderboard, profile, private-profile, mentions)
│   ├── hooks/             # Client hooks (useCountdown, useTimeGate, useInfiniteFeed, useNewPosts, useOnlineUsers, useUnreadMentions)
│   ├── utils/             # Pure utilities (cn, time, image, format, upload, magic-bytes, mentions, rate-limit, strip-exif, disposable-email, signup-guards, username, hashtags, etc.)
│   ├── data/              # Static data (blocked-domains.json)
│   ├── moderation/        # Content moderation (blocked-domains, check-content, nsfw, strikes)
│   ├── constants.ts       # All magic numbers and config
│   ├── types.ts           # TypeScript types
│   └── validations.ts     # Zod schemas
└── middleware.ts           # Auth session refresh + rate limiting + time-gate routing

supabase/
├── migrations/            # SQL files (001-043)
├── functions/             # Edge Function: cleanup-storage (Deno runtime — excluded from tsconfig)
└── seed.sql               # Initial app_config values
```

## Code Style

### Server Action pattern

```typescript
"use server";
import { createClient } from "@/lib/supabase/server";
import { isAppOpen } from "@/lib/utils/time";
import type { ActionResult } from "@/lib/types";

export async function createPost(formData: FormData): Promise<ActionResult> {
  if (!isAppOpen()) return { success: false, error: "Die App ist gerade geschlossen" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht eingeloggt" };
  // ... validation, DB write, revalidate
  return { success: true };
}
```

### Conventions

- **Naming:** Files kebab-case, components PascalCase, functions/variables camelCase, DB columns snake_case, constants UPPER_SNAKE_CASE
- **Components:** Server Components by default. Only `"use client"` when needed for interactivity. Tailwind directly on elements, `cn()` for conditional classes.
- **Server Actions:** All in `src/lib/actions/`, return `ActionResult<T>`, validate with Zod, check auth + time gate first.
- **Data fetching:** Server Components use `src/lib/queries/`. Client pagination via `/api/feed` + `useInfiniteFeed`. Optimistic UI for upvotes (rollback on error).

## Environment Variables

Copy `.env.example` to `.env` and fill in. Key vars:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase connection
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (secret, for admin/cron)
- `CRON_SECRET` — For authenticating cron job endpoints
- `BLOCKED_EMAIL_DOMAINS` — (optional) Comma-separated domains to block at signup
- `NEXT_PUBLIC_OPEN_HOUR` / `NEXT_PUBLIC_CLOSE_HOUR` — Override time window (default: 20/22)

**Per-environment on Vercel:** Production uses `OPEN_HOUR=20, CLOSE_HOUR=22`. Preview uses `OPEN_HOUR=0, CLOSE_HOUR=24` (always open). Both share the same Supabase DB.

## Supabase Clients

| Client | File | Used in | Auth |
|--------|------|---------|------|
| Browser | `lib/supabase/client.ts` | Client Components | User session (cookies) |
| Server | `lib/supabase/server.ts` | Server Components, Server Actions | User session (cookies) |
| Middleware | `lib/supabase/middleware.ts` | `middleware.ts` | Session refresh |
| Admin | `lib/supabase/admin.ts` | Cron jobs, admin operations | Service role key (bypasses RLS) |

## Time-Gating (4 layers)

1. **Middleware** (`src/middleware.ts`) — Redirects to `/` when closed.
2. **Database RLS** — `is_app_open()` PostgreSQL function in RLS policies.
3. **Server Actions** — Each write action checks `isAppOpen()`.
4. **Client UI** — Countdown timer, session timer, "session ended" modal. Cosmetic only.

Time window configured via env vars → `constants.ts` fallbacks → `app_config` table (must stay in sync for RLS).

## Database

### Tables

| Table | Persistent | Description |
|-------|-----------|-------------|
| `profiles` | Yes | User profiles, lifetime stats, admin flag, moderation strikes |
| `posts` | **No** (daily cleanup) | Daily posts (image, text-only, or link) |
| `votes` | **No** | Post upvotes |
| `comments` | **No** | Post comments (one-level replies) |
| `comment_votes` | **No** | Comment upvotes |
| `mentions` | **No** | @mention tracking |
| `post_hashtags` | **No** | Hashtag-to-post junction |
| `follows` | Yes | Follow relationships |
| `hashtag_follows` | Yes | User-to-hashtag follows |
| `daily_leaderboard` | Yes | Historical archive, grows daily |
| `top_posts_all_time` | Yes | Hall of Fame — best post per day with top comments |
| `banned_email_hashes` | Yes | SHA-256 of banned emails (strike 3 → account deletion) |
| `app_config` | Yes | Server-side config (time window, limits) |

### Key Columns

**posts:** `image_url` and `image_path` are **nullable** (text-only posts). Has `og_title`, `og_description`, `og_image`, `og_url` for link previews. Has `comment_count` (denormalized). Constraint: at least `image_url` or `caption` must be non-null.

**comments:** `text` (max 500 chars), `upvote_count` (denormalized via trigger), `parent_comment_id` (nullable, one-level replies), sorted by upvotes in UI.

**mentions:** `mentioned_user_id`, `mentioning_user_id`, `post_id` (nullable), `comment_id` (nullable). Profiles have `last_mentions_seen_at` for unread tracking.

**post_hashtags:** `post_id`, `hashtag` (lowercase text). Unique per post+hashtag pair. Max 10 per post.

**top_posts_all_time:** `top_comments` JSONB stores archived top 3 comments as `[{ username, text, upvote_count }]`.

### Denormalized Counts & Triggers

- `posts.upvote_count` — maintained by `handle_vote_change()` trigger on `votes`
- `posts.comment_count` — maintained by `handle_comment_count_change()` trigger on `comments`
- `comments.upvote_count` — maintained by `handle_comment_vote_change()` trigger on `comment_votes`
- `profiles.total_upvotes_received` — maintained by `handle_vote_change()` trigger
- `profiles` protected columns (`is_admin`, `moderation_strikes`, `nsfw_strikes`, `days_won`, `total_upvotes_received`, `total_posts_created`) — `protect_profile_columns` trigger (SECURITY INVOKER) prevents client-side modification
- `toggle_vote()` — SECURITY DEFINER function for atomic vote toggle + self-vote prevention

### Migrations

Numbered sequentially in `supabase/migrations/` (001-043, next: 044). Simple numeric scheme, not Supabase timestamps. Push with `supabase db push`.

One Edge Function: `supabase/functions/cleanup-storage/` (Deno runtime, excluded from tsconfig).

## Features

- **Post types:** Image + caption, text-only, link with OG preview (fetched server-side via `/api/og`)
- **Comments:** Collapsible, upvotable, one-level replies, max 500 chars, @mentions extracted
- **@Mentions:** Autocomplete on `@`, Realtime WebSocket for unread badge, rendered as profile links
- **Hashtags:** Extracted from captions, clickable links, followable, searchable via `/search`
- **Feed:** Three tabs (Live, Hot, Following). Infinite scroll, cursor-based pagination.
- **Discover:** `/search` — text searches users, `#` prefix searches hashtags
- **Leaderboard + Hall of Fame:** Daily top 100 archived, best post per day preserved
- **Admin moderation:** Shield icon on posts, strike system (1=delete, 2=warning, 3=ban), works 24/7. Separate NSFW auto-moderation track (`nsfw_strikes`, threshold 100).
- **Signup:** Email + username + password + Turnstile captcha. Disposable emails blocked. Google OAuth also supported.
- **Profile & Settings:** Edit display name, bio, avatar (with magic-byte validation). Change password. Delete account.
- **Password reset:** Forgot password → email → reset flow (`/auth/forgot-password`, `/auth/reset-password`)
- **Followers/Following:** Dedicated list pages at `/@[username]/followers` and `/@[username]/following`
- **Data export:** `GET /api/export` — GDPR-style full user data as JSON

## Daily Cleanup Cycle

Runs via **pg_cron** (NOT Vercel Cron — `vercel.json` is empty):

| Time (UTC) | Function | What it does |
|------------|----------|-------------|
| 21:25 | `archive_daily_leaderboard()` | Archives top 100 users, increments winner's `days_won`, archives top post to Hall of Fame |
| 21:35 | `cleanup_daily_content()` | Deletes mentions → post_hashtags → comment_votes → comments → votes → posts (FK order), then storage |

## GitHub & Deployment

### Git Workflow

- **Repo:** [github.com/loris307/twohrs](https://github.com/loris307/twohrs) (public)
- **Workflow:** Feature branches + PRs to `main`
- **Vercel is NOT connected to GitHub** — deploys are manual via CLI
- **Commit style:** Conventional Commits — `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:`, `ci:`, `build:`

### Two Environments

| Environment | URL | Time Window | Deploy |
|-------------|-----|-------------|--------|
| **Production** | `twohrs.com` | 20:00-22:00 CET | `vercel --yes --prod` |
| **Preview** | `socialnetwork-dev.vercel.app` | Always open | `vercel --yes` + `vercel alias <url> socialnetwork-dev.vercel.app` |

Deployment Protection is disabled.

### Environment Variables per Environment

| Variable | Production | Preview |
|----------|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | same |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key | same |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | same |
| `CRON_SECRET` | Cron secret | same |
| `NEXT_PUBLIC_OPEN_HOUR` | `20` | `0` |
| `NEXT_PUBLIC_CLOSE_HOUR` | `22` | `24` |

Both environments share the same Supabase database. The only difference is the time window.

### Preview Alias

The `socialnetwork-dev.vercel.app` alias points to a specific Preview deployment. After each `vercel --yes`, update it:

```bash
vercel alias <new-preview-url> socialnetwork-dev.vercel.app
```

### Supabase

- **Redirect URLs:** Both `twohrs.com/**` and `socialnetwork-dev.vercel.app/**` in Supabase Auth config
- **Storage buckets:** `memes` (public, 5MB) and `avatars` (public, 2MB)

### Production Checklist

- [ ] `NEXT_PUBLIC_OPEN_HOUR` / `NEXT_PUBLIC_CLOSE_HOUR` set correctly on Vercel (both environments)
- [ ] `app_config.time_window` in database matches env vars
- [ ] Both Vercel URLs in Supabase redirect URLs
- [ ] `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` set (both environments)
- [ ] pg_cron jobs running (migration 017)

## Build Notes

- **CRITICAL: NEVER run `pnpm build` while dev server is running!** Corrupts Turbopack cache.
- `supabase/functions/` excluded from tsconfig (Deno imports)
- `serverActions.bodySizeLimit` under `experimental` in next.config.ts (Next.js 15)
- Supabase SSR `setAll` callbacks need explicit type annotations for `cookiesToSet`

## Development History

`ENTWICKLUNG.md` documents every feature chronologically. **New features must be documented there** (and big ones in CLAUDE.md) with: feature name, **Warum** (motivation), what was built. Important for the YouTube video.

## Known Patterns

- **Redirect loop fix:** Landing page checks `isAppOpen()` before redirecting to `/feed`.
- **Signup flow:** Desktop creates account directly. Mobile shows share gate first (Web Share API → WhatsApp fallback).
- **Atomic vote toggle:** `supabase.rpc("toggle_vote", ...)` — SECURITY DEFINER function, prevents race conditions and self-voting.
- **OG fetching:** Server-side via `/api/og`, blocks private IPs (SSRF protection), 5s timeout.
- **API route auth:** All `/api/*` routes require auth (401 if not logged in). Exception: `/api/cron/*` uses Bearer token.
- **Profile data exposure:** Public queries use explicit column lists + `PublicProfile` type to avoid leaking admin/strike fields.
- **Navigation progress bar:** Auto-detects `<a>` clicks. For `router.push()`, dispatch `new Event("navigation-start")` first.
