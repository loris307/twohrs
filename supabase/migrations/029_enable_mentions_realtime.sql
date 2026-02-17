-- Enable Supabase Realtime for the mentions table
-- This allows clients to subscribe to INSERT events via WebSocket
-- instead of polling /api/mentions/unread every 30s
ALTER PUBLICATION supabase_realtime ADD TABLE mentions;

-- Required for Realtime filters on non-PK columns (e.g. mentioned_user_id)
-- Without this, the filter `mentioned_user_id=eq.{userId}` cannot be evaluated
ALTER TABLE mentions REPLICA IDENTITY FULL;
