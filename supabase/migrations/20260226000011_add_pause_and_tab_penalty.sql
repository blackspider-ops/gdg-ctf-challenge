-- Add pause tracking and tab switch penalty columns to challenge_progress
ALTER TABLE challenge_progress
ADD COLUMN IF NOT EXISTS pauses_used INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tab_switch_penalties INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN challenge_progress.pauses_used IS 'Number of personal pauses used (max 2 per challenge)';
COMMENT ON COLUMN challenge_progress.tab_switch_penalties IS 'Number of tab switches detected (5 points penalty each)';
COMMENT ON COLUMN challenge_progress.is_paused IS 'Whether the challenge is currently paused by the user';
COMMENT ON COLUMN challenge_progress.paused_at IS 'Timestamp when the challenge was paused';
