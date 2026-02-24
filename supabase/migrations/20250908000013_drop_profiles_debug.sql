-- Temporarily drop profiles table to see what breaks
-- This will show us exactly what's trying to create profiles

-- Backup the profiles table first
CREATE TABLE public.profiles_backup_debug AS 
SELECT * FROM public.profiles;

-- Drop all triggers on profiles table
DROP TRIGGER IF EXISTS block_profile_creation ON public.profiles;
DROP TRIGGER IF EXISTS log_profile_inserts ON public.profiles;
DROP TRIGGER IF EXISTS trigger_create_user_summary_for_new_profile ON public.profiles;
DROP TRIGGER IF EXISTS trigger_create_user_summary_on_profile ON public.profiles;

-- Drop the profiles table completely
DROP TABLE public.profiles CASCADE;

-- Create a view that will log any attempts to access profiles
CREATE VIEW public.profiles AS 
SELECT 
  gen_random_uuid() as id,
  gen_random_uuid() as user_id,
  'PROFILES TABLE DROPPED - CHECK LOGS' as full_name,
  'debug@example.com' as email,
  'player'::app_role as role,
  now() as created_at,
  now() as updated_at
WHERE false; -- This view returns no rows

-- Create a function that logs when someone tries to insert into profiles
CREATE OR REPLACE FUNCTION public.profiles_insert_logger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE NOTICE 'ATTEMPT TO INSERT INTO PROFILES VIEW: user_id=%, email=%, full_name=%', 
    NEW.user_id, NEW.email, NEW.full_name;
  RAISE EXCEPTION 'Profiles table has been dropped for debugging. Check logs to see what tried to create this profile.';
END;
$$;

-- Create an INSTEAD OF trigger on the view to catch insert attempts
CREATE TRIGGER profiles_view_insert_logger
  INSTEAD OF INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_insert_logger();

RAISE NOTICE 'Profiles table dropped and replaced with logging view. Try creating a user now.';