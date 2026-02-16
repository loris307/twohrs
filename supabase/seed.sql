-- Seed initial app_config values
INSERT INTO public.app_config (key, value) VALUES
  ('time_window', '{"open_hour": 23, "open_minute": 0, "close_hour": 2, "close_minute": 0, "timezone": "Europe/Berlin"}'::jsonb),
  ('grace_period_minutes', '5'::jsonb),
  ('max_posts_per_session', '10'::jsonb),
  ('max_image_size_mb', '5'::jsonb)
ON CONFLICT (key) DO NOTHING;
