-- Create function to delete a user completely (all data + auth account)
CREATE OR REPLACE FUNCTION public.delete_user_completely(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete challenge progress for the user
  DELETE FROM challenge_progress WHERE user_id = target_user_id;
  
  -- Delete user summary for the user
  DELETE FROM user_summary WHERE user_id = target_user_id;
  
  -- Delete certificates for the user
  DELETE FROM certificates WHERE user_id = target_user_id;
  
  -- Delete profile
  DELETE FROM profiles WHERE id = target_user_id;
  
  -- Delete from auth.users (this will cascade delete everything)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Grant execute permission to authenticated users (admin check will be in RLS)
GRANT EXECUTE ON FUNCTION public.delete_user_completely(uuid) TO authenticated;
