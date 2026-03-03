-- Add 'owner' to the user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner';

-- Verify the enum values
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;
