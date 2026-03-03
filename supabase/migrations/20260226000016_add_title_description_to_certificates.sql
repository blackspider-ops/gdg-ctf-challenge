-- Add title and description columns to certificates table
ALTER TABLE public.certificates 
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS description text;

-- Update the type check to include 'special'
ALTER TABLE public.certificates 
DROP CONSTRAINT IF EXISTS certificates_type_check;

ALTER TABLE public.certificates 
ADD CONSTRAINT certificates_type_check 
CHECK (type IN ('champion', 'participation', 'special'));
