-- Create daily_leaderboard table (historical archive, grows daily, never deleted)
CREATE TABLE IF NOT EXISTS public.daily_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  total_upvotes INTEGER NOT NULL,
  total_posts INTEGER NOT NULL,
  best_post_caption TEXT,
  best_post_upvotes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(date, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_leaderboard_date ON public.daily_leaderboard(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_leaderboard_date_rank ON public.daily_leaderboard(date DESC, rank ASC);
CREATE INDEX IF NOT EXISTS idx_daily_leaderboard_user_date ON public.daily_leaderboard(user_id, date DESC);

-- Enable RLS
ALTER TABLE public.daily_leaderboard ENABLE ROW LEVEL SECURITY;
