-- Fix security issues by setting search_path for functions
CREATE OR REPLACE FUNCTION public.check_and_create_certificate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_challenges_count INTEGER;
  eligible_for_champion BOOLEAN := false;
  eligible_for_participation BOOLEAN := false;
BEGIN
  -- Get total number of active challenges
  SELECT COUNT(*) INTO total_challenges_count 
  FROM public.challenges 
  WHERE is_active = true;

  -- Check if user is eligible for champion certificate (100% completion)
  IF NEW.challenges_solved >= total_challenges_count THEN
    eligible_for_champion := true;
  END IF;

  -- Check if user is eligible for participation certificate (50%+ completion)
  IF NEW.challenges_solved >= (total_challenges_count / 2) THEN
    eligible_for_participation := true;
  END IF;

  -- Create champion certificate if eligible and doesn't exist
  IF eligible_for_champion THEN
    INSERT INTO public.certificates (
      user_id, 
      type, 
      challenges_solved, 
      total_challenges, 
      total_points, 
      total_time_seconds,
      status,
      approved_at
    )
    VALUES (
      NEW.user_id, 
      'champion', 
      NEW.challenges_solved, 
      total_challenges_count, 
      NEW.total_points, 
      NEW.total_time_seconds,
      'approved',
      now()
    )
    ON CONFLICT (user_id, type) DO UPDATE SET
      challenges_solved = EXCLUDED.challenges_solved,
      total_challenges = EXCLUDED.total_challenges,
      total_points = EXCLUDED.total_points,
      total_time_seconds = EXCLUDED.total_time_seconds,
      approved_at = CASE 
        WHEN certificates.status = 'pending' THEN now() 
        ELSE certificates.approved_at 
      END,
      status = 'approved',
      updated_at = now();
  ELSIF eligible_for_participation THEN
    -- Create participation certificate if eligible and doesn't exist
    INSERT INTO public.certificates (
      user_id, 
      type, 
      challenges_solved, 
      total_challenges, 
      total_points, 
      total_time_seconds,
      status,
      approved_at
    )
    VALUES (
      NEW.user_id, 
      'participation', 
      NEW.challenges_solved, 
      total_challenges_count, 
      NEW.total_points, 
      NEW.total_time_seconds,
      'approved',
      now()
    )
    ON CONFLICT (user_id, type) DO UPDATE SET
      challenges_solved = EXCLUDED.challenges_solved,
      total_challenges = EXCLUDED.total_challenges,
      total_points = EXCLUDED.total_points,
      total_time_seconds = EXCLUDED.total_time_seconds,
      approved_at = CASE 
        WHEN certificates.status = 'pending' THEN now() 
        ELSE certificates.approved_at 
      END,
      status = 'approved',
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger certificate generation for existing users with progress
UPDATE public.user_summary SET updated_at = now() WHERE challenges_solved > 0;