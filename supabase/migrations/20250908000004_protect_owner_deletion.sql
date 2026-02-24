-- Protect owner from deletion by other admins
-- This migration updates the delete function to prevent owner deletion

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
  target_user_role app_role;
  current_user_role app_role;
BEGIN
  -- Get target user info
  SELECT email, role INTO user_email, target_user_role 
  FROM public.profiles 
  WHERE user_id = target_user_id;
  
  -- Get current user's role
  SELECT role INTO current_user_role 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- Check if target user exists
  IF user_email IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found',
      'message', 'The specified user does not exist'
    );
  END IF;
  
  -- Prevent deletion of owner by non-owners
  IF target_user_role = 'owner' AND current_user_role != 'owner' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Permission denied',
      'message', 'Only the owner can delete the owner account'
    );
  END IF;
  
  -- Prevent non-admins from deleting anyone
  IF current_user_role NOT IN ('admin', 'owner') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Permission denied', 
      'message', 'Only admins and owners can delete users'
    );
  END IF;
  
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
    'user_email', user_email,
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