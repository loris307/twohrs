-- Atomic increment for total_posts_created to prevent race conditions (L9)
CREATE OR REPLACE FUNCTION increment_posts_created(p_user_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY INVOKER
AS $$
  UPDATE profiles
  SET total_posts_created = total_posts_created + 1
  WHERE id = p_user_id;
$$;
