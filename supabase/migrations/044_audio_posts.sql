-- ==========================================
-- MIGRATION 044: Audio posts
--
-- Adds audio post support:
-- 1. Nullable audio columns on posts and top_posts_all_time
-- 2. Updated content check constraint (audio posts require caption)
-- 3. Dedicated audio-posts storage bucket with policies
-- 4. Updated archive_daily_leaderboard() to include audio fields
-- 5. Updated cleanup_daily_content() to clean audio-posts bucket
-- ==========================================

-- 1. Add audio columns to posts
ALTER TABLE public.posts
  ADD COLUMN audio_url TEXT,
  ADD COLUMN audio_path TEXT,
  ADD COLUMN audio_duration_ms INTEGER,
  ADD COLUMN audio_mime_type TEXT;

-- 2. Add audio columns to top_posts_all_time
ALTER TABLE public.top_posts_all_time
  ADD COLUMN audio_url TEXT,
  ADD COLUMN audio_path TEXT,
  ADD COLUMN audio_duration_ms INTEGER,
  ADD COLUMN audio_mime_type TEXT;

-- 3. Update content check constraint
-- At least one content field present, and audio posts always require a caption
ALTER TABLE public.posts DROP CONSTRAINT posts_content_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_content_check CHECK (
  (image_url IS NOT NULL OR caption IS NOT NULL OR audio_url IS NOT NULL)
  AND (audio_url IS NULL OR caption IS NOT NULL)
);

-- 4. Create audio-posts storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-posts',
  'audio-posts',
  true,
  2097152,
  ARRAY['audio/webm', 'audio/ogg', 'audio/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies for audio-posts bucket
-- Public read
CREATE POLICY "Public audio read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audio-posts');

-- Owner-scoped insert (path must start with user's ID)
CREATE POLICY "Authenticated audio upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'audio-posts'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Owner-scoped delete
CREATE POLICY "Owner audio delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'audio-posts'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- 6. Update archive_daily_leaderboard() to include audio fields
CREATE OR REPLACE FUNCTION public.archive_daily_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_berlin_date DATE;
  v_top_post RECORD;
  v_current_count INTEGER;
  v_max_top_posts CONSTANT INTEGER := 20;
  v_top_comments JSONB;
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_berlin_date := (now() AT TIME ZONE 'Europe/Berlin')::date;

  IF NOT EXISTS (SELECT 1 FROM public.posts LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.daily_leaderboard
    (date, user_id, rank, total_upvotes, total_posts, best_post_caption, best_post_upvotes)
  SELECT
    v_berlin_date,
    p.user_id,
    ROW_NUMBER() OVER (ORDER BY SUM(p.upvote_count) DESC, COUNT(p.id) ASC)::integer AS rank,
    COALESCE(SUM(p.upvote_count), 0)::integer AS total_upvotes,
    COUNT(p.id)::integer AS total_posts,
    (
      SELECT caption FROM public.posts
      WHERE user_id = p.user_id
      ORDER BY upvote_count DESC
      LIMIT 1
    ) AS best_post_caption,
    MAX(p.upvote_count)::integer AS best_post_upvotes
  FROM public.posts p
  GROUP BY p.user_id
  ORDER BY total_upvotes DESC
  LIMIT 100
  ON CONFLICT (date, user_id) DO UPDATE SET
    rank = EXCLUDED.rank,
    total_upvotes = EXCLUDED.total_upvotes,
    total_posts = EXCLUDED.total_posts,
    best_post_caption = EXCLUDED.best_post_caption,
    best_post_upvotes = EXCLUDED.best_post_upvotes;

  -- Sync from archived history so reruns cannot double-count wins.
  UPDATE public.profiles p
  SET days_won = 0
  WHERE p.days_won <> 0
    AND NOT EXISTS (
      SELECT 1
      FROM public.daily_leaderboard dl
      WHERE dl.user_id = p.id
        AND dl.rank = 1
    );

  UPDATE public.profiles p
  SET days_won = winners.days_won
  FROM (
    SELECT user_id, COUNT(*)::integer AS days_won
    FROM public.daily_leaderboard
    WHERE rank = 1
    GROUP BY user_id
  ) winners
  WHERE p.id = winners.user_id
    AND p.days_won IS DISTINCT FROM winners.days_won;

  SELECT id, user_id, image_url, image_path, caption, upvote_count,
         audio_url, audio_path, audio_duration_ms, audio_mime_type
  INTO v_top_post
  FROM public.posts
  ORDER BY upvote_count DESC
  LIMIT 1;

  IF v_top_post IS NULL OR v_top_post.upvote_count = 0 THEN
    RETURN;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'username', c.username,
      'text', c.text,
      'upvote_count', c.upvote_count
    )
  ), '[]'::jsonb)
  INTO v_top_comments
  FROM (
    SELECT
      pr.username,
      cm.text,
      cm.upvote_count
    FROM public.comments cm
    JOIN public.profiles pr ON pr.id = cm.user_id
    WHERE cm.post_id = v_top_post.id
    ORDER BY cm.upvote_count DESC
    LIMIT 3
  ) c;

  INSERT INTO public.top_posts_all_time
    (date, user_id, image_url, image_path, caption, upvote_count, top_comments,
     audio_url, audio_path, audio_duration_ms, audio_mime_type)
  VALUES (
    v_berlin_date,
    v_top_post.user_id,
    v_top_post.image_url,
    v_top_post.image_path,
    v_top_post.caption,
    v_top_post.upvote_count,
    v_top_comments,
    v_top_post.audio_url,
    v_top_post.audio_path,
    v_top_post.audio_duration_ms,
    v_top_post.audio_mime_type
  )
  ON CONFLICT (date) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    image_url = EXCLUDED.image_url,
    image_path = EXCLUDED.image_path,
    caption = EXCLUDED.caption,
    upvote_count = EXCLUDED.upvote_count,
    top_comments = EXCLUDED.top_comments,
    audio_url = EXCLUDED.audio_url,
    audio_path = EXCLUDED.audio_path,
    audio_duration_ms = EXCLUDED.audio_duration_ms,
    audio_mime_type = EXCLUDED.audio_mime_type;

  SELECT COUNT(*) INTO v_current_count FROM public.top_posts_all_time;
  IF v_current_count > v_max_top_posts THEN
    DELETE FROM public.top_posts_all_time
    WHERE id = (
      SELECT id FROM public.top_posts_all_time
      WHERE date != v_berlin_date
      ORDER BY upvote_count ASC
      LIMIT 1
    );
  END IF;
END;
$$;

-- 7. Update cleanup_daily_content() to clean audio-posts bucket
CREATE OR REPLACE FUNCTION public.cleanup_daily_content()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Clean up memes storage (preserve Hall of Fame images)
  BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'memes'
      AND name NOT LIKE 'top-posts/%'
      AND name NOT IN (
        SELECT image_path FROM public.top_posts_all_time
        WHERE image_path IS NOT NULL
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Memes storage cleanup skipped: %', SQLERRM;
  END;

  -- Clean up audio-posts storage (preserve Hall of Fame audio)
  BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'audio-posts'
      AND name NOT IN (
        SELECT audio_path FROM public.top_posts_all_time
        WHERE audio_path IS NOT NULL
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Audio storage cleanup skipped: %', SQLERRM;
  END;

  ALTER TABLE public.votes DISABLE TRIGGER on_vote_change;
  ALTER TABLE public.comment_votes DISABLE TRIGGER on_comment_vote_change;

  BEGIN
    DELETE FROM public.mentions;
    DELETE FROM public.post_hashtags;
    DELETE FROM public.comment_votes;
    DELETE FROM public.comments;
    DELETE FROM public.votes;
    DELETE FROM public.posts;
  EXCEPTION WHEN OTHERS THEN
    ALTER TABLE public.votes ENABLE TRIGGER on_vote_change;
    ALTER TABLE public.comment_votes ENABLE TRIGGER on_comment_vote_change;
    RAISE;
  END;

  ALTER TABLE public.votes ENABLE TRIGGER on_vote_change;
  ALTER TABLE public.comment_votes ENABLE TRIGGER on_comment_vote_change;
END;
$$;
