-- Ensure user_summary table has all required columns
-- This migration will add missing columns if they don't exist

-- Add solved_count column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_summary' AND column_name = 'solved_count') THEN
        ALTER TABLE user_summary ADD COLUMN solved_count INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Add total_points column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_summary' AND column_name = 'total_points') THEN
        ALTER TABLE user_summary ADD COLUMN total_points INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Add total_time_seconds column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_summary' AND column_name = 'total_time_seconds') THEN
        ALTER TABLE user_summary ADD COLUMN total_time_seconds INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Add last_solve_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_summary' AND column_name = 'last_solve_at') THEN
        ALTER TABLE user_summary ADD COLUMN last_solve_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add current_challenge_index column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_summary' AND column_name = 'current_challenge_index') THEN
        ALTER TABLE user_summary ADD COLUMN current_challenge_index INTEGER DEFAULT 1;
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_summary' AND column_name = 'updated_at') THEN
        ALTER TABLE user_summary ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Recreate the update_user_summary function with progressive hint penalties and time penalties
CREATE OR REPLACE FUNCTION calculate_progressive_hint_penalty(hints_used INTEGER)
RETURNS INTEGER AS $$
DECLARE
  total_penalty INTEGER := 0;
  hint_cost INTEGER;
  i INTEGER;
BEGIN
  FOR i IN 1..hints_used LOOP
    hint_cost := LEAST(50, 5 + (i * 5));
    total_penalty := total_penalty + hint_cost;
  END LOOP;
  RETURN LEAST(total_penalty, 200);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_time_penalty(duration_seconds INTEGER)
RETURNS INTEGER AS $$
DECLARE
  grace_period INTEGER := 120;
  excess_time INTEGER;
BEGIN
  IF duration_seconds <= grace_period THEN
    RETURN 0;
  END IF;
  
  excess_time := duration_seconds - grace_period;
  RETURN LEAST(FLOOR(excess_time / 15), 100);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_summary()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recalculate user summary with progressive hint penalties and time penalties
  INSERT INTO user_summary (user_id, solved_count, total_points, total_time_seconds, last_solve_at, current_challenge_index)
  SELECT 
    NEW.user_id,
    COUNT(*) FILTER (WHERE cp.status = 'solved'),
    COALESCE(SUM(
      GREATEST(1, 
        c.points 
        - FLOOR(cp.incorrect_attempts / 2) 
        - calculate_progressive_hint_penalty(cp.hints_used)
        - calculate_time_penalty(cp.duration_seconds)
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