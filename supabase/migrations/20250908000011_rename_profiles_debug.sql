-- Temporarily rename profiles table to see what's trying to insert into it
-- This will cause errors that will show us exactly what's creating profiles

-- First, let's see what's currently in profiles for unverified users
SELECT 
  'Profiles for unverified users before rename:' as info,
  COUNT(*) as count
FROM public.profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE u.email_confirmed_at IS NULL;

-- Rename the profiles table temporarily
ALTER TABLE public.profiles RENAME TO profiles_backup;

-- Create a new profiles table that logs all insert attempts
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'player',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a function that logs insert attempts and prevents them
CREATE OR REPLACE FUNCTION public.log_profile_insert_attempt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  user_verified BOOLEAN;
BEGIN
  -- Check if user is verified
  SELECT (email_confirmed_at IS NOT NULL) INTO user_verified
  FROM auth.users 
  WHERE id = NEW.user_id;
  
  -- Log the attempt
  RAISE NOTICE 'PROFILE INSERT ATTEMPT: user_id=%, email=%, verified=%, full_name=%', 
    NEW.user_id, NEW.email, user_verified, NEW.full_name;
  
  -- Only allow if user is verified
  IF user_verified THEN
    RAISE NOTICE 'ALLOWING profile creation for verified user: %', NEW.email;
    RETURN NEW;
  ELSE
    RAISE NOTICE 'BLOCKING profile creation for unverified user: %', NEW.email;
    -- Block the insert by returning NULL
    RETURN NULL;
  END IF;
END;
$$;

-- Add trigger to log all insert attempts
CREATE TRIGGER log_profile_inserts
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_insert_attempt();

-- Enable RLS and copy policies from backup table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Copy basic policies (you may need to adjust these)
CREATE POLICY "Anyone can view profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins and owners can update any profile" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles_backup 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

RAISE NOTICE 'Profiles table renamed and logging enabled. Try creating a user now and check the logs.';