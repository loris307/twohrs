-- ==========================================
-- MIGRATION 048: Threaded comment threads
--
-- Adds nested comment support:
-- 1. Thread metadata columns (depth, root_comment_id, reply_count, deleted_at, deleted_by)
-- 2. Backfill existing data
-- 3. Indexes for paginated thread queries
-- 4. reply_count trigger (increment/decrement on ancestors)
-- 5. Extended comment_count trigger for soft delete
-- 6. Remove DELETE RLS policy (soft delete only via admin client)
-- 7. Updated archive_daily_leaderboard() with deleted_at filter
-- ==========================================

-- 1. New columns
ALTER TABLE public.comments
  ADD COLUMN depth INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN root_comment_id UUID REFERENCES public.comments(id) ON DELETE SET NULL,
  ADD COLUMN reply_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.comments
  ADD CONSTRAINT comments_depth_check
  CHECK (depth >= 0 AND depth <= 12);

-- 2. Indexes for paginated thread queries
CREATE INDEX IF NOT EXISTS idx_comments_post_top_level_best
  ON public.comments (post_id, upvote_count DESC, created_at ASC, id ASC)
  WHERE parent_comment_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_comments_parent_best
  ON public.comments (parent_comment_id, upvote_count DESC, created_at ASC, id ASC)
  WHERE parent_comment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comments_root_comment_id
  ON public.comments (root_comment_id);

-- Drop old partially redundant indexes
DROP INDEX IF EXISTS idx_comments_post_upvotes;
DROP INDEX IF EXISTS idx_comments_parent_comment_id;

-- 3. Backfill existing data
UPDATE public.comments
SET depth = 0, root_comment_id = id
WHERE parent_comment_id IS NULL;

UPDATE public.comments
SET depth = 1, root_comment_id = parent_comment_id
WHERE parent_comment_id IS NOT NULL;

-- Now enforce NOT NULL
ALTER TABLE public.comments
  ALTER COLUMN root_comment_id SET NOT NULL;

-- Backfill reply_count for existing parents (only 1-level deep replies exist pre-migration)
UPDATE public.comments p
SET reply_count = sub.cnt
FROM (
  SELECT parent_comment_id, COUNT(*)::integer AS cnt
  FROM public.comments
  WHERE parent_comment_id IS NOT NULL
  GROUP BY parent_comment_id
) sub
WHERE p.id = sub.parent_comment_id;

-- 4. Trigger for reply_count (increment and decrement)
CREATE OR REPLACE FUNCTION public.handle_reply_count_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- INSERT: new comment with parent -> all ancestors +1
  IF TG_OP = 'INSERT' AND NEW.parent_comment_id IS NOT NULL THEN
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_comment_id
      FROM public.comments
      WHERE id = NEW.parent_comment_id
      UNION ALL
      SELECT c.id, c.parent_comment_id
      FROM public.comments c
      JOIN ancestors a ON c.id = a.parent_comment_id
    )
    UPDATE public.comments
    SET reply_count = reply_count + 1
    WHERE id IN (SELECT id FROM ancestors);
    RETURN NEW;
  END IF;

  -- UPDATE: Soft Delete (deleted_at changes from NULL to non-NULL) -> all ancestors -1
  IF TG_OP = 'UPDATE'
    AND OLD.deleted_at IS NULL
    AND NEW.deleted_at IS NOT NULL
    AND NEW.parent_comment_id IS NOT NULL
  THEN
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_comment_id
      FROM public.comments
      WHERE id = NEW.parent_comment_id
      UNION ALL
      SELECT c.id, c.parent_comment_id
      FROM public.comments c
      JOIN ancestors a ON c.id = a.parent_comment_id
    )
    UPDATE public.comments
    SET reply_count = GREATEST(reply_count - 1, 0)
    WHERE id IN (SELECT id FROM ancestors);
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_reply_count_change
  AFTER INSERT OR UPDATE OF deleted_at ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_reply_count_change();

-- 5. Extend comment_count trigger for soft delete
CREATE OR REPLACE FUNCTION public.handle_comment_count_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET comment_count = comment_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = OLD.post_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Soft Delete: deleted_at changes from NULL to non-NULL
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE public.posts
      SET comment_count = GREATEST(comment_count - 1, 0)
      WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Recreate trigger to also fire on UPDATE OF deleted_at
DROP TRIGGER IF EXISTS on_comment_count_change ON public.comments;
CREATE TRIGGER on_comment_count_change
  AFTER INSERT OR DELETE OR UPDATE OF deleted_at ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_count_change();

-- 6. Remove DELETE RLS policy (soft delete only)
DROP POLICY IF EXISTS comments_delete ON public.comments;

-- 7. Update archive_daily_leaderboard() with deleted_at filter on top comments
CREATE OR REPLACE FUNCTION public.archive_daily_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_berlin_date DATE;
  v_top_post RECORD;
  v_current_count INTEGER;
  v_max_top_posts CONSTANT INTEGER := 20;
  v_top_comments JSONB;
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_berlin_date := (now() AT TIME ZONE 'Europe/Berlin')::date;

  IF NOT EXISTS (SELECT 1 FROM public.posts LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.daily_leaderboard
    (date, user_id, rank, total_upvotes, total_posts, best_post_caption, best_post_upvotes)
  SELECT
    v_berlin_date,
    p.user_id,
    ROW_NUMBER() OVER (ORDER BY SUM(p.upvote_count) DESC, COUNT(p.id) ASC)::integer AS rank,
    COALESCE(SUM(p.upvote_count), 0)::integer AS total_upvotes,
    COUNT(p.id)::integer AS total_posts,
    (
      SELECT caption FROM public.posts
      WHERE user_id = p.user_id
      ORDER BY upvote_count DESC
      LIMIT 1
    ) AS best_post_caption,
    MAX(p.upvote_count)::integer AS best_post_upvotes
  FROM public.posts p
  GROUP BY p.user_id
  ORDER BY total_upvotes DESC
  LIMIT 100
  ON CONFLICT (date, user_id) DO UPDATE SET
    rank = EXCLUDED.rank,
    total_upvotes = EXCLUDED.total_upvotes,
    total_posts = EXCLUDED.total_posts,
    best_post_caption = EXCLUDED.best_post_caption,
    best_post_upvotes = EXCLUDED.best_post_upvotes;

  -- Sync from archived history so reruns cannot double-count wins.
  UPDATE public.profiles p
  SET days_won = 0
  WHERE p.days_won <> 0
    AND NOT EXISTS (
      SELECT 1
      FROM public.daily_leaderboard dl
      WHERE dl.user_id = p.id
        AND dl.rank = 1
    );

  UPDATE public.profiles p
  SET days_won = winners.days_won
  FROM (
    SELECT user_id, COUNT(*)::integer AS days_won
    FROM public.daily_leaderboard
    WHERE rank = 1
    GROUP BY user_id
  ) winners
  WHERE p.id = winners.user_id
    AND p.days_won IS DISTINCT FROM winners.days_won;

  SELECT id, user_id, image_url, image_path, caption, upvote_count,
         audio_url, audio_path, audio_duration_ms, audio_mime_type
  INTO v_top_post
  FROM public.posts
  ORDER BY upvote_count DESC
  LIMIT 1;

  IF v_top_post IS NULL OR v_top_post.upvote_count = 0 THEN
    RETURN;
  END IF;

  -- Top comments: filter out soft-deleted, include all depths (not just top-level)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'username', c.username,
      'text', c.text,
      'upvote_count', c.upvote_count
    )
  ), '[]'::jsonb)
  INTO v_top_comments
  FROM (
    SELECT
      pr.username,
      cm.text,
      cm.upvote_count
    FROM public.comments cm
    JOIN public.profiles pr ON pr.id = cm.user_id
    WHERE cm.post_id = v_top_post.id
      AND cm.deleted_at IS NULL
    ORDER BY cm.upvote_count DESC
    LIMIT 3
  ) c;

  INSERT INTO public.top_posts_all_time
    (date, user_id, image_url, image_path, caption, upvote_count, top_comments,
     audio_url, audio_path, audio_duration_ms, audio_mime_type)
  VALUES (
    v_berlin_date,
    v_top_post.user_id,
    v_top_post.image_url,
    v_top_post.image_path,
    v_top_post.caption,
    v_top_post.upvote_count,
    v_top_comments,
    v_top_post.audio_url,
    v_top_post.audio_path,
    v_top_post.audio_duration_ms,
    v_top_post.audio_mime_type
  )
  ON CONFLICT (date) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    image_url = EXCLUDED.image_url,
    image_path = EXCLUDED.image_path,
    caption = EXCLUDED.caption,
    upvote_count = EXCLUDED.upvote_count,
    top_comments = EXCLUDED.top_comments,
    audio_url = EXCLUDED.audio_url,
    audio_path = EXCLUDED.audio_path,
    audio_duration_ms = EXCLUDED.audio_duration_ms,
    audio_mime_type = EXCLUDED.audio_mime_type;

  SELECT COUNT(*) INTO v_current_count FROM public.top_posts_all_time;
  IF v_current_count > v_max_top_posts THEN
    DELETE FROM public.top_posts_all_time
    WHERE id = (
      SELECT id FROM public.top_posts_all_time
      WHERE date != v_berlin_date
      ORDER BY upvote_count ASC
      LIMIT 1
    );
  END IF;
END;
$$;
