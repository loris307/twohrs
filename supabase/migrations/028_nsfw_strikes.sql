-- Separate NSFW auto-moderation counter (threshold 100, independent from admin strikes at 3)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nsfw_strikes INTEGER NOT NULL DEFAULT 0;
