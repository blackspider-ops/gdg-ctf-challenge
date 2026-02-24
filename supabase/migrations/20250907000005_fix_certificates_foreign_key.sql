-- Fix certificates table foreign key reference
-- The certificates table should reference profiles.id, but we need to ensure the column names match

-- First, let's check if we need to update the foreign key constraint
-- Drop the existing foreign key constraint if it exists
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_user_id_fkey;

-- Add the correct foreign key constraint
-- The profiles table uses 'id' as primary key, so user_id should reference profiles.id
ALTER TABLE certificates 
ADD CONSTRAINT certificates_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Also fix the issued_by foreign key if needed
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_issued_by_fkey;
ALTER TABLE certificates 
ADD CONSTRAINT certificates_issued_by_fkey 
FOREIGN KEY (issued_by) REFERENCES profiles(id) ON DELETE SET NULL;