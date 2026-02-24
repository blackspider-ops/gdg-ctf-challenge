-- Fix certificate type constraints
-- Run this in your Supabase SQL Editor

-- 1. Check what constraints exist on certificates table
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'certificates' 
  AND tc.table_schema = 'public';

-- 2. Drop the restrictive check constraint
ALTER TABLE public.certificates 
DROP CONSTRAINT IF EXISTS certificates_type_check;

-- 3. Drop the status constraint too if it exists
ALTER TABLE public.certificates 
DROP CONSTRAINT IF EXISTS certificates_status_check;

-- 4. Add more flexible constraints that match what the frontend expects
ALTER TABLE public.certificates 
ADD CONSTRAINT certificates_type_check 
CHECK (type IN ('champion', 'participation', 'special'));

ALTER TABLE public.certificates 
ADD CONSTRAINT certificates_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- 5. Test with valid certificate types
INSERT INTO public.certificates (
  user_id,
  type,
  title,
  status,
  challenges_solved,
  total_challenges,
  total_points,
  total_time_seconds,
  approved_at
) VALUES (
  '520c8071-c7c2-4d44-82ab-b852060ba799'::UUID,
  'participation',
  'Test Certificate',
  'approved',
  1,
  5,
  100,
  0,
  NOW()
) ON CONFLICT DO NOTHING;

-- 6. Test the queries that the frontend uses
-- This should work now
SELECT id 
FROM public.certificates 
WHERE user_id = '520c8071-c7c2-4d44-82ab-b852060ba799'::UUID 
  AND type = 'participation';

-- 7. Show all certificates
SELECT 
  id,
  user_id,
  type,
  title,
  status,
  created_at
FROM public.certificates
ORDER BY created_at DESC;

-- 8. Show the valid values for constraints
SELECT 
  'Valid certificate types' as info,
  'champion, participation, special' as values

UNION ALL

SELECT 
  'Valid certificate statuses' as info,
  'pending, approved, rejected' as values;