-- Function: is_app_open()
-- Checks if the app is currently within its operating window
CREATE OR REPLACE FUNCTION public.is_app_open()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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
    -- Default: 20:00 - 22:00
    config_value := '{"open_hour": 20, "open_minute": 0, "close_hour": 22, "close_minute": 0}'::jsonb;
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

  RETURN current_total_minutes >= open_total_minutes AND current_total_minutes < close_total_minutes;
END;
$$;

-- Function: handle_new_user()
-- Automatically creates a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::TEXT, 8)),
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Function: handle_vote_change()
-- Updates denormalized vote counts on posts and profiles
CREATE OR REPLACE FUNCTION public.handle_vote_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  post_author_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment post upvote_count
    UPDATE public.posts SET upvote_count = upvote_count + 1 WHERE id = NEW.post_id;
    -- Increment author's total_upvotes_received
    SELECT user_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;
    IF post_author_id IS NOT NULL THEN
      UPDATE public.profiles SET total_upvotes_received = total_upvotes_received + 1 WHERE id = post_author_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement post upvote_count
    UPDATE public.posts SET upvote_count = GREATEST(0, upvote_count - 1) WHERE id = OLD.post_id;
    -- Decrement author's total_upvotes_received
    SELECT user_id INTO post_author_id FROM public.posts WHERE id = OLD.post_id;
    IF post_author_id IS NOT NULL THEN
      UPDATE public.profiles SET total_upvotes_received = GREATEST(0, total_upvotes_received - 1) WHERE id = post_author_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
