-- Create function to upsert challenge progress
CREATE OR REPLACE FUNCTION upsert_challenge_progress(
  p_user_id UUID,
  p_challenge_id INTEGER,
  p_status challenge_status,
  p_started_at TIMESTAMPTZ,
  p_attempts INTEGER,
  p_incorrect_attempts INTEGER,
  p_hints_used INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO challenge_progress (
    user_id,
    challenge_id,
    status,
    started_at,
    attempts,
    incorrect_attempts,
    hints_used
  )
  VALUES (
    p_user_id,
    p_challenge_id,
    p_status,
    p_started_at,
    p_attempts,
    p_incorrect_attempts,
    p_hints_used
  )
  ON CONFLICT (user_id, challenge_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    started_at = COALESCE(challenge_progress.started_at, EXCLUDED.started_at),
    attempts = EXCLUDED.attempts,
    incorrect_attempts = EXCLUDED.incorrect_attempts,
    hints_used = EXCLUDED.hints_used,
    updated_at = NOW();
END;
$$;
