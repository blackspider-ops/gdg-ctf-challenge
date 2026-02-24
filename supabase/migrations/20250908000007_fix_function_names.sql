-- Fix function names to match the triggers
-- The triggers are calling handle_verified_user() and handle_new_verified_user()
-- but the latest migration created handle_verified_user_only()

-- Drop the existing triggers
DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_verified ON auth.users;

-- Recreate triggers with the correct function name
CREATE TRIGGER on_auth_user_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_verified_user_only();

CREATE TRIGGER on_auth_user_created_verified
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_verified_user_only();