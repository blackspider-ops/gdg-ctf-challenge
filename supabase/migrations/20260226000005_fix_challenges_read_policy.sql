-- Drop existing read policy if it exists
DROP POLICY IF EXISTS "Anyone can view active challenges" ON challenges;
DROP POLICY IF EXISTS "Players can view active challenges" ON challenges;
DROP POLICY IF EXISTS "Users can view active challenges" ON challenges;

-- Create a policy that allows authenticated users to read active challenges
CREATE POLICY "Authenticated users can view active challenges" ON challenges
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND is_active = true
  );

-- Also allow admins to view all challenges (active or inactive)
CREATE POLICY "Admins can view all challenges" ON challenges
  FOR SELECT
  USING (is_admin());
