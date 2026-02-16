# 2Hours — Zeitbegrenztes Soziales Netzwerk

## Project Overview

A social network that's only open a few hours per day (currently 20:00-22:00 CET, configurable via env vars). Users post memes (image + caption), text-only posts, or links with OG previews. They upvote posts and comments, and a daily leaderboard crowns the funniest person. Content is cleaned up daily. Every day starts fresh. The Hall of Fame preserves the best post of each day with its top comments.

## Tech Stack

- **Runtime:** Next.js 15 (App Router) · TypeScript (strict) · Node v25
- **Styling:** Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Hosting:** Vercel (2 environments: production + preview)
- **Source Control:** GitHub ([loris307/twohrs](https://github.com/loris307/twohrs)) — public, open-source
- **CI:** GitHub Actions (lint + type-check on PRs)
- **Package manager:** pnpm (never npm or yarn)

## Commands

```bash
pnpm install          # install dependencies
pnpm dev              # dev server on http://localhost:3000
pnpm build            # production build (NEVER while dev server is running!)
pnpm lint             # ESLint
pnpm tsc --noEmit     # type-check without emitting (safe during dev)
```

Deploy:
```bash
vercel --yes --prod                                            # production → twohrs.com
vercel --yes && vercel alias <url> socialnetwork-dev.vercel.app  # preview → dev alias
```

Database:
```bash
/opt/homebrew/opt/libpq/bin/psql "$DB_URL" -f supabase/migrations/XXX.sql  # run single migration
vercel env ls                                                               # list env vars
vercel env add VARIABLE_NAME production                                     # add env var
```

## Testing

No test suite currently. The project has no test framework, test files, or coverage tooling. If tests are added, use Vitest (aligns with Next.js/TypeScript stack). Type-checking is done via `pnpm tsc --noEmit`.

## Boundaries

### Always (do without asking)
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
- Connect Vercel to GitHub (deploys are manual via CLI)
- Push secrets, Supabase URLs/keys, or credentials to the public repo

## Project Structure

```
src/
├── app/
│   ├── (public)/          # Always accessible (landing, about)
│   ├── (auth)/            # Auth pages (login, signup, callback)
│   ├── (app)/             # Authenticated + time-gated (feed, create, leaderboard, profile, settings, post/[id], search)
│   └── api/
│       ├── feed/          # Feed pagination
│       ├── og/            # OG metadata fetching for URL previews
│       ├── comments/      # Comments API
│       ├── search/        # User search by username/display_name
│       ├── mentions/      # Mentions API (list, unread count, autocomplete suggestions)
│       ├── export/        # GDPR data export (full user data as JSON)
│       └── cron/          # Cron trigger endpoints (actual scheduling via pg_cron)
├── components/
│   ├── layout/            # Navbar, bottom-nav, time-banner, navigation-progress, active-users-count
│   ├── feed/              # Post card, post grid, upvote button, comment section, link preview, new-posts-banner, post-follow-button
│   ├── create/            # Image upload, create post form, OG preview
│   ├── leaderboard/       # Podium, entry row, table, top post card, archive-tabs
│   ├── profile/           # Profile header, stats, follow button, profile-tabs, mentions-list
│   ├── shared/            # Reusable components (mention-autocomplete)
│   └── countdown/         # Countdown timer, session timer, session-ended modal
├── lib/
│   ├── supabase/          # 4 Supabase clients (client, server, middleware, admin)
│   ├── actions/           # Server Actions (auth, posts, votes, comments, follows, profile, mentions, moderation)
│   ├── queries/           # Data fetching for Server Components (posts, comments, leaderboard, profile, mentions)
│   ├── hooks/             # Client hooks (useCountdown, useTimeGate, useInfiniteFeed, useNewPosts, useOnlineUsers, useUnreadMentions)
│   ├── utils/             # Pure utilities (cn, time, image, format, upload)
│   ├── constants.ts       # All magic numbers and config
│   ├── types.ts           # TypeScript types
│   └── validations.ts     # Zod schemas
└── middleware.ts           # Auth session refresh + time-gate routing

supabase/
├── migrations/            # SQL files (run in order, 001-027)
├── functions/             # Edge Functions (Deno runtime — excluded from tsconfig)
└── seed.sql               # Initial app_config values
```

## Code Style

### Example: Server Action pattern

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { isAppOpen } from "@/lib/utils/time";
import type { ActionResult } from "@/lib/types";

export async function createPost(formData: FormData): Promise<ActionResult> {
  if (!isAppOpen()) {
    return { success: false, error: "Die App ist gerade geschlossen" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Nicht eingeloggt" };
  }

  // ... validation, DB write, revalidate
  return { success: true };
}
```

### Example: Client component with optimistic UI

```typescript
"use client";

import { useState, useTransition, useCallback } from "react";
import { cn } from "@/lib/utils/cn";

interface UpvoteButtonProps {
  postId: string;
  initialCount: number;
  initialVoted: boolean;
}

export function UpvoteButton({ postId, initialCount, initialVoted }: UpvoteButtonProps) {
  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  const doUpvote = useCallback(() => {
    if (voted) return;
    setVoted(true);
    setCount((prev) => prev + 1);

    startTransition(async () => {
      const result = await toggleVote(postId);
      if (!result.success) {
        setVoted(false);             // rollback on error
        setCount((prev) => prev - 1);
      }
    });
  }, [voted, postId]);

  return <button onClick={doUpvote} className={cn("...", voted && "text-orange-500")} />;
}
```

### Naming Conventions

- Files: kebab-case (`post-card.tsx`, `use-countdown.ts`)
- Components: PascalCase (`PostCard`, `CountdownTimer`)
- Functions/variables: camelCase (`isAppOpen`, `handleSubmit`)
- Database columns: snake_case (`upvote_count`, `created_at`)
- Constants: UPPER_SNAKE_CASE (`MAX_POSTS_PER_SESSION`)

### Component Conventions

- Server Components by default. Only add `"use client"` when the component needs interactivity (hooks, event handlers, browser APIs).
- Tailwind classes directly on elements — no CSS modules, no styled-components.
- Use `cn()` from `@/lib/utils/cn` for conditional class merging.

### Server Action Conventions

- All in `src/lib/actions/`, marked with `"use server"`.
- Return `ActionResult<T>` type: `{ success: boolean; data?: T; error?: string }`.
- Always validate input with Zod schemas from `validations.ts`.
- Always check auth (`supabase.auth.getUser()`) and time gate (`isAppOpen()`) first.

### Data Fetching Conventions

- Server Components use functions from `src/lib/queries/`.
- Client-side pagination uses the `/api/feed` route + `useInfiniteFeed` hook.
- Optimistic UI for upvotes and comment votes (immediate visual update, rollback on error).

## Environment Variables

Copy `.env.example` to `.env` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon (public) key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (secret, for admin/cron operations)
- `CRON_SECRET` — Random secret for authenticating cron job endpoints
- `NEXT_PUBLIC_OPEN_HOUR` — (optional) Override app open hour (default: 23)
- `NEXT_PUBLIC_CLOSE_HOUR` — (optional) Override app close hour (default: 2)

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

The time window is configured at 3 levels:

- **Env vars (recommended):** `NEXT_PUBLIC_OPEN_HOUR` and `NEXT_PUBLIC_CLOSE_HOUR` — read by `constants.ts` at build time. Different values per Vercel environment (see Deployment section).
- **Fallback defaults:** `src/lib/constants.ts` — hardcoded fallbacks if env vars are not set (currently 23/2).
- **Database:** `app_config` table, key `time_window` — must be synced with the client constants for RLS to match.

On the Preview deployment, env vars are set to `OPEN_HOUR=0, CLOSE_HOUR=24` so the app is always open for testing.

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
| `profiles` | Yes | User profiles, lifetime stats, admin flag, moderation strikes |
| `posts` | **No** (deleted at midnight) | Daily posts (image, text-only, or link) |
| `votes` | **No** (deleted at midnight) | Post upvotes |
| `comments` | **No** (deleted at midnight) | Post comments |
| `comment_votes` | **No** (deleted at midnight) | Comment upvotes |
| `mentions` | **No** (deleted at midnight) | @mention tracking (who mentioned whom in which post/comment) |
| `post_hashtags` | **No** (deleted at midnight) | Hashtag-to-post junction (which hashtags a post has) |
| `follows` | Yes | Follow relationships |
| `hashtag_follows` | Yes | User-to-hashtag follow relationships |
| `daily_leaderboard` | Yes | Historical archive, grows daily |
| `top_posts_all_time` | Yes | Hall of Fame — best post per day with top comments |
| `app_config` | Yes | Server-side configuration (time window, limits) |

### Key Columns

**posts:** `image_url` and `image_path` are **nullable** (text-only posts). Has `og_title`, `og_description`, `og_image`, `og_url` for link previews. Has `comment_count` (denormalized). Constraint: at least `image_url` or `caption` must be non-null.

**comments:** `text` (max 500 chars), `upvote_count` (denormalized via trigger), `parent_comment_id` (nullable, one-level replies), sorted by upvotes in UI.

**mentions:** `mentioned_user_id`, `mentioning_user_id`, `post_id` (nullable), `comment_id` (nullable). Profiles have `last_mentions_seen_at` for unread tracking.

**post_hashtags:** `post_id`, `hashtag` (lowercase text). Unique per post+hashtag pair. Extracted from caption via regex, max 10 per post.

**hashtag_follows:** `user_id`, `hashtag` (lowercase text). Composite PK. Persistent (survives daily cleanup).

**top_posts_all_time:** `top_comments` JSONB column stores archived top 3 comments as `[{ username, text, upvote_count }]`.

### Denormalized Counts & Triggers

- `posts.upvote_count` — maintained by `handle_vote_change()` trigger on `votes`
- `posts.comment_count` — maintained by `handle_comment_count_change()` trigger on `comments`
- `comments.upvote_count` — maintained by `handle_comment_vote_change()` trigger on `comment_votes`
- `profiles.total_upvotes_received` — maintained by `handle_vote_change()` trigger

### Running Migrations

Migrations are in `supabase/migrations/` and must be run in order (001-027). Use psql:

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

### Comments & Replies

- Each post has a collapsible comment section (click to expand)
- Comments can be upvoted (same optimistic UI pattern as post upvotes)
- One-level replies via `parent_comment_id` (replies cannot be replied to)
- Sorted by upvote count (most upvoted first)
- Max 500 characters per comment
- @mentions in comments are extracted and stored
- Server action: `createComment`, `deleteComment`, `toggleCommentVote` in `src/lib/actions/comments.ts`
- Query: `getCommentsByPost` in `src/lib/queries/comments.ts`

### @Mentions

- Users can mention others with `@username` in posts and comments
- Autocomplete dropdown triggered by typing `@` (keyboard nav, debounced search)
- Mentions stored in `mentions` table, extracted via regex `@([a-z0-9_]{3,20})\b`
- Unread tracking via `profiles.last_mentions_seen_at`
- "Erwähnungen" tab on own profile shows posts where user was mentioned
- Unread badge in navbar/bottom-nav (polls every 30s via `useUnreadMentions`)
- Mentions rendered as clickable profile links via `renderTextWithMentions()`
- API: `/api/mentions` (list), `/api/mentions/unread` (count), `/api/mentions/suggestions` (autocomplete)

### Hashtags

- `#hashtag` in post captions are extracted and stored in `post_hashtags` table (max 10 per post)
- Hashtags rendered as clickable links in captions (→ `/search/hashtag/[tag]`)
- Hashtag detail page shows all posts with that hashtag, sorted by upvotes
- Users can follow/unfollow hashtags — followed hashtags appear in "Following" feed tab
- Extraction: regex `#([a-zA-Z0-9_äöüÄÖÜß]+)`, stored lowercase
- Server actions: `followHashtag`, `unfollowHashtag` in `src/lib/actions/hashtags.ts`
- Extraction utility: `extractHashtags()` in `src/lib/utils/hashtags.ts`
- DB function: `search_hashtags(query_prefix)` for efficient hashtag search with GROUP BY

### Discover (Entdecken)

- `/search` route — renamed from "Suche" to "Entdecken" (Compass icon)
- Plain text searches users by username/display name (existing behavior)
- `#` prefix searches hashtags used today, shows post count and follow button
- API: `GET /api/search?q=<query>` (returns `{ users }` or `{ hashtags }` based on `#` prefix)

### Admin Moderation

- `profiles.is_admin` boolean — set manually in Supabase (`UPDATE profiles SET is_admin = true WHERE username = 'xxx'`)
- `profiles.moderation_strikes` integer — tracks how many posts were deleted by admins
- Admins see a Shield icon on other users' posts in the feed → click to delete with confirmation
- Strike system: Strike 1 = silent delete, Strike 2 = warning banner shown to user, Strike 3 = automatic account deletion
- Warning banner in AppShell (dismissable per session, reappears on next load)
- Admins can also delete any comment (no strikes for comments)
- Admin actions bypass time-gate (moderation works 24/7)
- Server action: `adminDeletePost` in `src/lib/actions/moderation.ts`
- RLS policies updated: admins can delete any post/comment (migration 021)
- Admin delete button: `src/components/feed/admin-delete-button.tsx`
- Moderation warning: `src/components/layout/moderation-warning.tsx`

### Post Detail Page

- `/post/[id]` — Individual post view with full comment thread
- OG metadata for sharing (caption as title, image as OG image)
- Shows all comments with nested replies

### Data Export

- `GET /api/export` — GDPR-style full user data download as JSON
- Includes: profile, posts, comments, votes, follows, hashtag follows, leaderboard history
- Uses admin client to bypass RLS

### Feed

- Three tabs: Live (newest), Hot (most upvoted, min threshold), Following (followed users + followed hashtags)
- Infinite scroll with cursor-based pagination
- Hashtag feed: `/api/feed?hashtag=tagname` returns posts with that hashtag sorted by upvotes
- Post card shows: header (avatar, username, time), caption above image, image, OG link preview, upvote/comment/share buttons

### Hall of Fame

- `/leaderboard/top-posts` — Best post of each day (max 20 stored)
- Archived daily by cron before cleanup
- Includes top 3 comments per post (stored as JSONB)
- Weakest entry gets replaced if a new day's top post is stronger

## Daily Cleanup Cycle

Runs via **PostgreSQL pg_cron** extension (configured in migration 017, NOT Vercel Cron — `vercel.json` is empty):

| Time (UTC) | pg_cron Function | What it does |
|------------|------------------|-------------|
| 22:25 | `archive_daily_leaderboard()` | Archives top 100 users to `daily_leaderboard`, increments winner's `days_won`, archives top post + comments to Hall of Fame |
| 22:35 | `cleanup_daily_content()` | Deletes all mentions → post_hashtags → comment_votes → comments → votes → posts (FK order), then storage files |

The `/api/cron/*` endpoints still exist for manual invocation (require `Authorization: Bearer $CRON_SECRET`), but they just call the database functions.

## GitHub & Version Control

### Repository

- **Public repo:** [github.com/loris307/twohrs](https://github.com/loris307/twohrs)
- **Branch:** `main` (single branch, direct push)
- **Visibility:** Public (open-source)

### GitHub Actions CI

A CI workflow (`.github/workflows/ci.yml`) runs on every pull request to `main`:
- `pnpm lint` — ESLint
- `pnpm tsc --noEmit` — TypeScript type-check

This catches errors before merging external contributions.

### GitHub ↔ Vercel (NOT connected)

**Important:** Vercel is NOT connected to GitHub. Deployments happen manually via Vercel CLI (`vercel --yes --prod`). This means:
- Pushing to GitHub does **not** trigger a Vercel deploy
- Vercel deploys must be done separately from the local machine
- The typical workflow is: commit → push to GitHub → deploy to Vercel via CLI
- Do NOT connect Vercel to GitHub without explicit approval (would change the entire deploy flow)

### Git Workflow

```bash
git add <files> && git commit -m "message"   # commit locally
git push                                      # push to GitHub
vercel --yes --prod                           # deploy to production (separate step!)
```

## Deployment

### Two Environments on Vercel

Deployments happen via Vercel CLI from local (not connected to GitHub). There are two environments:

| Environment | URL | Time Window | Deploy Command |
|-------------|-----|-------------|----------------|
| **Production** | `https://twohrs.com` | 23:00-02:00 CET | `vercel --yes --prod` |
| **Preview (Dev)** | `https://socialnetwork-dev.vercel.app` | **Always open** (0-24) | `vercel --yes` + alias |

Deployment Protection is **disabled** — Preview URLs are publicly accessible without Vercel login.

### Deploy Workflow

```bash
# Deploy to Preview (for mobile testing etc.)
vercel --yes
# Then update the stable alias:
vercel alias <preview-url-from-output> socialnetwork-dev.vercel.app

# Deploy to Production
vercel --yes --prod
# → Automatically aliases to twohrs.com
```

### Environment Variables per Environment

All env vars are set on Vercel (not via `-e` flags). Manage with:

```bash
vercel env add VARIABLE_NAME production   # or: preview
vercel env ls                              # list all
vercel env rm VARIABLE_NAME production     # remove
```

Or via Vercel Dashboard → Project Settings → Environment Variables.

**Current env var setup:**

| Variable | Production | Preview |
|----------|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | same |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key | same |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | same |
| `CRON_SECRET` | Cron secret | same |
| `NEXT_PUBLIC_OPEN_HOUR` | `23` | `0` |
| `NEXT_PUBLIC_CLOSE_HOUR` | `2` | `24` |

Both environments share the same Supabase database. The only difference is the time window.

### Preview Alias

The `socialnetwork-dev.vercel.app` alias points to a specific Preview deployment. After each `vercel --yes`, the alias must be updated to point to the new deployment:

```bash
vercel alias <new-preview-url> socialnetwork-dev.vercel.app
```

Alternatively, just use the unique Preview URL from the deploy output directly.

### Supabase

- **Dashboard:** Authentication settings (disable email confirmation for dev, set redirect URLs for production domain)
- **Redirect URLs:** Both `https://twohrs.com/**` and `https://socialnetwork-dev.vercel.app/**` must be in Supabase Authentication → URL Configuration
- **Storage buckets:** `memes` (public, 5MB limit) and `avatars` (public, 2MB limit) — created by migration 010

### Production Checklist

- [ ] Verify `NEXT_PUBLIC_OPEN_HOUR` and `NEXT_PUBLIC_CLOSE_HOUR` are set correctly on Vercel for both environments
- [ ] Update `app_config.time_window` in database to match production env vars
- [ ] Add both Vercel URLs (`twohrs.com`, `socialnetwork-dev.vercel.app`) to Supabase redirect URLs
- [ ] Verify `CRON_SECRET` is set in Vercel env vars (both environments)
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel env vars (both environments)
- [ ] Enable email confirmation in Supabase if desired (currently disabled)
- [ ] Cron jobs running via pg_cron in database (migration 017)

## Build Notes

- **CRITICAL: NEVER run `pnpm build` while dev server is running!** It writes a webpack cache to `.next/` that corrupts Turbopack's cache, causing Internal Server Error. Use `pnpm tsc --noEmit` for type-checking instead.
- `supabase/functions/` must be excluded from tsconfig (Deno imports)
- `serverActions.bodySizeLimit` must be under `experimental` in next.config.ts (Next.js 15)
- Blob preview URLs in image upload use `<img>` with `eslint-disable` comment (Next Image can't handle blob URLs)
- Supabase SSR `setAll` callbacks need explicit type annotations for `cookiesToSet`

## Development History

The file `ENTWICKLUNG.md` documents the chronological order and reasoning behind every feature added to the project. **Whenever a new feature is implemented, it must be documented in `ENTWICKLUNG.md` and if its something big also in `CLAUDE.md`** — add a new phase section with:
- The feature name
- **Warum:** Why this feature was needed (the reasoning/motivation)
- What was built (bullet points)

This is important for the YouTube video about the project's development.

## Known Patterns

- **Redirect loop fix:** The landing page checks `isAppOpen()` before redirecting logged-in users to `/feed`. Without this, middleware and landing page fight each other.
- **Signup flow:** Desktop creates account directly. Mobile shows a share gate first (Web Share API → WhatsApp fallback) before account creation.
- **Optimistic UI:** Used for post upvotes and comment upvotes. Immediate state change, rollback on server error.
- **Denormalized counts:** `upvote_count` and `comment_count` are stored directly on rows and maintained by PostgreSQL triggers — never computed client-side.
- **OG fetching:** Done server-side via `/api/og?url=...` to avoid CORS. Parses `og:title`, `og:description`, `og:image` meta tags. 5s timeout.
- **Nullable image fields:** `posts.image_url` and `posts.image_path` can be null (text-only posts). Always check before accessing `.toLowerCase()` or passing to `<Image>`.
- **Navigation progress bar:** The top loading bar (`NavigationProgress`) auto-detects `<a>`/`<Link>` clicks. For programmatic navigation via `router.push()`, you must dispatch `document.dispatchEvent(new Event("navigation-start"))` before the push call, otherwise the progress bar won't show.
