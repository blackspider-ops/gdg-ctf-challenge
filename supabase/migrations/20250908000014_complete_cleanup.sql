-- Complete cleanup of all profile creation mechanisms

-- Drop ALL triggers on auth.users table
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name
        FROM information_schema.triggers 
        WHERE event_object_table = 'users' 
          AND event_object_schema = 'auth'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', trigger_record.trigger_name);
        RAISE NOTICE 'Dropped trigger: %', trigger_record.trigger_name;
    END LOOP;
END $$;

-- Drop ALL triggers on profiles table
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name
        FROM information_schema.triggers 
        WHERE event_object_table = 'profiles' 
          AND event_object_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.profiles', trigger_record.trigger_name);
        RAISE NOTICE 'Dropped trigger: %', trigger_record.trigger_name;
    END LOOP;
END $$;

-- Disable ALL profile creation functions by making them do nothing
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_verified_user()
RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_verified_user()
RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_verified_user_only()
RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.block_automatic_profile_creation()
RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;

-- Clean up existing unverified profiles
DELETE FROM public.user_summary 
WHERE user_id IN (SELECT id FROM auth.users WHERE email_confirmed_at IS NULL);

DELETE FROM public.challenge_progress 
WHERE user_id IN (SELECT id FROM auth.users WHERE email_confirmed_at IS NULL);

DELETE FROM public.certificates 
WHERE user_id IN (SELECT id FROM auth.users WHERE email_confirmed_at IS NULL);

DELETE FROM public.profiles 
WHERE user_id IN (SELECT id FROM auth.users WHERE email_confirmed_at IS NULL);

-- Show final state
DO $$
DECLARE
    auth_trigger_count INTEGER;
    profiles_trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_trigger_count
    FROM information_schema.triggers 
    WHERE event_object_table = 'users' AND event_object_schema = 'auth';
    
    SELECT COUNT(*) INTO profiles_trigger_count
    FROM information_schema.triggers 
    WHERE event_object_table = 'profiles' AND event_object_schema = 'public';
    
    RAISE NOTICE 'Remaining triggers - auth.users: %, profiles: %', 
        auth_trigger_count, profiles_trigger_count;
END $$;