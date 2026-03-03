-- Test if the is_admin() function works
SELECT is_admin() as am_i_admin;

-- Check current user's role
SELECT id, email, role FROM profiles WHERE id = auth.uid();

-- Try to update a challenge directly
UPDATE challenges 
SET title = 'Test Update' 
WHERE id = 1;

-- Check if the update worked
SELECT id, title FROM challenges WHERE id = 1;
