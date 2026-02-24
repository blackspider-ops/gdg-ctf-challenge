-- Completely disable profile creation on user INSERT
-- Only allow profile creation when email is verified (UPDATE event)

-- Drop the INSERT trigger that creates profiles immediately
DROP TRIGGER IF EXISTS on_auth_user_created_verified ON auth.users;

-- Update the handle_new_verified_user function to do nothing
-- (in case it's called from somewhere else)
CREATE OR REPLACE FUNCTION public.handle_new_verified_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function is disabled - profiles should only be created after email verification
  -- All profile creation now happens in handle_verified_user() on UPDATE events
  RETURN NEW;
END;
$$;

-- Ensure the UPDATE trigger function works correctly
CREATE OR REPLACE FUNCTION public.handle_verified_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create profile if the user's email was just confirmed
  -- This checks that email_confirmed_at changed from NULL to a timestamp
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Double-check that profile doesn't already exist
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
      INSERT INTO public.profiles (user_id, full_name, email, role)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'email', NEW.email, ''),
        'player'
      );
      
      -- Log for debugging
      RAISE NOTICE 'Profile created for verified user: %', NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Clean up any profiles that were created for unverified users
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

-- Verify the current trigger setup
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE event_object_table = 'users' 
      AND event_object_schema = 'auth'
      AND trigger_name LIKE '%insert%' OR trigger_name LIKE '%created%';
    
    RAISE NOTICE 'Number of INSERT triggers on auth.users: %', trigger_count;
END $$;