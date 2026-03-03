-- Check current user's admin status
SELECT 
  id,
  email,
  full_name,
  role,
  CASE 
    WHEN role IN ('admin', 'owner') THEN 'YES - You are an admin'
    ELSE 'NO - You are not an admin'
  END as admin_status
FROM profiles
WHERE email = auth.email();

-- If you need to make yourself admin, uncomment and run this:
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-email@psu.edu';

-- Check if is_admin() function exists and works
SELECT is_admin() as am_i_admin;
