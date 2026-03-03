-- Fix admin permissions for challenges table
-- Drop existing policy and recreate with explicit permissions

DROP POLICY IF EXISTS "Admins can manage challenges" ON challenges;

-- Separate policies for different operations
CREATE POLICY "Admins can insert challenges" ON challenges
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update challenges" ON challenges
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete challenges" ON challenges
  FOR DELETE USING (is_admin());

-- Also ensure event_settings has proper policies
DROP POLICY IF EXISTS "Admins can insert event settings" ON event_settings;
CREATE POLICY "Admins can insert event settings" ON event_settings
  FOR INSERT WITH CHECK (is_admin());
