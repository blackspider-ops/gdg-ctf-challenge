-- Force fix user creation timing - comprehensive cleanup
-- This migration ensures ALL automatic profile creation triggers are removed

-- Drop ALL possible triggers that might create profiles automatically
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trigger_create_user_summary_on_profile ON public.profiles;
DROP TRIGGER IF EXISTS trigger_create_user_summary_for_new_profile ON public.profiles;

-- Also drop the new triggers from the previous migration to start fresh
DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_verified ON auth.users;

-- Create a completely new function that ONLY creates profiles for verified users
CREATE OR REPLACE FUNCTION public.handle_verified_user_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For UPDATE events: only create profile if email was just confirmed
  IF TG_OP = 'UPDATE' THEN
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
  END IF;
  
  -- For INSERT events: only create profile if user is already verified
  IF TG_OP = 'INSERT' THEN
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
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create the verification-based triggers
CREATE TRIGGER on_auth_user_email_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_verified_user_only();

CREATE TRIGGER on_auth_user_insert_if_verified
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_verified_user_only();

-- Clean up ALL unverified users and their data (more comprehensive)
DO $$
DECLARE
    unverified_user_ids UUID[];
BEGIN
    -- Get all unverified user IDs
    SELECT ARRAY(
        SELECT id FROM auth.users 
        WHERE email_confirmed_at IS NULL
    ) INTO unverified_user_ids;
    
    -- Delete related data for unverified users
    DELETE FROM public.certificates 
    WHERE user_id = ANY(unverified_user_ids);
    
    DELETE FROM public.challenge_progress 
    WHERE user_id = ANY(unverified_user_ids);
    
    DELETE FROM public.user_summary 
    WHERE user_id = ANY(unverified_user_ids);
    
    -- Delete profiles for unverified users
    DELETE FROM public.profiles 
    WHERE user_id = ANY(unverified_user_ids);
    
    RAISE NOTICE 'Cleaned up % unverified users', array_length(unverified_user_ids, 1);
END $$;

-- Disable the old handle_new_user function by making it do nothing
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function is disabled - profiles are now created only after email verification
  -- See handle_verified_user_only() function instead
  RETURN NEW;
END;
$$;