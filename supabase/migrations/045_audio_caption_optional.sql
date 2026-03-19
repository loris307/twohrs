-- ==========================================
-- MIGRATION 045: Make caption optional for audio posts
--
-- Removes the constraint that audio posts must have a caption.
-- Audio posts now only need audio_url to be valid.
-- ==========================================

ALTER TABLE public.posts DROP CONSTRAINT posts_content_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_content_check CHECK (
  image_url IS NOT NULL OR caption IS NOT NULL OR audio_url IS NOT NULL
);
