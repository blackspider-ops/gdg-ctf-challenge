-- Set tms7397 as the initial owner
-- This should be run after the user has signed up and the previous migrations are applied

-- Function to safely set the initial owner by email
CREATE OR REPLACE FUNCTION set_owner_by_email(owner_email TEXT)
RETURNS TEXT AS $$
DECLARE
  target_user_id UUID;
  current_owner_count INTEGER;
BEGIN
  -- Check if an owner already exists
  SELECT COUNT(*) INTO current_owner_count 
  FROM profiles 
  WHERE role = 'owner';
  
  IF current_owner_count > 0 THEN
    RETURN 'Owner already exists. Cannot set new owner.';
  END IF;
  
  -- Find user by email
  SELECT user_id INTO target_user_id 
  FROM profiles 
  WHERE email = owner_email;
  
  IF target_user_id IS NULL THEN
    RETURN 'User with email ' || owner_email || ' not found.';
  END IF;
  
  -- Set as owner
  UPDATE profiles 
  SET role = 'owner' 
  WHERE user_id = target_user_id;
  
  RETURN 'Successfully set ' || owner_email || ' as owner.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_owner_by_email(TEXT) TO authenticated;

-- Uncomment and run the following line after tms7397 has signed up:
-- SELECT set_owner_by_email('tms7397@psu.edu');

-- Or if using a different email format:
-- SELECT set_owner_by_email('tejas@psu.edu');