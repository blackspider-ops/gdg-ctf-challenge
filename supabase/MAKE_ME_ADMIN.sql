-- Make the current logged-in user an admin
-- Run this in Supabase SQL Editor while logged in to the app

UPDATE profiles 
SET role = 'admin' 
WHERE id = auth.uid();

-- Verify it worked
SELECT 
  id,
  email,
  full_name,
  role,
  is_admin() as admin_check
FROM profiles
WHERE id = auth.uid();
