-- Create the functions that the existing triggers expect
-- This ensures the triggers work correctly without recreating them

-- Function for UPDATE trigger (when email is verified)
CREATE OR REPLACE FUNCTION public.handle_verified_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create profile if the user's email was just confirmed
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

-- Function for INSERT trigger (for already verified users)
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