-- Create top_posts_all_time table (permanent archive of best daily posts)
CREATE TABLE IF NOT EXISTS public.top_posts_all_time (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_path TEXT NOT NULL,
  caption TEXT,
  upvote_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for sorting by upvotes
CREATE INDEX IF NOT EXISTS idx_top_posts_upvotes ON public.top_posts_all_time(upvote_count DESC);

-- Enable RLS
ALTER TABLE public.top_posts_all_time ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read top posts
CREATE POLICY "top_posts_select"
  ON public.top_posts_all_time FOR SELECT
  TO authenticated
  USING (true);
