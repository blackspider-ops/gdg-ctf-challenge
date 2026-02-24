-- Check existing triggers
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Create trigger to automatically generate certificates when user completes challenges
CREATE OR REPLACE FUNCTION public.check_and_create_certificate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
      status
    )
    VALUES (
      NEW.user_id, 
      'champion', 
      NEW.challenges_solved, 
      total_challenges_count, 
      NEW.total_points, 
      NEW.total_time_seconds,
      'approved'  -- Auto-approve champion certificates
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
      status
    )
    VALUES (
      NEW.user_id, 
      'participation', 
      NEW.challenges_solved, 
      total_challenges_count, 
      NEW.total_points, 
      NEW.total_time_seconds,
      'approved'  -- Auto-approve participation certificates
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

-- Create trigger on user_summary updates
DROP TRIGGER IF EXISTS certificate_generation_trigger ON public.user_summary;
CREATE TRIGGER certificate_generation_trigger
  AFTER INSERT OR UPDATE ON public.user_summary
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_create_certificate();

-- Add unique constraint to prevent duplicate certificates per user per type
ALTER TABLE public.certificates 
ADD CONSTRAINT unique_user_certificate_type 
UNIQUE (user_id, type);