-- ==========================================
-- MIGRATION 039: Harden SECURITY DEFINER RPCs
-- ==========================================

-- Bind vote toggles to the caller's authenticated user ID.
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
  IF auth.role() IN ('authenticated', 'anon')
     AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'User mismatch';
  END IF;

  IF NOT public.is_app_open() THEN
    RAISE EXCEPTION 'App is closed';
  END IF;

  SELECT user_id INTO post_owner FROM public.posts WHERE id = p_post_id;
  IF post_owner IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  DELETE FROM public.votes
    WHERE user_id = p_user_id AND post_id = p_post_id
    RETURNING TRUE INTO existed;

  IF existed IS NULL THEN
    INSERT INTO public.votes (user_id, post_id)
      VALUES (p_user_id, p_post_id);
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Bind post counter increments to the caller's authenticated user ID.
CREATE OR REPLACE FUNCTION public.increment_posts_created(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() IN ('authenticated', 'anon')
     AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'User mismatch';
  END IF;

  UPDATE public.profiles
  SET total_posts_created = total_posts_created + 1
  WHERE id = p_user_id;
END;
$$;

-- Restrict archiving RPC execution to internal callers and service-role JWTs.
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

  SELECT user_id INTO v_winner_id
  FROM public.daily_leaderboard
  WHERE date = v_berlin_date AND rank = 1
  LIMIT 1;

  IF v_winner_id IS NOT NULL THEN
    UPDATE public.profiles
    SET days_won = days_won + 1
    WHERE id = v_winner_id;
  END IF;

  SELECT id, user_id, image_url, image_path, caption, upvote_count
  INTO v_top_post
  FROM public.posts
  ORDER BY upvote_count DESC
  LIMIT 1;

  IF v_top_post IS NULL OR v_top_post.upvote_count = 0 THEN
    RETURN;
  END IF;

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

-- Restrict cleanup RPC execution to internal callers and service-role JWTs.
CREATE OR REPLACE FUNCTION public.cleanup_daily_content()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'memes'
      AND name NOT LIKE 'top-posts/%'
      AND name NOT IN (
        SELECT image_path FROM public.top_posts_all_time
        WHERE image_path IS NOT NULL
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Storage cleanup skipped: %', SQLERRM;
  END;

  DELETE FROM public.mentions;
  DELETE FROM public.post_hashtags;
  DELETE FROM public.comment_votes;
  DELETE FROM public.comments;
  DELETE FROM public.votes;
  DELETE FROM public.posts;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.toggle_vote(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_vote(UUID, UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.increment_posts_created(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_posts_created(UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.archive_daily_leaderboard() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.archive_daily_leaderboard() TO service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_daily_content() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_daily_content() TO service_role;

REVOKE SELECT (is_admin, moderation_strikes, nsfw_strikes, last_mentions_seen_at)
  ON public.profiles
  FROM PUBLIC, anon, authenticated;
GRANT SELECT (is_admin, moderation_strikes, nsfw_strikes, last_mentions_seen_at)
  ON public.profiles
  TO service_role;
