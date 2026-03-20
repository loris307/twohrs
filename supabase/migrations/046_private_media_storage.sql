-- Make memes and audio-posts private
UPDATE storage.buckets SET public = false WHERE id IN ('memes', 'audio-posts');

-- Drop public read policies
DROP POLICY IF EXISTS "memes_public_read" ON storage.objects;
DROP POLICY IF EXISTS "Public audio read access" ON storage.objects;

-- Add owner-scoped SELECT policies
CREATE POLICY "memes_owner_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'memes'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "audio_owner_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audio-posts'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Add indexes on top_posts_all_time for Hall-of-Fame proxy lookups
CREATE INDEX IF NOT EXISTS idx_top_posts_image_path ON public.top_posts_all_time(image_path);
CREATE INDEX IF NOT EXISTS idx_top_posts_audio_path ON public.top_posts_all_time(audio_path);
