-- Add skip_used column to challenge_progress table
ALTER TABLE challenge_progress
ADD COLUMN IF NOT EXISTS skip_used BOOLEAN DEFAULT FALSE;

-- Add comment to explain the column
COMMENT ON COLUMN challenge_progress.skip_used IS 'Indicates if the user used their one-time skip power-up on this challenge';
