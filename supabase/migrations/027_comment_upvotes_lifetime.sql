-- ==========================================
-- MIGRATION 027: Count comment upvotes in lifetime stats
--
-- Update handle_comment_vote_change() to also increment/decrement
-- total_upvotes_received on the comment author's profile.
-- (Cleanup already disables this trigger, so no reset issue.)
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_comment_vote_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  comment_author_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.comments SET upvote_count = upvote_count + 1 WHERE id = NEW.comment_id;
    -- Increment comment author's lifetime upvotes
    SELECT user_id INTO comment_author_id FROM public.comments WHERE id = NEW.comment_id;
    IF comment_author_id IS NOT NULL THEN
      UPDATE public.profiles SET total_upvotes_received = total_upvotes_received + 1 WHERE id = comment_author_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.comments SET upvote_count = GREATEST(0, upvote_count - 1) WHERE id = OLD.comment_id;
    -- Decrement comment author's lifetime upvotes
    SELECT user_id INTO comment_author_id FROM public.comments WHERE id = OLD.comment_id;
    IF comment_author_id IS NOT NULL THEN
      UPDATE public.profiles SET total_upvotes_received = GREATEST(0, total_upvotes_received - 1) WHERE id = comment_author_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
