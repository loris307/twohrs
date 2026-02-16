-- ==========================================
-- MIGRATION 017: Move cron jobs to pg_cron
-- ==========================================

-- Allow text-only top posts (image_url/image_path were NOT NULL)
ALTER TABLE public.top_posts_all_time ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE public.top_posts_all_time ALTER COLUMN image_path DROP NOT NULL;

-- Enable pg_cron (already available on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ==========================================
-- FUNCTION: archive_daily_leaderboard()
-- Archives leaderboard + top post before cleanup
-- ==========================================
CREATE OR REPLACE FUNCTION public.archive_daily_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_berlin_date DATE;
  v_winner_id UUID;
  v_top_post RECORD;
  v_current_count INTEGER;
  v_weakest RECORD;
  v_max_top_posts CONSTANT INTEGER := 20;
  v_top_comments JSONB;
BEGIN
  -- Calculate Berlin date, subtract 3h to land inside the session window
  -- regardless of CET vs CEST
  v_berlin_date := ((now() - interval '3 hours') AT TIME ZONE 'Europe/Berlin')::date;

  -- ========== PART 1: Archive leaderboard ==========

  -- Check if there are any posts to archive
  IF NOT EXISTS (SELECT 1 FROM public.posts LIMIT 1) THEN
    RETURN;
  END IF;

  -- Insert aggregated user stats into daily_leaderboard (top 100)
  INSERT INTO public.daily_leaderboard
    (date, user_id, rank, total_upvotes, total_posts, best_post_caption, best_post_upvotes)
  SELECT
    v_berlin_date,
    p.user_id,
    ROW_NUMBER() OVER (ORDER BY SUM(p.upvote_count) DESC)::integer AS rank,
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

  -- Increment days_won for rank #1
  SELECT user_id INTO v_winner_id
  FROM public.daily_leaderboard
  WHERE date = v_berlin_date AND rank = 1
  LIMIT 1;

  IF v_winner_id IS NOT NULL THEN
    UPDATE public.profiles
    SET days_won = days_won + 1
    WHERE id = v_winner_id;
  END IF;

  -- ========== PART 2: Archive top post (Hall of Fame) ==========

  -- Find the #1 post by upvotes
  SELECT id, user_id, image_url, image_path, caption, upvote_count
  INTO v_top_post
  FROM public.posts
  ORDER BY upvote_count DESC
  LIMIT 1;

  -- Skip if no post or zero upvotes
  IF v_top_post IS NULL OR v_top_post.upvote_count = 0 THEN
    RETURN;
  END IF;

  -- Check current Hall of Fame count
  SELECT COUNT(*) INTO v_current_count FROM public.top_posts_all_time;

  -- If at capacity, check if today's post beats the weakest
  IF v_current_count >= v_max_top_posts THEN
    SELECT id, upvote_count
    INTO v_weakest
    FROM public.top_posts_all_time
    ORDER BY upvote_count ASC
    LIMIT 1;

    IF v_weakest IS NOT NULL AND v_top_post.upvote_count <= v_weakest.upvote_count THEN
      RETURN; -- Not strong enough
    END IF;

    -- Remove the weakest entry
    IF v_weakest IS NOT NULL THEN
      DELETE FROM public.top_posts_all_time WHERE id = v_weakest.id;
    END IF;
  END IF;

  -- Build top 3 comments as JSONB
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
    ORDER BY cm.upvote_count DESC
    LIMIT 3
  ) c;

  -- Insert into Hall of Fame (store original image_url/image_path, no copy needed)
  INSERT INTO public.top_posts_all_time
    (date, user_id, image_url, image_path, caption, upvote_count, top_comments)
  VALUES (
    v_berlin_date,
    v_top_post.user_id,
    v_top_post.image_url,
    v_top_post.image_path,
    v_top_post.caption,
    v_top_post.upvote_count,
    v_top_comments
  )
  ON CONFLICT (date) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    image_url = EXCLUDED.image_url,
    image_path = EXCLUDED.image_path,
    caption = EXCLUDED.caption,
    upvote_count = EXCLUDED.upvote_count,
    top_comments = EXCLUDED.top_comments;
END;
$$;

-- ==========================================
-- FUNCTION: cleanup_daily_content()
-- Deletes all daily content + storage files
-- ==========================================
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
  DELETE FROM public.comment_votes;
  DELETE FROM public.comments;
  DELETE FROM public.votes;
  DELETE FROM public.posts;
END;
$$;

-- ==========================================
-- SCHEDULE CRON JOBS (times in UTC)
-- Archive at 22:25 UTC (23:25 CET)
-- Cleanup at 22:35 UTC (23:35 CET)
-- ==========================================
SELECT cron.schedule(
  'archive-leaderboard',
  '25 22 * * *',
  $$SELECT public.archive_daily_leaderboard()$$
);

SELECT cron.schedule(
  'cleanup-daily-content',
  '35 22 * * *',
  $$SELECT public.cleanup_daily_content()$$
);
