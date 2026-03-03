-- Create function to reset all progress for all users
CREATE OR REPLACE FUNCTION public.reset_all_progress()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete all challenge progress
  DELETE FROM challenge_progress WHERE true;
  
  -- Delete all user summaries
  DELETE FROM user_summary WHERE true;
  
  -- Delete all certificates
  DELETE FROM certificates WHERE true;
END;
$$;

-- Grant execute permission to authenticated users (admin check will be in RLS)
GRANT EXECUTE ON FUNCTION public.reset_all_progress() TO authenticated;
