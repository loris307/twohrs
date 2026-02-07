-- ==========================================
-- COMMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (length(text) <= 500),
  upvote_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_upvotes ON public.comments(post_id, upvote_count DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- COMMENT VOTES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.comment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_votes_user_comment ON public.comment_votes(user_id, comment_id);

ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- ADD comment_count TO POSTS
-- ==========================================
ALTER TABLE public.posts ADD COLUMN comment_count INTEGER NOT NULL DEFAULT 0;

-- ==========================================
-- ADD top_comments TO TOP_POSTS_ALL_TIME
-- ==========================================
ALTER TABLE public.top_posts_all_time ADD COLUMN top_comments JSONB DEFAULT '[]';

-- ==========================================
-- TRIGGER FUNCTION: handle_comment_vote_change()
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_comment_vote_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.comments SET upvote_count = upvote_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.comments SET upvote_count = GREATEST(0, upvote_count - 1) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER on_comment_vote_change
  AFTER INSERT OR DELETE ON public.comment_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_vote_change();

-- ==========================================
-- TRIGGER FUNCTION: handle_comment_count_change()
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_comment_count_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER on_comment_count_change
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_count_change();

-- ==========================================
-- RLS POLICIES: COMMENTS
-- ==========================================

-- Can read comments when app is open
CREATE POLICY "comments_select"
  ON public.comments FOR SELECT
  TO authenticated
  USING (public.is_app_open());

-- Can create comments when app is open, for yourself
CREATE POLICY "comments_insert"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_app_open() AND auth.uid() = user_id);

-- Can delete own comments anytime
CREATE POLICY "comments_delete"
  ON public.comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==========================================
-- RLS POLICIES: COMMENT VOTES
-- ==========================================

-- Can read comment votes when app is open
CREATE POLICY "comment_votes_select"
  ON public.comment_votes FOR SELECT
  TO authenticated
  USING (public.is_app_open());

-- Can vote on comments when app is open, for yourself
CREATE POLICY "comment_votes_insert"
  ON public.comment_votes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_app_open() AND auth.uid() = user_id);

-- Can delete own comment votes
CREATE POLICY "comment_votes_delete"
  ON public.comment_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
