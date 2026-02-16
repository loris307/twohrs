-- Migration 022: Banned Email Hashes
-- Stores SHA-256 hashes of banned user emails (strike 3).
-- On signup, the hash of the new email is checked against this table.
-- Only hashes are stored — no plaintext emails — for GDPR compliance.

CREATE TABLE IF NOT EXISTS public.banned_email_hashes (
  hash TEXT PRIMARY KEY,
  banned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS needed — only accessed by server actions via admin client
ALTER TABLE public.banned_email_hashes ENABLE ROW LEVEL SECURITY;
