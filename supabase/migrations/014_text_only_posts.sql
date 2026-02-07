-- Allow text-only posts (image no longer required)
ALTER TABLE posts ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE posts ALTER COLUMN image_path DROP NOT NULL;

-- OG preview data for URLs in captions
ALTER TABLE posts ADD COLUMN og_title TEXT;
ALTER TABLE posts ADD COLUMN og_description TEXT;
ALTER TABLE posts ADD COLUMN og_image TEXT;
ALTER TABLE posts ADD COLUMN og_url TEXT;

-- At least caption or image must be provided
ALTER TABLE posts ADD CONSTRAINT posts_content_check
  CHECK (image_url IS NOT NULL OR caption IS NOT NULL);
