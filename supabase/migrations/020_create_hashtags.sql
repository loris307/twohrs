-- ==========================================
-- MIGRATION 020: Hashtags
-- ==========================================

-- 1. Post hashtags junction table (deleted daily with posts)
CREATE TABLE IF NOT EXISTS public.post_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  hashtag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique: one entry per hashtag per post
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_hashtags_post_hashtag
  ON public.post_hashtags(post_id, hashtag);

-- Index for searching posts by hashtag
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag
  ON public.post_hashtags(hashtag);

-- 2. Hashtag follows (persistent, like user follows)
CREATE TABLE IF NOT EXISTS public.hashtag_follows (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hashtag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, hashtag)
);

-- Index for looking up followers of a specific hashtag
CREATE INDEX IF NOT EXISTS idx_hashtag_follows_hashtag
  ON public.hashtag_follows(hashtag);

-- 3. RLS for post_hashtags
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_hashtags_select"
  ON public.post_hashtags FOR SELECT
  TO authenticated
  USING (public.is_app_open());

CREATE POLICY "post_hashtags_insert"
  ON public.post_hashtags FOR INSERT
  TO authenticated
  WITH CHECK (public.is_app_open());

CREATE POLICY "post_hashtags_delete"
  ON public.post_hashtags FOR DELETE
  TO authenticated
  USING (
    post_id IN (SELECT id FROM public.posts WHERE user_id = auth.uid())
  );

-- 4. RLS for hashtag_follows
ALTER TABLE public.hashtag_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hashtag_follows_select"
  ON public.hashtag_follows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "hashtag_follows_insert"
  ON public.hashtag_follows FOR INSERT
  TO authenticated
  WITH CHECK (public.is_app_open() AND auth.uid() = user_id);

CREATE POLICY "hashtag_follows_delete"
  ON public.hashtag_follows FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. DB function for efficient hashtag search with GROUP BY
CREATE OR REPLACE FUNCTION public.search_hashtags(query_prefix TEXT)
RETURNS TABLE(hashtag TEXT, post_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ph.hashtag, COUNT(*) AS post_count
  FROM public.post_hashtags ph
  WHERE ph.hashtag LIKE (query_prefix || '%')
  GROUP BY ph.hashtag
  ORDER BY post_count DESC
  LIMIT 20;
$$;

-- 6. Update cleanup function to also delete post_hashtags
CREATE OR REPLACE FUNCTION public.cleanup_daily_content()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- 1. Delete storage objects (memes bucket) except Hall of Fame images
  DELETE FROM storage.objects
  WHERE bucket_id = 'memes'
    AND name NOT LIKE 'top-posts/%'
    AND name NOT IN (
      SELECT image_path FROM public.top_posts_all_time
      WHERE image_path IS NOT NULL
    );

  -- 2. Delete all daily data in FK order
  DELETE FROM public.mentions;
  DELETE FROM public.post_hashtags;
  DELETE FROM public.comment_votes;
  DELETE FROM public.comments;
  DELETE FROM public.votes;
  DELETE FROM public.posts;
END;
$$;
