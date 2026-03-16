-- ==========================================
-- MIGRATION 040: Reassert hardening after late 029
--
-- The linked remote project is missing 029_security_hardening.sql.
-- If that migration is applied late via `supabase db push --include-all`,
-- it temporarily reverts protect_profile_columns() to an older, overly
-- broad version. Reassert the intended final state here so the rollout can
-- safely apply 029, 039, then this migration.
-- ==========================================

-- Reassert the final profile-protection trigger behavior from migration 033.
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.is_admin := OLD.is_admin;
    NEW.moderation_strikes := OLD.moderation_strikes;
    NEW.nsfw_strikes := OLD.nsfw_strikes;
    NEW.days_won := OLD.days_won;
    NEW.total_upvotes_received := OLD.total_upvotes_received;
    NEW.total_posts_created := OLD.total_posts_created;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_columns_trigger ON public.profiles;
CREATE TRIGGER protect_profile_columns_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_columns();

-- Reassert the hardened is_app_open() definition with search_path locked down.
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
  SELECT value INTO config_value FROM public.app_config WHERE key = 'time_window';
  IF config_value IS NULL THEN
    config_value := '{"open_hour": 23, "open_minute": 0, "close_hour": 2, "close_minute": 0}'::jsonb;
  END IF;

  SELECT (value)::INTEGER INTO grace_minutes FROM public.app_config WHERE key = 'grace_period_minutes';
  IF grace_minutes IS NULL THEN
    grace_minutes := 5;
  END IF;

  berlin_now := now() AT TIME ZONE 'Europe/Berlin';
  current_hour := EXTRACT(HOUR FROM berlin_now);
  current_minute := EXTRACT(MINUTE FROM berlin_now);
  current_total_minutes := current_hour * 60 + current_minute;

  open_total_minutes := (config_value->>'open_hour')::INTEGER * 60 + (config_value->>'open_minute')::INTEGER;
  close_total_minutes := (config_value->>'close_hour')::INTEGER * 60 + (config_value->>'close_minute')::INTEGER + grace_minutes;

  IF open_total_minutes > close_total_minutes THEN
    RETURN current_total_minutes >= open_total_minutes OR current_total_minutes < close_total_minutes;
  ELSE
    RETURN current_total_minutes >= open_total_minutes AND current_total_minutes < close_total_minutes;
  END IF;
END;
$$;

-- Reassert the tightened hashtag insert policy from migration 029.
DROP POLICY IF EXISTS "post_hashtags_insert" ON public.post_hashtags;
CREATE POLICY "post_hashtags_insert"
  ON public.post_hashtags FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_app_open()
    AND post_id IN (SELECT id FROM public.posts WHERE user_id = auth.uid())
  );
