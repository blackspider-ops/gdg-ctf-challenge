-- Create user_summary table triggers and fix RLS policies

-- First, enable RLS on user_summary (if not already enabled)
ALTER TABLE public.user_summary ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies on user_summary
DROP POLICY IF EXISTS "No direct deletes from user summary" ON public.user_summary;
DROP POLICY IF EXISTS "No direct inserts to user summary" ON public.user_summary;  
DROP POLICY IF EXISTS "No direct updates to user summary" ON public.user_summary;

-- Create new RLS policies for user_summary
CREATE POLICY "Anyone can read user summary for leaderboard" ON public.user_summary
  FOR SELECT USING (true);

CREATE POLICY "Only triggers can modify user summary" ON public.user_summary
  FOR ALL USING (false);

-- Create trigger function to update user_summary when challenge_progress changes
CREATE OR REPLACE FUNCTION public.update_user_summary_on_progress()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_record RECORD;
  next_challenge_index INTEGER;
  calculated_points INTEGER := 0;
BEGIN
  -- Get profile info
  SELECT full_name, email, role INTO profile_record
  FROM public.profiles 
  WHERE user_id = NEW.user_id;
  
  -- Calculate current challenge index (next unsolved challenge)
  SELECT COALESCE(MIN(c.order_index), 999) INTO next_challenge_index
  FROM public.challenges c
  WHERE c.is_active = true 
    AND c.id NOT IN (
      SELECT cp.challenge_id 
      FROM public.challenge_progress cp 
      WHERE cp.user_id = NEW.user_id AND cp.status = 'solved'
    );
  
  -- Calculate total points with penalty for incorrect attempts
  SELECT COALESCE(SUM(
    GREATEST(
      c.points - COALESCE(cp.incorrect_attempts, 0),
      FLOOR(c.points * 0.1)  -- minimum 10% of base points
    )
  ), 0) INTO calculated_points
  FROM public.challenge_progress cp
  JOIN public.challenges c ON c.id = cp.challenge_id
  WHERE cp.user_id = NEW.user_id 
    AND cp.status = 'solved' 
    AND c.is_active = true;
  
  -- Upsert user summary
  INSERT INTO public.user_summary (
    user_id, 
    full_name, 
    email, 
    role,
    current_challenge_index,
    challenges_solved,
    total_points,
    total_time_seconds,
    last_solve_at
  )
  SELECT 
    NEW.user_id,
    COALESCE(profile_record.full_name, ''),
    COALESCE(profile_record.email, ''),
    COALESCE(profile_record.role, 'player'),
    next_challenge_index,
    COUNT(*) FILTER (WHERE cp.status = 'solved'),
    calculated_points,
    COALESCE(SUM(cp.duration_seconds) FILTER (WHERE cp.status = 'solved'), 0),
    MAX(cp.solved_at) FILTER (WHERE cp.status = 'solved')
  FROM public.challenge_progress cp
  JOIN public.challenges c ON c.id = cp.challenge_id
  WHERE cp.user_id = NEW.user_id AND c.is_active = true
  GROUP BY NEW.user_id
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    current_challenge_index = EXCLUDED.current_challenge_index,
    challenges_solved = EXCLUDED.challenges_solved,
    total_points = EXCLUDED.total_points,
    total_time_seconds = EXCLUDED.total_time_seconds,
    last_solve_at = EXCLUDED.last_solve_at,
    updated_at = now();
    
  RETURN NEW;
END;
$$;

-- Create trigger function to create user_summary for new profiles
CREATE OR REPLACE FUNCTION public.create_user_summary_for_new_profile()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_summary (user_id, full_name, email, role, current_challenge_index)
  VALUES (NEW.user_id, NEW.full_name, NEW.email, NEW.role, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = NEW.full_name,
    email = NEW.email,
    role = NEW.role,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_user_summary_on_progress ON public.challenge_progress;
CREATE TRIGGER trigger_update_user_summary_on_progress
  AFTER INSERT OR UPDATE ON public.challenge_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_summary_on_progress();

DROP TRIGGER IF EXISTS trigger_create_user_summary_on_profile ON public.profiles;
CREATE TRIGGER trigger_create_user_summary_on_profile
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_summary_for_new_profile();

-- Enable realtime for user_summary table
ALTER TABLE public.user_summary REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.user_summary;