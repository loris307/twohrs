-- Fix is_app_open() to handle midnight-crossing time windows (e.g. 23:00-02:00)
-- Previously, the simple AND check failed when close_hour < open_hour.
CREATE OR REPLACE FUNCTION public.is_app_open()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_value JSONB;
  grace_minutes INTEGER;
  berlin_now TIMESTAMPTZ;
  current_hour INTEGER;
  current_minute INTEGER;
  current_total_minutes INTEGER;
  open_total_minutes INTEGER;
  close_total_minutes INTEGER;
BEGIN
  -- Get time window config
  SELECT value INTO config_value FROM public.app_config WHERE key = 'time_window';
  IF config_value IS NULL THEN
    config_value := '{"open_hour": 23, "open_minute": 0, "close_hour": 2, "close_minute": 0}'::jsonb;
  END IF;

  -- Get grace period
  SELECT (value)::INTEGER INTO grace_minutes FROM public.app_config WHERE key = 'grace_period_minutes';
  IF grace_minutes IS NULL THEN
    grace_minutes := 5;
  END IF;

  -- Get current time in Berlin timezone
  berlin_now := now() AT TIME ZONE 'Europe/Berlin';
  current_hour := EXTRACT(HOUR FROM berlin_now);
  current_minute := EXTRACT(MINUTE FROM berlin_now);
  current_total_minutes := current_hour * 60 + current_minute;

  -- Calculate open/close windows
  open_total_minutes := (config_value->>'open_hour')::INTEGER * 60 + (config_value->>'open_minute')::INTEGER;
  close_total_minutes := (config_value->>'close_hour')::INTEGER * 60 + (config_value->>'close_minute')::INTEGER + grace_minutes;

  -- Handle midnight crossing (e.g. open=23:00, close=02:00)
  IF open_total_minutes > close_total_minutes THEN
    -- Crosses midnight: open if current >= open OR current < close
    RETURN current_total_minutes >= open_total_minutes OR current_total_minutes < close_total_minutes;
  ELSE
    -- Same day: open if current >= open AND current < close
    RETURN current_total_minutes >= open_total_minutes AND current_total_minutes < close_total_minutes;
  END IF;
END;
$$;

-- Update seed default to match actual production config (23:00-02:00)
UPDATE public.app_config
SET value = '{"open_hour": 23, "open_minute": 0, "close_hour": 2, "close_minute": 0, "timezone": "Europe/Berlin"}'::jsonb
WHERE key = 'time_window';
