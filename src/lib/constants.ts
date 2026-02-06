export const OPEN_HOUR = 20;
export const OPEN_MINUTE = 0;
export const CLOSE_HOUR = 22;
export const CLOSE_MINUTE = 0;
export const GRACE_MINUTES = 5;
export const TIMEZONE = "Europe/Berlin";

export const MAX_POSTS_PER_SESSION = 10;
export const MAX_CAPTION_LENGTH = 280;
export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export const FEED_PAGE_SIZE = 20;

export const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/auth/login",
  "/auth/signup",
  "/auth/callback",
];

export const ALWAYS_ACCESSIBLE_ROUTES = [
  "/",
  "/about",
  "/auth/login",
  "/auth/signup",
  "/auth/callback",
  "/settings",
  "/leaderboard/history",
];

export const TIME_GATED_ROUTES = ["/feed", "/create", "/leaderboard"];
