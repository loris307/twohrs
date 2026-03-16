-- ==========================================
-- MIGRATION 041: Block confusable usernames
--
-- 1. Reject non-ASCII / invalid usernames at the DB layer on insert
--    and on any actual username change.
-- 2. Prevent direct client API calls from changing usernames at all.
--    The app has no username-change feature, so this closes the
--    impersonation path without affecting normal profile edits.
-- ==========================================

CREATE OR REPLACE FUNCTION public.enforce_profile_username_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.username IS NOT DISTINCT FROM OLD.username THEN
    RETURN NEW;
  END IF;

  IF NEW.username IS NULL OR NEW.username !~ '^[a-z0-9_]{3,20}$' THEN
    RAISE EXCEPTION 'Invalid username'
      USING ERRCODE = '23514',
            DETAIL = 'Usernames must be 3-20 characters using only lowercase letters, numbers, and underscores.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_username_rules_trigger ON public.profiles;
CREATE TRIGGER enforce_profile_username_rules_trigger
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_username_rules();

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.username := OLD.username;
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
