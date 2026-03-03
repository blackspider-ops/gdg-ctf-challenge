-- Make user with email tms7397@psu.edu an admin
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'tms7397@psu.edu';

-- Verify
SELECT id, email, full_name, role 
FROM profiles 
WHERE email = 'tms7397@psu.edu';
