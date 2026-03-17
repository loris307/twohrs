-- Enable Supabase Realtime for the mentions table
-- This allows clients to subscribe to INSERT events via WebSocket
-- instead of polling /api/mentions/unread every 30s
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication p
    JOIN pg_publication_rel pr ON pr.prpubid = p.oid
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'mentions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mentions;
  END IF;
END
$$;

-- Required for Realtime filters on non-PK columns (e.g. mentioned_user_id)
-- Without this, the filter `mentioned_user_id=eq.{userId}` cannot be evaluated
ALTER TABLE public.mentions REPLICA IDENTITY FULL;
