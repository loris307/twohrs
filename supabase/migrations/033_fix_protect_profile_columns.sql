-- ==========================================
-- MIGRATION 033: Fix protect_profile_columns trigger
--
-- The trigger (029) unconditionally blocked ALL updates to protected columns,
-- including from internal triggers (handle_vote_change, handle_comment_vote_change),
-- SECURITY DEFINER functions (archive_daily_leaderboard, increment_posts_created),
-- and the admin/service_role client (addModerationStrike).
--
-- Fix: Change to SECURITY INVOKER and check current_user.
-- PostgREST sets current_user to 'authenticated' or 'anon'.
-- Internal triggers, SECURITY DEFINER functions, service_role, and pg_cron
-- all run as 'postgres' or other non-PostgREST roles.
-- ==========================================

-- 1. Fix the protection trigger to only block direct client API calls
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

-- 2. Make increment_posts_created SECURITY DEFINER so it runs as postgres
--    (overrides the SECURITY INVOKER version from migration 032)
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
