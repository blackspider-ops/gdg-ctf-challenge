-- Fix user deletion to handle re-login scenarios
-- Run this in your Supabase SQL Editor

-- 1. Update the delete function to also delete from auth.users using admin API
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
  target_user_role TEXT;
  current_user_role TEXT;
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
  
  -- Delete profile
  DELETE FROM public.profiles 
  WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_profile = ROW_COUNT;
  
  -- Try to delete from auth.users (this might fail due to RLS, but we'll try)
  BEGIN
    DELETE FROM auth.users WHERE id = target_user_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- If we can't delete from auth.users, that's okay
      -- The frontend will need to handle this via Supabase Admin API
      NULL;
  END;
  
  RETURN json_build_object(
    'success', true,
    'user_email', user_email,
    'auth_deletion_needed', true,
    'deleted_records', json_build_object(
      'challenge_progress', deleted_progress,
      'certificates', deleted_certificates,
      'user_summary', deleted_summary,
      'profile', deleted_profile
    ),
    'message', 'User data deleted successfully. Auth user deletion needed via admin API.'
  );
END;
$$;

-- 2. Create a function to handle orphaned auth users (users without profiles)
CREATE OR REPLACE FUNCTION public.handle_orphaned_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If a user logs in but has no profile, recreate their profile
  -- This handles the case where admin deleted their profile but they still have auth access
  
  -- Only trigger on UPDATE when email_confirmed_at changes (user logs in)
  IF TG_OP = 'UPDATE' AND OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Check if profile exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
      -- Recreate profile for this user
      INSERT INTO public.profiles (user_id, full_name, email, role)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Restored User'),
        COALESCE(NEW.raw_user_meta_data ->> 'email', NEW.email),
        'player'
      );
      
      -- Recreate user_summary
      INSERT INTO public.user_summary (user_id, solved_count, total_points, total_time_seconds, current_challenge_index)
      VALUES (NEW.id, 0, 0, 0, 1);
      
      -- Log this event
      RAISE NOTICE 'Recreated profile for orphaned user: %', NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Create trigger to handle orphaned users
DROP TRIGGER IF EXISTS handle_orphaned_auth_user_trigger ON auth.users;
CREATE TRIGGER handle_orphaned_auth_user_trigger
  AFTER UPDATE ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_orphaned_auth_user();

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION public.delete_user_completely(UUID) TO authenticated;

-- 5. Clean up any current orphaned users (auth users without profiles)
DO $$
DECLARE
  orphan_record RECORD;
  fixed_count INTEGER := 0;
BEGIN
  FOR orphan_record IN 
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.user_id
    WHERE u.email_confirmed_at IS NOT NULL 
      AND p.user_id IS NULL
  LOOP
    BEGIN
      -- Recreate profile for orphaned user
      INSERT INTO public.profiles (user_id, full_name, email, role)
      VALUES (
        orphan_record.id,
        COALESCE(orphan_record.raw_user_meta_data ->> 'full_name', 'Restored User'),
        COALESCE(orphan_record.raw_user_meta_data ->> 'email', orphan_record.email),
        'player'
      );
      
      -- Recreate user_summary
      INSERT INTO public.user_summary (user_id, solved_count, total_points, total_time_seconds, current_challenge_index)
      VALUES (orphan_record.id, 0, 0, 0, 1)
      ON CONFLICT (user_id) DO NOTHING;
      
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed orphaned user: %', orphan_record.email;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Failed to fix orphaned user %: %', orphan_record.email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Fixed % orphaned users', fixed_count;
END $$;

-- 6. Show current status
SELECT 
  'Auth users' as category,
  COUNT(*) as count
FROM auth.users
WHERE email_confirmed_at IS NOT NULL

UNION ALL

SELECT 
  'Profiles' as category,
  COUNT(*) as count
FROM public.profiles

UNION ALL

SELECT 
  'Orphaned auth users (no profile)' as category,
  COUNT(*) as count
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE u.email_confirmed_at IS NOT NULL AND p.user_id IS NULL;