-- Create profiles for existing auth.users that don't have profiles yet
INSERT INTO public.profiles (id, full_name, email, role)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', 'User') as full_name,
  u.email,
  'player' as role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
