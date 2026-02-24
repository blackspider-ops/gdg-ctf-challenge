-- Fix user creation to only happen after OTP verification
-- This migration removes automatic profile creation and only creates profiles for verified users

-- Drop the existing trigger that creates profiles immediately
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a new function that only creates profiles for verified users
CREATE OR REPLACE FUNCTION public.handle_verified_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create profile if the user's email is confirmed
  -- This happens when email_confirmed_at changes from NULL to a timestamp
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Check if profile already exists (avoid duplicates)
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
      INSERT INTO public.profiles (user_id, full_name, email, role)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'email', NEW.email, ''),
        'player'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create a new trigger that fires on UPDATE (when email is confirmed)
CREATE TRIGGER on_auth_user_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_verified_user();

-- Also create a function to handle users who are already verified when inserted
-- (in case they sign up with a provider that immediately verifies)
CREATE OR REPLACE FUNCTION public.handle_new_verified_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create profile if the user is already verified on insert
  IF NEW.email_confirmed_at IS NOT NULL THEN
    -- Check if profile already exists (avoid duplicates)
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
      INSERT INTO public.profiles (user_id, full_name, email, role)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'email', NEW.email, ''),
        'player'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for immediately verified users (OAuth, etc.)
CREATE TRIGGER on_auth_user_created_verified
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_verified_user();

-- Clean up any unverified users that might have profiles already
-- (This removes profiles for users who haven't verified their email)
-- First, clean up related data
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

-- Then delete the profiles
DELETE FROM public.profiles 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email_confirmed_at IS NULL
);