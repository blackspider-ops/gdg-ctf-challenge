-- Add hints_used column to challenge_progress table
ALTER TABLE challenge_progress 
ADD COLUMN IF NOT EXISTS hints_used INTEGER DEFAULT 0 NOT NULL;

-- Update existing rows to have hints_used = 0
UPDATE challenge_progress 
SET hints_used = 0 
WHERE hints_used IS NULL;
