-- ==========================================
-- MIGRATION 026: Fix lifetime profile stats
--
-- Problem: cleanup_daily_content() deletes votes, which fires
-- the on_vote_change trigger and decrements total_upvotes_received
-- back to 0. Lifetime stats should never be decremented by cleanup.
--
-- Fix: Disable vote trigger during cleanup so lifetime stats persist.
-- Also recalculate correct values from daily_leaderboard history.
-- ==========================================

-- ========== 1. Fix cleanup to disable triggers during deletion ==========
CREATE OR REPLACE FUNCTION public.cleanup_daily_content()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
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
    RAISE NOTICE 'Storage cleanup skipped: %', SQLERRM;
  END;

  -- 2. Disable triggers that decrement lifetime profile stats
  ALTER TABLE public.votes DISABLE TRIGGER on_vote_change;
  ALTER TABLE public.comment_votes DISABLE TRIGGER on_comment_vote_change;

  -- 3. Delete all daily data in FK order
  DELETE FROM public.mentions;
  DELETE FROM public.post_hashtags;
  DELETE FROM public.comment_votes;
  DELETE FROM public.comments;
  DELETE FROM public.votes;
  DELETE FROM public.posts;

  -- 4. Re-enable triggers
  ALTER TABLE public.votes ENABLE TRIGGER on_vote_change;
  ALTER TABLE public.comment_votes ENABLE TRIGGER on_comment_vote_change;
END;
$$;

-- ========== 2. Restore correct lifetime upvotes from leaderboard history ==========
-- Reset all to 0 first, then set from daily_leaderboard aggregation
UPDATE public.profiles SET total_upvotes_received = 0;

UPDATE public.profiles p
SET total_upvotes_received = agg.lifetime_upvotes
FROM (
  SELECT user_id, COALESCE(SUM(total_upvotes), 0)::integer AS lifetime_upvotes
  FROM public.daily_leaderboard
  GROUP BY user_id
) agg
WHERE p.id = agg.user_id;
