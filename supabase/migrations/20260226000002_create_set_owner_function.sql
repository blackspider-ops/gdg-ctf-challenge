-- Create function to set owner by email
CREATE OR REPLACE FUNCTION set_owner_by_email(owner_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can set owner';
  END IF;

  -- Find user by email
  SELECT id INTO target_user_id
  FROM profiles
  WHERE email = owner_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', owner_email;
  END IF;

  -- Update user role to owner
  UPDATE profiles
  SET role = 'owner'
  WHERE id = target_user_id;

  RETURN 'Successfully set ' || owner_email || ' as owner';
END;
$$;
