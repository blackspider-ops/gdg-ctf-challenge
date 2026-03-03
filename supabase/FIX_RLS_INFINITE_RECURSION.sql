-- Fix infinite recursion in profiles RLS policy
-- The issue: "Admins can view all profiles" policy queries profiles table to check if user is admin
-- This creates infinite recursion: to read profiles, it needs to read profiles

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create a new policy that uses a security definer function to break the recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the admin policy using the function
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin());

-- Also update other admin policies to use the function
DROP POLICY IF EXISTS "Admins can update event settings" ON event_settings;
CREATE POLICY "Admins can update event settings" ON event_settings
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage challenges" ON challenges;
CREATE POLICY "Admins can manage challenges" ON challenges
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins can view all progress" ON challenge_progress;
CREATE POLICY "Admins can view all progress" ON challenge_progress
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can update user summary" ON user_summary;
CREATE POLICY "Admins can update user summary" ON user_summary
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage admin logs" ON admin_logs;
CREATE POLICY "Admins can manage admin logs" ON admin_logs
  FOR ALL USING (is_admin());
