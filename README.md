<div align="center">

# twohrs

### Social media. 2 hours. Then live your life.

A social network that's only open a few hours per day.\
Post memes, upvote the funniest ones, crown a daily winner.\
At midnight, everything gets deleted. Every day starts fresh.

[twohrs.com](https://twohrs.com)

---

**Next.js 15** · **Supabase** · **TypeScript** · **Tailwind CSS 4** · **Vercel**

</div>

<br>

## The Idea

Most social networks are designed to keep you scrolling forever. twohrs takes the opposite approach: **the app is only open for 2 hours per day**. When time is up, the session ends. At midnight, every post, comment, and vote is wiped clean. No archive. No "memories." No algorithm optimizing for your attention.

The result is a social network that feels more like a daily event than an endless feed. You show up, share something funny, vote on the best stuff, and leave. The daily leaderboard crowns the funniest person, and the **Hall of Fame** preserves the single best post of each day forever.

## Features

### Time-Limited Access
The app opens at a set time each evening and closes after 2 hours. A countdown timer shows when the next session starts, and a session timer counts down the remaining time. When the session ends, a modal appears and the app locks until tomorrow.

### Daily Reset
At midnight, a PostgreSQL cron job wipes all posts, comments, votes, mentions, and uploaded images. Only persistent data survives: user profiles, follow relationships, the leaderboard archive, and the Hall of Fame.

### Three Post Types
- **Image + Caption** -- Upload a meme with an optional caption
- **Text-only** -- Just words, no image required
- **Link with Preview** -- Paste a URL and get an automatic Open Graph preview (title, description, thumbnail)

### Feed
Three tabs to browse content:
- **Live** -- Newest posts first
- **Hot** -- Most upvoted posts (minimum threshold)
- **Following** -- Posts from people and hashtags you follow

Infinite scroll with cursor-based pagination and a "new posts" banner that appears in real-time.

### Upvotes & Comments
- Upvote posts and comments with optimistic UI (instant feedback, rollback on error)
- Threaded comments with one level of replies
- Comments sorted by upvote count
- `@mention` anyone with autocomplete and unread notification tracking

### Hashtags
`#hashtags` in captions are automatically extracted, linked, and searchable. Follow hashtags to see them in your Following feed. Browse hashtag pages to see all posts using a tag.

### Leaderboard & Hall of Fame
- **Daily Leaderboard** -- Top 100 users ranked by upvotes received, archived every night
- **Hall of Fame** -- The single best post of each day, preserved forever with its top 3 comments

### Discover
Search for users by username or display name. Search hashtags with `#` prefix to find trending topics and their post counts.

### Admin Moderation
A 3-strike system for content moderation. Admins can delete posts (adding a strike to the author). Strike 2 shows a warning, strike 3 automatically deletes the account. Moderation works 24/7, even when the app is closed.

### Privacy & Data Export
Full GDPR-compliant data export -- download all your data (profile, posts, comments, votes, follows, leaderboard history) as JSON.

## Architecture

### Time-Gating (4 Layers)

The time window is enforced at every level of the stack. No single bypass can break it:

| Layer | How |
|-------|-----|
| **Middleware** | Redirects all app routes to the landing page when closed |
| **Database RLS** | PostgreSQL `is_app_open()` function blocks reads/writes at the row level |
| **Server Actions** | Every write operation checks `isAppOpen()` before executing |
| **Client UI** | Countdown timer, session timer, and session-ended modal |

### Daily Lifecycle

```
 [App Opens]              [App Closes]           [Midnight]
      |                        |                      |
      |   Users post, vote,    |   Session ended      |   Archive leaderboard
      |   comment, follow      |   modal appears       |   Archive best post
      |                        |                      |   Delete all content
      |________________________|______________________|
```

### Database Design

Content is **ephemeral** (deleted nightly):
- `posts`, `votes`, `comments`, `comment_votes`, `mentions`, `post_hashtags`

Data is **persistent** (survives cleanup):
- `profiles`, `follows`, `hashtag_follows`, `daily_leaderboard`, `top_posts_all_time`

Counts are **denormalized** via PostgreSQL triggers -- `upvote_count` and `comment_count` live directly on rows for fast reads.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 15](https://nextjs.org) (App Router, Turbopack) |
| Language | [TypeScript](https://typescriptlang.org) (strict mode) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| Database | [Supabase](https://supabase.com) (PostgreSQL, Auth, Storage, RLS) |
| Hosting | [Vercel](https://vercel.com) |
| Validation | [Zod](https://zod.dev) |
| Icons | [Lucide](https://lucide.dev) |

## Project Structure

```
src/
├── app/
│   ├── (public)/          # Landing page, about (always accessible)
│   ├── (auth)/            # Login, signup, email callback
│   ├── (app)/             # Feed, create, leaderboard, profile, settings
│   └── api/               # Feed pagination, OG fetching, search, mentions, export
├── components/
│   ├── layout/            # Navbar, bottom nav, time banner
│   ├── feed/              # Post card, upvote button, comment section
│   ├── create/            # Image upload, post creation form
│   ├── leaderboard/       # Podium, rankings, Hall of Fame
│   ├── profile/           # User profile, stats, follows
│   └── countdown/         # Countdown timer, session timer, session-ended modal
├── lib/
│   ├── supabase/          # 4 Supabase clients (browser, server, middleware, admin)
│   ├── actions/           # Server Actions (posts, votes, comments, follows, etc.)
│   ├── queries/           # Data fetching for Server Components
│   ├── hooks/             # Client hooks (useCountdown, useInfiniteFeed, etc.)
│   ├── utils/             # Pure utilities (time, formatting, upload)
│   ├── constants.ts       # Configuration and magic numbers
│   ├── types.ts           # TypeScript types
│   └── validations.ts     # Zod schemas
└── middleware.ts          # Auth + time-gate enforcement

supabase/
├── migrations/            # 27 SQL migrations (run in order)
├── functions/             # Edge Functions (Deno runtime)
└── seed.sql               # Initial configuration
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v20+
- [pnpm](https://pnpm.io)
- A [Supabase](https://supabase.com) project

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/loris307/twohrs.git
   cd twohrs
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   CRON_SECRET=any-random-secret
   ```

4. **Run database migrations**
   ```bash
   for f in supabase/migrations/*.sql; do
     psql "$DATABASE_URL" -f "$f"
   done
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```

5. **Start the dev server**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

### Configuring the Time Window

By default, the app is open from 23:00 to 02:00 CET. Override with environment variables:

```bash
# Make the app always open (useful for development)
NEXT_PUBLIC_OPEN_HOUR=0
NEXT_PUBLIC_CLOSE_HOUR=24
```

Make sure to also update the `time_window` value in the `app_config` database table to match.

## Contributing

Contributions are welcome. The project uses GitHub Actions CI to run linting and type-checking on pull requests.

```bash
pnpm lint             # ESLint
pnpm tsc --noEmit     # Type-check
```

Please make sure both pass before submitting a PR.

## License

MIT
