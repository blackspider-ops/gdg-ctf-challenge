-- Create function to update a user's role
CREATE OR REPLACE FUNCTION public.update_user_role(target_user_id uuid, new_role user_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the user's role in the profiles table
  UPDATE profiles 
  SET role = new_role, 
      updated_at = now()
  WHERE id = target_user_id;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

-- Grant execute permission to authenticated users (admin check will be in RLS)
GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, user_role) TO authenticated;
