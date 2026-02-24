-- Fix point calculation in user_summary update function
-- Replace incorrect || operator with COALESCE

CREATE OR REPLACE FUNCTION update_user_summary()
RETURNS TRIGGER AS $
BEGIN
  -- Recalculate user summary
  INSERT INTO user_summary (user_id, solved_count, total_points, total_time_seconds, last_solve_at, current_challenge_index)
  SELECT 
    NEW.user_id,
    COUNT(*) FILTER (WHERE cp.status = 'solved'),
    COALESCE(SUM(
      GREATEST(1, c.points - 
        FLOOR(COALESCE(cp.incorrect_attempts, 0) / 2) - -- Incorrect attempt penalty
        CASE 
          WHEN COALESCE(cp.hints_used, 0) > 0 THEN 
            LEAST(200, (cp.hints_used * (cp.hints_used + 1) * 5 / 2)) -- Progressive hint penalty
          ELSE 0 
        END -
        CASE 
          WHEN COALESCE(cp.duration_seconds, 0) > 120 THEN 
            LEAST(100, FLOOR((cp.duration_seconds - 120) / 45)) -- Time penalty after 2 minutes
          ELSE 0 
        END
      )
    ) FILTER (WHERE cp.status = 'solved'), 0),
    COALESCE(SUM(cp.duration_seconds) FILTER (WHERE cp.status = 'solved'), 0),
    MAX(cp.solved_at) FILTER (WHERE cp.status = 'solved'),
    get_current_challenge_index(NEW.user_id)
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
$ LANGUAGE plpgsql;