-- ==========================================
-- MIGRATION 037: Revert cron schedule to 22:25/22:35 CET
-- Archive at 21:25 UTC (22:25 CET)
-- Cleanup at 21:35 UTC (22:35 CET)
-- ==========================================

SELECT cron.unschedule('archive-leaderboard');
SELECT cron.unschedule('cleanup-daily-content');

SELECT cron.schedule(
  'archive-leaderboard',
  '25 21 * * *',
  $$SELECT public.archive_daily_leaderboard()$$
);

SELECT cron.schedule(
  'cleanup-daily-content',
  '35 21 * * *',
  $$SELECT public.cleanup_daily_content()$$
);
