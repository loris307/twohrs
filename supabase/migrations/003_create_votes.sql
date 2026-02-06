-- Create votes table (one upvote per user per post)
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_votes_user_post ON public.votes(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_votes_post_id ON public.votes(post_id);

-- Enable RLS
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
