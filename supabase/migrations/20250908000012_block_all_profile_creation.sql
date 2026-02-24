-- Block ALL profile creation except through our controlled function
-- This will prevent any automatic profile creation from any source

-- Create a function that blocks all profile inserts except when explicitly allowed
CREATE OR REPLACE FUNCTION public.block_automatic_profile_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_verified BOOLEAN := FALSE;
  allow_insert BOOLEAN := FALSE;
BEGIN
  -- Check if this insert is coming from our controlled function
  -- We'll use a session variable to allow inserts from our function
  BEGIN
    allow_insert := current_setting('app.allow_profile_insert', true)::boolean;
  EXCEPTION WHEN OTHERS THEN
    allow_insert := FALSE;
  END;
  
  -- Check if user is verified
  SELECT (email_confirmed_at IS NOT NULL) INTO user_verified
  FROM auth.users 
  WHERE id = NEW.user_id;
  
  -- Log the attempt for debugging
  RAISE NOTICE 'Profile insert attempt: user=%, verified=%, allowed=%, email=%', 
    NEW.user_id, user_verified, allow_insert, NEW.email;
  
  -- Only allow if explicitly permitted AND user is verified
  IF allow_insert AND user_verified THEN
    RAISE NOTICE 'ALLOWING profile creation for: %', NEW.email;
    RETURN NEW;
  ELSE
    RAISE NOTICE 'BLOCKING profile creation for: % (verified=%, allowed=%)', 
      NEW.email, user_verified, allow_insert;
    -- Block the insert
    RAISE EXCEPTION 'Profile creation blocked. User must be verified and insert must be explicitly allowed.';
  END IF;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS block_profile_creation ON public.profiles;

-- Add the blocking trigger as the FIRST trigger (highest priority)
CREATE TRIGGER block_profile_creation
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.block_automatic_profile_creation();

-- Update our controlled profile creation function to set the permission flag
CREATE OR REPLACE FUNCTION public.create_profile_after_verification(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  result BOOLEAN := FALSE;
BEGIN
  -- Get user info from auth.users
  SELECT * INTO user_record FROM auth.users WHERE id = user_id;
  
  -- Only create profile if user exists and is verified
  IF user_record.id IS NOT NULL AND user_record.email_confirmed_at IS NOT NULL THEN
    -- Check if profile already exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = user_record.id) THEN
      
      -- Set the permission flag to allow this insert
      PERFORM set_config('app.allow_profile_insert', 'true', true);
      
      BEGIN
        INSERT INTO public.profiles (user_id, full_name, email, role)
        VALUES (
          user_record.id,
          COALESCE(user_record.raw_user_meta_data ->> 'full_name', ''),
          COALESCE(user_record.raw_user_meta_data ->> 'email', user_record.email, ''),
          'player'
        );
        result := TRUE;
        RAISE NOTICE 'Successfully created profile for: %', user_record.email;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create profile for %: %', user_record.email, SQLERRM;
        result := FALSE;
      END;
      
      -- Clear the permission flag
      PERFORM set_config('app.allow_profile_insert', 'false', true);
    ELSE
      RAISE NOTICE 'Profile already exists for: %', user_record.email;
      result := TRUE;
    END IF;
  ELSE
    RAISE NOTICE 'Cannot create profile - user not found or not verified: %', user_id;
  END IF;
  
  RETURN result;
END;
$$;

-- Clean up existing unverified profiles one more time
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

-- Use DO block for the notice
DO $$
BEGIN
  RAISE NOTICE 'Profile creation is now completely blocked except through create_profile_after_verification function';
END $$;