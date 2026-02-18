-- Fix L14: Escape LIKE metacharacters (% and _) in search_hashtags to prevent pattern injection
CREATE OR REPLACE FUNCTION public.search_hashtags(query_prefix TEXT)
RETURNS TABLE(hashtag TEXT, post_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ph.hashtag, COUNT(*) AS post_count
  FROM public.post_hashtags ph
  WHERE ph.hashtag LIKE (
    replace(replace(replace(query_prefix, '\', '\\'), '%', '\%'), '_', '\_') || '%'
  ) ESCAPE '\'
  GROUP BY ph.hashtag
  ORDER BY post_count DESC
  LIMIT 20;
$$;
