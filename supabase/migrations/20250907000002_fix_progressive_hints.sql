-- Fix progressive hint penalty calculation to work globally across all challenges

-- Function to calculate progressive hint penalty based on global hint order
CREATE OR REPLACE FUNCTION calculate_global_progressive_hint_penalty(user_id_param UUID, challenge_id_param BIGINT, hints_used_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
  total_penalty INTEGER := 0;
  hint_cost INTEGER;
  global_hint_number INTEGER := 1;
  challenge_hints INTEGER;
  i INTEGER;
BEGIN
  -- Get total hints used across all challenges before this challenge (ordered by started_at)
  SELECT COALESCE(SUM(cp.hints_used), 0) INTO global_hint_number
  FROM challenge_progress cp
  JOIN challenges c ON c.id = cp.challenge_id
  WHERE cp.user_id = user_id_param 
    AND cp.started_at < (
      SELECT started_at 
      FROM challenge_progress 
      WHERE user_id = user_id_param AND challenge_id = challenge_id_param
    )
    AND c.is_active = TRUE;
  
  -- Add 1 to start from the next hint number
  global_hint_number := global_hint_number + 1;
  
  -- Calculate penalty for this challenge's hints
  FOR i IN 1..hints_used_param LOOP
    hint_cost := LEAST(50, 5 + (global_hint_number * 5));
    total_penalty := total_penalty + hint_cost;
    global_hint_number := global_hint_number + 1;
  END LOOP;
  
  RETURN total_penalty;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate time penalty
CREATE OR REPLACE FUNCTION calculate_time_penalty(duration_seconds INTEGER)
RETURNS INTEGER AS $$
DECLARE
  grace_period INTEGER := 120;
  excess_time INTEGER;
BEGIN
  IF duration_seconds IS NULL OR duration_seconds <= grace_period THEN
    RETURN 0;
  END IF;
  
  excess_time := duration_seconds - grace_period;
  RETURN LEAST(FLOOR(excess_time / 15), 100);
END;
$$ LANGUAGE plpgsql;

-- Update the user_summary function to use global progressive hints
CREATE OR REPLACE FUNCTION update_user_summary()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recalculate user summary with global progressive hint penalties and time penalties
  INSERT INTO user_summary (user_id, solved_count, total_points, total_time_seconds, last_solve_at, current_challenge_index)
  SELECT 
    NEW.user_id,
    COUNT(*) FILTER (WHERE cp.status = 'solved'),
    COALESCE(SUM(
      GREATEST(1, 
        c.points 
        - FLOOR(cp.incorrect_attempts / 2) 
        - calculate_global_progressive_hint_penalty(NEW.user_id, cp.challenge_id, cp.hints_used)
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