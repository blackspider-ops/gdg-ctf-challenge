-- Temporarily break the profiles table to catch the culprit
-- This will cause an error that shows us exactly where profile creation is happening

-- Rename the profiles table
ALTER TABLE public.profiles RENAME TO profiles_hidden;

-- Create a new profiles table that will cause errors on insert
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'player',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Add a constraint that will always fail
  CONSTRAINT profiles_creation_blocked CHECK (false)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add basic policies for reading (but inserts will fail due to the constraint)
CREATE POLICY "Anyone can view profiles" ON public.profiles
  FOR SELECT USING (true);

-- Create a function to restore the table later
CREATE OR REPLACE FUNCTION public.restore_profiles_table()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  DROP TABLE IF EXISTS public.profiles CASCADE;
  ALTER TABLE public.profiles_hidden RENAME TO profiles;
  RAISE NOTICE 'Profiles table restored';
END;
$$;

DO $$
BEGIN
  RAISE NOTICE 'Profiles table is now broken. Any attempt to insert will fail and show you the exact location in the code.';
END $$;