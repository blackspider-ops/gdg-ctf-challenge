-- Make Tejas Singhal the owner
-- Run this in your Supabase SQL Editor

-- 1. Update Tejas to be the owner
UPDATE public.profiles 
SET role = 'owner', updated_at = NOW()
WHERE email = 'tms7397@psu.edu' 
  AND full_name = 'Tejas Singhal';

-- 2. Verify the change
SELECT 
  user_id,
  full_name,
  email,
  role,
  updated_at
FROM public.profiles 
WHERE email = 'tms7397@psu.edu';

-- 3. Show all users and their roles
SELECT 
  full_name,
  email,
  role
FROM public.profiles 
ORDER BY 
  CASE role 
    WHEN 'owner' THEN 1 
    WHEN 'admin' THEN 2 
    ELSE 3 
  END,
  full_name;