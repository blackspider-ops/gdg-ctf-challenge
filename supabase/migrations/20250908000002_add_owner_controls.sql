-- Add owner role and implement ownership controls
-- This migration adds ownership controls (enum value must be added separately)
-- Run 20250908000001_add_owner_enum.sql first!

-- Create a function to check if the current user is the owner
CREATE OR REPLACE FUNCTION is_owner(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = check_user_id AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a user can modify roles
CREATE OR REPLACE FUNCTION can_modify_user_role(target_user_id UUID, new_role app_role)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role app_role;
  target_user_role app_role;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Get target user's current role
  SELECT role INTO target_user_role 
  FROM profiles 
  WHERE user_id = target_user_id;
  
  -- Only owner can modify roles to/from owner
  IF target_user_role = 'owner' OR new_role = 'owner' THEN
    RETURN current_user_role = 'owner';
  END IF;
  
  -- Admins and owners can modify player/admin roles
  RETURN current_user_role IN ('admin', 'owner');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the profiles policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;

-- Create new policies for profiles
CREATE POLICY "Anyone can view profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins and owners can update any profile" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Set tms7397 as the owner (you'll need to update this with the actual user ID)
-- This will be done after the user signs up, but we'll create a function to do it safely
CREATE OR REPLACE FUNCTION set_initial_owner(user_email TEXT)
RETURNS VOID AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Find user by email
  SELECT user_id INTO user_id 
  FROM profiles 
  WHERE email = user_email;
  
  -- Only set as owner if no owner exists yet
  IF user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM profiles WHERE role = 'owner') THEN
    UPDATE profiles 
    SET role = 'owner' 
    WHERE user_id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_modify_user_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION set_initial_owner(TEXT) TO authenticated;

-- Update admin policies to include owner
DROP POLICY IF EXISTS "Admins can update event settings" ON event_settings;
CREATE POLICY "Admins and owners can update event settings" ON event_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Admins can manage challenges" ON challenges;
CREATE POLICY "Admins and owners can manage challenges" ON challenges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Admins can view all progress" ON challenge_progress;
CREATE POLICY "Admins and owners can view all progress" ON challenge_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Note: user_summary policies are managed by triggers, not direct admin access