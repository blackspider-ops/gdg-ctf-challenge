-- Create function to reset progress for a specific user
CREATE OR REPLACE FUNCTION public.reset_user_progress(target_user_id uuid)
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
END;
$$;

-- Grant execute permission to authenticated users (admin check will be in RLS)
GRANT EXECUTE ON FUNCTION public.reset_user_progress(uuid) TO authenticated;
