-- Add hints_used column to challenge_progress table
ALTER TABLE challenge_progress 
ADD COLUMN hints_used INTEGER NOT NULL DEFAULT 0;

-- Update the user_summary calculation function to account for hint penalties
CREATE OR REPLACE FUNCTION update_user_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate user summary with hint penalties
  INSERT INTO user_summary (user_id, solved_count, total_points, total_time_seconds, last_solve_at, current_challenge_index)
  SELECT 
    NEW.user_id,
    COUNT(*) FILTER (WHERE cp.status = 'solved'),
    COALESCE(SUM(
      GREATEST(1, 
        c.points 
        - FLOOR(cp.incorrect_attempts / 2) 
        - LEAST(25, cp.hints_used * 5)
      )
    ) FILTER (WHERE cp.status = 'solved'), 0),
    COALESCE(SUM(cp.duration_seconds) FILTER (WHERE cp.status = 'solved'), 0),
    MAX(cp.solved_at) FILTER (WHERE cp.status = 'solved'),
    COALESCE(MIN(c.order_index) FILTER (WHERE cp.status != 'solved'), 
             (SELECT MAX(order_index) + 1 FROM challenges WHERE is_active = TRUE))
  FROM challenge_progress cp
  JOIN challenges c ON c.id = cp.challenge_id
  WHERE cp.user_id = NEW.user_id AND c.is_active = TRUE
  GROUP BY NEW.user_id
  ON CONFLICT (user_id) DO UPDATE SET
    solved_count = EXCLUDED.solved_count,
    total_points = EXCLUDED.total_points,
    total_time_seconds = EXCLUDED.total_time_seconds,
    last_solve_at = EXCLUDED.last_solve_at,
    current_challenge_index = EXCLUDED.current_challenge_index,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;