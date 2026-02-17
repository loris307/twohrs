-- ==========================================
-- MIGRATION 029: Security Hardening
-- Fixes: M13, H5, M11, M3, L6
-- ==========================================

-- ==========================================
-- M13: Profile column protection trigger
-- Prevents users from resetting is_admin,
-- moderation_strikes, nsfw_strikes, days_won,
-- total_upvotes_received, total_posts_created
-- via direct Supabase API calls.
-- ==========================================
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.is_admin := OLD.is_admin;
  NEW.moderation_strikes := OLD.moderation_strikes;
  NEW.nsfw_strikes := OLD.nsfw_strikes;
  NEW.days_won := OLD.days_won;
  NEW.total_upvotes_received := OLD.total_upvotes_received;
  NEW.total_posts_created := OLD.total_posts_created;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_columns_trigger ON public.profiles;
CREATE TRIGGER protect_profile_columns_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_columns();

-- ==========================================
-- H5 + M3: Atomic vote toggle with self-vote
-- prevention. Replaces the check-then-act
-- pattern in the server action with a single
-- atomic DB function.
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
  -- M3: Prevent self-voting
  SELECT user_id INTO post_owner FROM public.posts WHERE id = p_post_id;
  IF post_owner IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;
  IF post_owner = p_user_id THEN
    RAISE EXCEPTION 'Cannot vote on own post';
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
-- M11: Add SET search_path to is_app_open()
-- The function is SECURITY DEFINER but was
-- missing search_path restriction.
-- ==========================================
CREATE OR REPLACE FUNCTION public.is_app_open()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  config_value JSONB;
  grace_minutes INTEGER;
  berlin_now TIMESTAMPTZ;
  current_hour INTEGER;
  current_minute INTEGER;
  current_total_minutes INTEGER;
  open_total_minutes INTEGER;
  close_total_minutes INTEGER;
BEGIN
  -- Get time window config
  SELECT value INTO config_value FROM public.app_config WHERE key = 'time_window';
  IF config_value IS NULL THEN
    config_value := '{"open_hour": 23, "open_minute": 0, "close_hour": 2, "close_minute": 0}'::jsonb;
  END IF;

  -- Get grace period
  SELECT (value)::INTEGER INTO grace_minutes FROM public.app_config WHERE key = 'grace_period_minutes';
  IF grace_minutes IS NULL THEN
    grace_minutes := 5;
  END IF;

  -- Get current time in Berlin timezone
  berlin_now := now() AT TIME ZONE 'Europe/Berlin';
  current_hour := EXTRACT(HOUR FROM berlin_now);
  current_minute := EXTRACT(MINUTE FROM berlin_now);
  current_total_minutes := current_hour * 60 + current_minute;

  -- Calculate open/close windows
  open_total_minutes := (config_value->>'open_hour')::INTEGER * 60 + (config_value->>'open_minute')::INTEGER;
  close_total_minutes := (config_value->>'close_hour')::INTEGER * 60 + (config_value->>'close_minute')::INTEGER + grace_minutes;

  -- Handle midnight crossing (e.g. open=23:00, close=02:00)
  IF open_total_minutes > close_total_minutes THEN
    -- Crosses midnight: open if current >= open OR current < close
    RETURN current_total_minutes >= open_total_minutes OR current_total_minutes < close_total_minutes;
  ELSE
    -- Same day: open if current >= open AND current < close
    RETURN current_total_minutes >= open_total_minutes AND current_total_minutes < close_total_minutes;
  END IF;
END;
$$;

-- ==========================================
-- L6: Tighten post_hashtags INSERT policy
-- Only allow inserting hashtags for own posts.
-- ==========================================
DROP POLICY IF EXISTS "post_hashtags_insert" ON public.post_hashtags;
CREATE POLICY "post_hashtags_insert"
  ON public.post_hashtags FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_app_open()
    AND post_id IN (SELECT id FROM public.posts WHERE user_id = auth.uid())
  );
