-- Create admin functions for resetting user progress

-- Function to reset a specific user's progress
CREATE OR REPLACE FUNCTION public.reset_user_progress(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete all challenge progress for the user
  DELETE FROM public.challenge_progress 
  WHERE user_id = target_user_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Reset user summary
  UPDATE public.user_summary 
  SET 
    current_challenge_index = 1,
    challenges_solved = 0,
    total_points = 0,
    total_time_seconds = 0,
    last_solve_at = NULL,
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  RETURN json_build_object(
    'success', true,
    'deleted_records', deleted_count,
    'message', 'User progress reset successfully'
  );
END;
$$;

-- Function to reset all users' progress
CREATE OR REPLACE FUNCTION public.reset_all_progress()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete all challenge progress
  DELETE FROM public.challenge_progress;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Reset all user summaries
  UPDATE public.user_summary 
  SET 
    current_challenge_index = 1,
    challenges_solved = 0,
    total_points = 0,
    total_time_seconds = 0,
    last_solve_at = NULL,
    updated_at = NOW();
  
  RETURN json_build_object(
    'success', true,
    'deleted_records', deleted_count,
    'message', 'All user progress reset successfully'
  );
END;
$$;

-- Grant execute permissions to authenticated users (admins will be checked in the app)
GRANT EXECUTE ON FUNCTION public.reset_user_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_all_progress() TO authenticated;