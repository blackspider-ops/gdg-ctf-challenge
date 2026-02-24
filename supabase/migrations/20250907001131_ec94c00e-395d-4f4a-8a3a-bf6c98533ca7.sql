-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger to create user summary when profile is created
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_user_summary_for_new_profile();

-- Create trigger to update user summary when challenge progress changes
CREATE TRIGGER on_challenge_progress_change
  AFTER INSERT OR UPDATE ON public.challenge_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_user_summary_on_progress();

-- Create trigger to check for certificate eligibility
CREATE TRIGGER on_user_summary_update
  AFTER UPDATE ON public.user_summary
  FOR EACH ROW EXECUTE FUNCTION public.check_and_create_certificate();