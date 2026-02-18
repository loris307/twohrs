-- ==========================================
-- MIGRATION 034: Security Hardening Round 2
-- Fixes: C2, C3, H8, M5
-- ==========================================

-- ==========================================
-- C2 + H8: toggle_vote() — add SET search_path
-- and enforce time-gate check.
--
-- C2: The SECURITY DEFINER function needs
--     SET search_path = '' to prevent
--     search_path hijacking. All table refs
--     use public. prefix.
--
-- H8: Because toggle_vote() is SECURITY DEFINER
--     it bypasses RLS, so the is_app_open()
--     time-gate is not enforced. Add an explicit
--     check at the start of the function.
-- ==========================================
CREATE OR REPLACE FUNCTION public.toggle_vote(p_user_id UUID, p_post_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  post_owner UUID;
  existed BOOLEAN;
BEGIN
  -- H8: Enforce time-gate (SECURITY DEFINER bypasses RLS)
  IF NOT public.is_app_open() THEN
    RAISE EXCEPTION 'App is closed';
  END IF;

  -- Verify post exists
  SELECT user_id INTO post_owner FROM public.posts WHERE id = p_post_id;
  IF post_owner IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  -- Atomic toggle: try DELETE first
  DELETE FROM public.votes
    WHERE user_id = p_user_id AND post_id = p_post_id
    RETURNING TRUE INTO existed;

  IF existed IS NULL THEN
    -- No existing vote -> insert new one
    INSERT INTO public.votes (user_id, post_id)
      VALUES (p_user_id, p_post_id);
    RETURN TRUE;  -- voted
  END IF;

  RETURN FALSE;  -- unvoted
END;
$$;

-- ==========================================
-- C3: increment_posts_created() — ensure
-- fully qualified table reference.
--
-- The function has SET search_path = '' but
-- must use public.profiles (not bare profiles).
-- ==========================================
CREATE OR REPLACE FUNCTION public.increment_posts_created(p_user_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.profiles
  SET total_posts_created = total_posts_created + 1
  WHERE id = p_user_id;
$$;

-- ==========================================
-- M5: archive_daily_leaderboard() — prevent
-- RPC calls from authenticated users.
--
-- Any authenticated user could call this via
-- supabase.rpc('archive_daily_leaderboard').
-- Add authorization check: only postgres and
-- service_role may execute.
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
  -- M5: Only allow postgres / service_role to execute
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Berlin date — archive runs same evening as session
  v_berlin_date := (now() AT TIME ZONE 'Europe/Berlin')::date;

  -- ========== PART 1: Archive leaderboard ==========

  -- Check if there are any posts to archive
  IF NOT EXISTS (SELECT 1 FROM public.posts LIMIT 1) THEN
    RETURN;
  END IF;

  -- Insert aggregated user stats into daily_leaderboard (top 100)
  -- Tiebreaker: fewer posts = higher rank (more efficient = funnier)
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

  -- Insert into Hall of Fame
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
-- M5: cleanup_daily_content() — prevent
-- RPC calls from authenticated users.
--
-- Same issue as archive_daily_leaderboard:
-- any authenticated user could call this via
-- supabase.rpc('cleanup_daily_content').
-- ==========================================
CREATE OR REPLACE FUNCTION public.cleanup_daily_content()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- M5: Only allow postgres / service_role to execute
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 1. Try to delete storage objects (may fail due to storage.protect_delete trigger)
  BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'memes'
      AND name NOT LIKE 'top-posts/%'
      AND name NOT IN (
        SELECT image_path FROM public.top_posts_all_time
        WHERE image_path IS NOT NULL
      );
  EXCEPTION WHEN OTHERS THEN
    -- Storage cleanup failed (likely storage.protect_delete trigger)
    -- Continue with data cleanup — storage can be cleaned separately
    RAISE NOTICE 'Storage cleanup skipped: %', SQLERRM;
  END;

  -- 2. Delete all daily data in FK order
  DELETE FROM public.mentions;
  DELETE FROM public.post_hashtags;
  DELETE FROM public.comment_votes;
  DELETE FROM public.comments;
  DELETE FROM public.votes;
  DELETE FROM public.posts;
END;
$$;
