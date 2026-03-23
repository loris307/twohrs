-- Add image support to comments
ALTER TABLE comments ADD COLUMN image_path TEXT NULL;

-- Make text nullable (image-only comments allowed)
ALTER TABLE comments ALTER COLUMN text DROP NOT NULL;

-- Ensure at least text or image is present
ALTER TABLE comments ADD CONSTRAINT comment_text_or_image
  CHECK (text IS NOT NULL OR image_path IS NOT NULL);

-- Index image_path for media proxy lookups
CREATE INDEX IF NOT EXISTS idx_comments_image_path
  ON public.comments(image_path)
  WHERE image_path IS NOT NULL;
