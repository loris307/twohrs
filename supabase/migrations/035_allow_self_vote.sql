-- Allow users to upvote their own posts (remove self-vote prevention)
CREATE OR REPLACE FUNCTION public.toggle_vote(p_user_id UUID, p_post_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  post_owner UUID;
  existed BOOLEAN;
BEGIN
  -- Enforce time-gate (SECURITY DEFINER bypasses RLS)
  IF NOT public.is_app_open() THEN
    RAISE EXCEPTION 'App is closed';
  END IF;

  -- Verify post exists
  SELECT user_id INTO post_owner FROM public.posts WHERE id = p_post_id;
  IF post_owner IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  -- Atomic toggle: try DELETE first
  DELETE FROM public.votes
    WHERE user_id = p_user_id AND post_id = p_post_id
    RETURNING TRUE INTO existed;

  IF existed IS NULL THEN
    INSERT INTO public.votes (user_id, post_id)
      VALUES (p_user_id, p_post_id);
    RETURN TRUE;  -- voted
  END IF;

  RETURN FALSE;  -- unvoted
END;
$$;
