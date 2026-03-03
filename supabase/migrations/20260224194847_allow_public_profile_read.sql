-- Allow anyone to read profiles for leaderboard display
-- This is safe because profiles only contain public information (name, email, role)
-- and no sensitive data

DROP POLICY IF EXISTS "Anyone can view profiles for leaderboard" ON profiles;

CREATE POLICY "Anyone can view profiles for leaderboard" ON profiles
  FOR SELECT USING (TRUE);
