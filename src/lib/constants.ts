export const OPEN_HOUR = Number(process.env.NEXT_PUBLIC_OPEN_HOUR ?? 20);
export const OPEN_MINUTE = 0;
export const CLOSE_HOUR = Number(process.env.NEXT_PUBLIC_CLOSE_HOUR ?? 22);
export const CLOSE_MINUTE = 0;
export const GRACE_MINUTES = 5;
export const TIMEZONE = "Europe/Berlin";

export const MAX_POSTS_PER_SESSION = 20;
export const MAX_COMMENTS_PER_SESSION = 100;
export const MAX_CAPTION_LENGTH = 280;
export const MAX_COMMENT_LENGTH = 500;
export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const MAX_AVATAR_SIZE_MB = 2;
export const MAX_AVATAR_SIZE_BYTES = MAX_AVATAR_SIZE_MB * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export const FEED_PAGE_SIZE = 20;

export const FEED_TABS = ["live", "hot", "following"] as const;
export type FeedTab = (typeof FEED_TABS)[number];
export const DEFAULT_FEED_TAB: FeedTab = "live";
export const HOT_MIN_UPVOTES = 3;
export const NEW_POSTS_POLL_INTERVAL = 15_000;

export const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/auth",
  "/post",
];

export const ALWAYS_ACCESSIBLE_ROUTES = [
  "/",
  "/about",
  "/auth",
  "/settings",
  "/account",
  "/leaderboard/history",
  "/leaderboard/top-posts",
];

export const TIME_GATED_ROUTES = ["/feed", "/create", "/leaderboard", "/search"];

// NSFW detection thresholds (probability 0-1) — only block actual porn, not bikini etc.
export const NSFW_THRESHOLDS: Record<string, number> = {
  Porn: 0.5,
  Hentai: 0.5,
};

// Auto-moderation: separate counter from admin strikes (3)
export const NSFW_STRIKE_BAN_THRESHOLD = 100;
