-- Check the event_settings table structure
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'event_settings';

-- Check what enum values are allowed for status
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%status%'
ORDER BY t.typname, e.enumsortorder;

-- Check current event_settings
SELECT * FROM event_settings WHERE id = 1;
