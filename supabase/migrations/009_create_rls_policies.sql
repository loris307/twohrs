-- ==========================================
-- PROFILES
-- ==========================================

-- Anyone authenticated can read all profiles (always)
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ==========================================
-- POSTS
-- ==========================================

-- Can only read posts when app is open
CREATE POLICY "posts_select"
  ON public.posts FOR SELECT
  TO authenticated
  USING (public.is_app_open());

-- Can only create posts when app is open, for yourself
CREATE POLICY "posts_insert"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_app_open() AND auth.uid() = user_id);

-- Can delete own posts anytime
CREATE POLICY "posts_delete"
  ON public.posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==========================================
-- VOTES
-- ==========================================

-- Can only read votes when app is open
CREATE POLICY "votes_select"
  ON public.votes FOR SELECT
  TO authenticated
  USING (public.is_app_open());

-- Can only vote when app is open, for yourself
CREATE POLICY "votes_insert"
  ON public.votes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_app_open() AND auth.uid() = user_id);

-- Can delete own votes
CREATE POLICY "votes_delete"
  ON public.votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==========================================
-- FOLLOWS
-- ==========================================

-- Anyone authenticated can read all follows
CREATE POLICY "follows_select"
  ON public.follows FOR SELECT
  TO authenticated
  USING (true);

-- Can only follow when app is open, as yourself
CREATE POLICY "follows_insert"
  ON public.follows FOR INSERT
  TO authenticated
  WITH CHECK (public.is_app_open() AND auth.uid() = follower_id);

-- Can unfollow own follows anytime
CREATE POLICY "follows_delete"
  ON public.follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- ==========================================
-- DAILY LEADERBOARD
-- ==========================================

-- Anyone authenticated can read the leaderboard history
CREATE POLICY "daily_leaderboard_select"
  ON public.daily_leaderboard FOR SELECT
  TO authenticated
  USING (true);

-- Only service_role can insert/update/delete (cron jobs)
-- No additional policies needed; service_role bypasses RLS

-- ==========================================
-- APP CONFIG
-- ==========================================

-- Anyone authenticated can read config
CREATE POLICY "app_config_select"
  ON public.app_config FOR SELECT
  TO authenticated
  USING (true);

-- No insert/update/delete policies for authenticated
-- Only manageable via Supabase Dashboard or service_role
