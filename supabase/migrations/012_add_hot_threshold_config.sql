-- Add hot_min_upvotes config for the Hot feed tab threshold
INSERT INTO public.app_config (key, value) VALUES
  ('hot_min_upvotes', '3'::jsonb)
ON CONFLICT (key) DO NOTHING;
