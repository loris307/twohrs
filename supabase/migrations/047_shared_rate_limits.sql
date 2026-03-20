-- ==========================================
-- MIGRATION 047: Shared rate limits
--
-- Moves rate limiting from process-local memory to Postgres.
-- Adds rate_limit_windows table + check_rate_limit RPC.
-- ==========================================

-- 1. Create rate limit table
CREATE TABLE IF NOT EXISTS public.rate_limit_windows (
  scope_key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL CHECK (hits >= 0),
  window_started_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_updated_at ON public.rate_limit_windows(updated_at);

-- 2. Enable RLS with no user policies (table is internal)
ALTER TABLE public.rate_limit_windows ENABLE ROW LEVEL SECURITY;

-- 3. Revoke direct access from application roles
REVOKE ALL ON public.rate_limit_windows FROM anon, authenticated;

-- 4. Create check_rate_limit RPC
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_scope_key TEXT,
  p_limit INTEGER,
  p_window_ms INTEGER
)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, retry_after_ms INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_window INTERVAL := (p_window_ms::TEXT || ' milliseconds')::INTERVAL;
  v_hits INTEGER;
  v_started TIMESTAMPTZ;
BEGIN
  -- Atomic upsert: insert new window or update existing
  INSERT INTO public.rate_limit_windows (scope_key, hits, window_started_at, updated_at)
  VALUES (p_scope_key, 1, v_now, v_now)
  ON CONFLICT (scope_key) DO UPDATE SET
    hits = CASE
      WHEN (v_now - rate_limit_windows.window_started_at) >= v_window
      THEN 1  -- Window expired, reset
      ELSE LEAST(rate_limit_windows.hits + 1, p_limit + 1)  -- Cap at limit+1
    END,
    window_started_at = CASE
      WHEN (v_now - rate_limit_windows.window_started_at) >= v_window
      THEN v_now  -- Reset window start
      ELSE rate_limit_windows.window_started_at  -- Keep existing
    END,
    updated_at = v_now
  RETURNING rate_limit_windows.hits, rate_limit_windows.window_started_at
  INTO v_hits, v_started;

  RETURN QUERY SELECT
    (v_hits <= p_limit) AS allowed,
    GREATEST(0, p_limit - v_hits) AS remaining,
    CASE
      WHEN v_hits <= p_limit THEN 0
      ELSE GREATEST(0, (EXTRACT(EPOCH FROM (v_started + v_window - v_now)) * 1000)::INTEGER)
    END AS retry_after_ms;
END;
$$;

-- 5. Grant execute to service_role only
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- 6. Append stale-row cleanup to cleanup_daily_content()
-- (Full function replacement — copy from latest migration 044 and add rate-limit cleanup)
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

  -- Clean up memes storage (preserve Hall of Fame images)
  BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'memes'
      AND name NOT LIKE 'top-posts/%'
      AND name NOT IN (
        SELECT image_path FROM public.top_posts_all_time
        WHERE image_path IS NOT NULL
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Memes storage cleanup skipped: %', SQLERRM;
  END;

  -- Clean up audio-posts storage (preserve Hall of Fame audio)
  BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'audio-posts'
      AND name NOT IN (
        SELECT audio_path FROM public.top_posts_all_time
        WHERE audio_path IS NOT NULL
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Audio storage cleanup skipped: %', SQLERRM;
  END;

  ALTER TABLE public.votes DISABLE TRIGGER on_vote_change;
  ALTER TABLE public.comment_votes DISABLE TRIGGER on_comment_vote_change;

  BEGIN
    DELETE FROM public.mentions;
    DELETE FROM public.post_hashtags;
    DELETE FROM public.comment_votes;
    DELETE FROM public.comments;
    DELETE FROM public.votes;
    DELETE FROM public.posts;
  EXCEPTION WHEN OTHERS THEN
    ALTER TABLE public.votes ENABLE TRIGGER on_vote_change;
    ALTER TABLE public.comment_votes ENABLE TRIGGER on_comment_vote_change;
    RAISE;
  END;

  ALTER TABLE public.votes ENABLE TRIGGER on_vote_change;
  ALTER TABLE public.comment_votes ENABLE TRIGGER on_comment_vote_change;

  -- Clean up stale rate-limit windows (best-effort, isolated)
  BEGIN
    DELETE FROM public.rate_limit_windows
    WHERE updated_at < now() - interval '7 days';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Rate-limit cleanup skipped: %', SQLERRM;
  END;
END;
$$;
