-- Nuclear option: Remove ALL triggers on auth.users and start completely fresh
-- This will stop ALL automatic profile creation

-- Get list of all triggers on auth.users table first (for debugging)
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name, event_manipulation, action_statement
        FROM information_schema.triggers 
        WHERE event_object_table = 'users' 
          AND event_object_schema = 'auth'
    LOOP
        RAISE NOTICE 'Found trigger: % on % - %', 
            trigger_record.trigger_name, 
            trigger_record.event_manipulation,
            trigger_record.action_statement;
    END LOOP;
END $$;

-- Drop ALL triggers on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_verified ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_insert_if_verified ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_email_verified ON auth.users;

-- Make ALL profile creation functions do nothing
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- DISABLED: This function no longer creates profiles automatically
  RAISE NOTICE 'handle_new_user called but disabled - user: %', NEW.email;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_verified_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- DISABLED: This function no longer creates profiles automatically
  RAISE NOTICE 'handle_verified_user called but disabled - user: %', NEW.email;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_verified_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- DISABLED: This function no longer creates profiles automatically
  RAISE NOTICE 'handle_new_verified_user called but disabled - user: %', NEW.email;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_verified_user_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- DISABLED: This function no longer creates profiles automatically
  RAISE NOTICE 'handle_verified_user_only called but disabled - user: %', NEW.email;
  RETURN NEW;
END;
$$;

-- Clean up ALL existing unverified profiles
DELETE FROM public.user_summary 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email_confirmed_at IS NULL
);

DELETE FROM public.challenge_progress 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email_confirmed_at IS NULL
);

DELETE FROM public.certificates 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email_confirmed_at IS NULL
);

DELETE FROM public.profiles 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email_confirmed_at IS NULL
);

-- Create a manual function to create profiles (we'll call this from the app)
CREATE OR REPLACE FUNCTION public.create_profile_after_verification(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Get user info from auth.users
  SELECT * INTO user_record FROM auth.users WHERE id = user_id;
  
  -- Only create profile if user exists and is verified
  IF user_record.id IS NOT NULL AND user_record.email_confirmed_at IS NOT NULL THEN
    -- Check if profile already exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = user_record.id) THEN
      INSERT INTO public.profiles (user_id, full_name, email, role)
      VALUES (
        user_record.id,
        COALESCE(user_record.raw_user_meta_data ->> 'full_name', ''),
        COALESCE(user_record.raw_user_meta_data ->> 'email', user_record.email, ''),
        'player'
      );
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_profile_after_verification(UUID) TO authenticated;

-- Show final state
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE event_object_table = 'users' 
      AND event_object_schema = 'auth';
    
    RAISE NOTICE 'Remaining triggers on auth.users: %', trigger_count;
END $$;