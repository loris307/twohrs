-- Migration 021: Admin Moderation with Strike System
-- Adds is_admin flag and moderation_strikes counter to profiles.
-- Updates RLS policies to allow admins to delete any post/comment.

-- 1. Add admin flag and strike counter
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS moderation_strikes INTEGER NOT NULL DEFAULT 0;

-- 2. Update posts_delete policy: owner OR admin
DROP POLICY IF EXISTS "posts_delete" ON public.posts;
CREATE POLICY "posts_delete"
  ON public.posts FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 3. Update comments_delete policy: owner OR admin
DROP POLICY IF EXISTS "comments_delete" ON public.comments;
CREATE POLICY "comments_delete"
  ON public.comments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
