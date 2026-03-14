-- ==========================================
-- MIGRATION 036: Move cron jobs to midnight CET
-- Archive at 22:50 UTC (23:50 CET)
-- Cleanup at 23:00 UTC (00:00 CET = midnight)
-- ==========================================

SELECT cron.unschedule('archive-leaderboard');
SELECT cron.unschedule('cleanup-daily-content');

SELECT cron.schedule(
  'archive-leaderboard',
  '50 22 * * *',
  $$SELECT public.archive_daily_leaderboard()$$
);

SELECT cron.schedule(
  'cleanup-daily-content',
  '0 23 * * *',
  $$SELECT public.cleanup_daily_content()$$
);
