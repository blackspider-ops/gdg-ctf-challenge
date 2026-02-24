-- Fix security issues by updating all database functions to have proper search_path
CREATE OR REPLACE FUNCTION public.update_user_summary()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
  
  -- Calculate total points with time-based scoring
  SELECT COALESCE(SUM(
    public.calculate_challenge_points(
      c.points,
      COALESCE(cp.duration_seconds, 0),
      COALESCE(cp.incorrect_attempts, 0)
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'email', NEW.email, ''),
    'player'
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_challenge_points(base_points integer, duration_seconds integer, incorrect_attempts integer)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  points INTEGER := base_points;
  time_threshold INTEGER := 120; -- 2 minutes
  excess_minutes INTEGER;
  minimum_points INTEGER;
BEGIN
  -- Deduct points for incorrect attempts
  points := points - incorrect_attempts;
  
  -- Time-based deduction: lose 1 point per minute after 2 minutes
  IF duration_seconds > time_threshold THEN
    excess_minutes := FLOOR((duration_seconds - time_threshold) / 60);
    points := points - excess_minutes;
  END IF;
  
  -- Minimum points is 10% of base points
  minimum_points := FLOOR(base_points * 0.1);
  RETURN GREATEST(points, minimum_points);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_user_summary_for_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.request_certificate_if_eligible()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    -- Check if user completed all challenges (champion certificate)
    IF NEW.challenges_solved = (SELECT COUNT(*) FROM challenges WHERE is_active = true) THEN
        INSERT INTO certificates (user_id, type, challenges_solved, total_challenges, total_points, total_time_seconds)
        VALUES (NEW.user_id, 'champion', NEW.challenges_solved, NEW.challenges_solved, NEW.total_points, NEW.total_time_seconds)
        ON CONFLICT DO NOTHING;
    -- Check if user completed at least half the challenges (participation certificate)
    ELSIF NEW.challenges_solved >= (SELECT COUNT(*) FROM challenges WHERE is_active = true) / 2 THEN
        INSERT INTO certificates (user_id, type, challenges_solved, total_challenges, total_points, total_time_seconds)
        VALUES (NEW.user_id, 'participation', NEW.challenges_solved, (SELECT COUNT(*) FROM challenges WHERE is_active = true), NEW.total_points, NEW.total_time_seconds)
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_summary_on_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.create_user_summary_for_new_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;