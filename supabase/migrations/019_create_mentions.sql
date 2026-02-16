-- ==========================================
-- MIGRATION 019: @Mentions
-- ==========================================

-- 1. Mentions table (deleted daily with posts)
CREATE TABLE IF NOT EXISTS public.mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentioned_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentioning_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mention_source_check CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL)
);

-- Index for fetching a user's mentions sorted by time
CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_user
  ON public.mentions(mentioned_user_id, created_at DESC);

-- Index for cascade cleanup lookups
CREATE INDEX IF NOT EXISTS idx_mentions_post_id
  ON public.mentions(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentions_comment_id
  ON public.mentions(comment_id) WHERE comment_id IS NOT NULL;

-- 2. Add last_mentions_seen_at to profiles for unread tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_mentions_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 3. RLS
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mentions_select"
  ON public.mentions FOR SELECT
  TO authenticated
  USING (public.is_app_open() AND mentioned_user_id = auth.uid());

CREATE POLICY "mentions_insert"
  ON public.mentions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_app_open() AND mentioning_user_id = auth.uid());

CREATE POLICY "mentions_delete"
  ON public.mentions FOR DELETE
  TO authenticated
  USING (mentioning_user_id = auth.uid());

-- 4. Update cleanup function to also delete mentions
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
  DELETE FROM public.comment_votes;
  DELETE FROM public.comments;
  DELETE FROM public.votes;
  DELETE FROM public.posts;
END;
$$;
