-- Create function to completely delete a user and all their data

CREATE OR REPLACE FUNCTION public.delete_user_completely(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_progress INTEGER := 0;
  deleted_certificates INTEGER := 0;
  deleted_summary INTEGER := 0;
  deleted_profile INTEGER := 0;
  user_email TEXT;
BEGIN
  -- Get user email for logging
  SELECT email INTO user_email FROM public.profiles WHERE user_id = target_user_id;
  
  -- Delete challenge progress
  DELETE FROM public.challenge_progress 
  WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_progress = ROW_COUNT;
  
  -- Delete certificates
  DELETE FROM public.certificates 
  WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_certificates = ROW_COUNT;
  
  -- Delete user summary
  DELETE FROM public.user_summary 
  WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_summary = ROW_COUNT;
  
  -- Delete profile (this should cascade to auth.users via trigger)
  DELETE FROM public.profiles 
  WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_profile = ROW_COUNT;
  
  -- Note: We cannot directly delete from auth.users table as it's managed by Supabase Auth
  -- The profile deletion should trigger any necessary cleanup
  
  RETURN json_build_object(
    'success', true,
    'user_email', COALESCE(user_email, 'Unknown'),
    'deleted_records', json_build_object(
      'challenge_progress', deleted_progress,
      'certificates', deleted_certificates,
      'user_summary', deleted_summary,
      'profile', deleted_profile
    ),
    'message', 'User and all associated data deleted successfully'
  );
END;
$$;

-- Grant execute permissions to authenticated users (admins will be checked in the app)
GRANT EXECUTE ON FUNCTION public.delete_user_completely(UUID) TO authenticated;