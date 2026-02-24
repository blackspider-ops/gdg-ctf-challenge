-- Update time penalty from 15 seconds to 45 seconds
-- This migration updates the user summary calculation to use 45-second intervals instead of 15

-- Update the user summary update function with new 45-second penalty
CREATE OR REPLACE FUNCTION update_user_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate user summary
  INSERT INTO user_summary (user_id, solved_count, total_points, total_time_seconds, last_solve_at, current_challenge_index)
  SELECT 
    NEW.user_id,
    COUNT(*) FILTER (WHERE cp.status = 'solved'),
    COALESCE(SUM(
      GREATEST(1, c.points - 
        FLOOR((cp.incorrect_attempts || 0) / 2) - -- Incorrect attempt penalty
        CASE 
          WHEN cp.hints_used > 0 THEN 
            LEAST(200, (cp.hints_used * (cp.hints_used + 1) * 5 / 2)) -- Progressive hint penalty
          ELSE 0 
        END -
        CASE 
          WHEN cp.duration_seconds > 120 THEN 
            LEAST(100, FLOOR((cp.duration_seconds - 120) / 45)) -- Time penalty after 2 minutes (45 second intervals)
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
$$ LANGUAGE plpgsql;

-- Recalculate all existing user summaries with the new penalty structure
-- This ensures existing data reflects the new 45-second penalty
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT user_id FROM challenge_progress
  LOOP
    -- Trigger the update for each user
    INSERT INTO user_summary (user_id, solved_count, total_points, total_time_seconds, last_solve_at, current_challenge_index)
    SELECT 
      user_record.user_id,
      COUNT(*) FILTER (WHERE cp.status = 'solved'),
      COALESCE(SUM(
        GREATEST(1, c.points - 
          FLOOR((cp.incorrect_attempts || 0) / 2) - -- Incorrect attempt penalty
          CASE 
            WHEN cp.hints_used > 0 THEN 
              LEAST(200, (cp.hints_used * (cp.hints_used + 1) * 5 / 2)) -- Progressive hint penalty
            ELSE 0 
          END -
          CASE 
            WHEN cp.duration_seconds > 120 THEN 
              LEAST(100, FLOOR((cp.duration_seconds - 120) / 45)) -- Time penalty after 2 minutes (45 second intervals)
            ELSE 0 
          END
        )
      ) FILTER (WHERE cp.status = 'solved'), 0),
      COALESCE(SUM(cp.duration_seconds) FILTER (WHERE cp.status = 'solved'), 0),
      MAX(cp.solved_at) FILTER (WHERE cp.status = 'solved'),
      get_current_challenge_index(user_record.user_id)
    FROM challenge_progress cp
    JOIN challenges c ON c.id = cp.challenge_id
    WHERE cp.user_id = user_record.user_id AND c.is_active = TRUE
    GROUP BY user_record.user_id
    ON CONFLICT (user_id) DO UPDATE SET
      solved_count = EXCLUDED.solved_count,
      total_points = EXCLUDED.total_points,
      total_time_seconds = EXCLUDED.total_time_seconds,
      last_solve_at = EXCLUDED.last_solve_at,
      current_challenge_index = EXCLUDED.current_challenge_index,
      updated_at = NOW();
  END LOOP;
END $$;