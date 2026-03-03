-- Drop all existing policies on user_summary
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_summary') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_summary';
    END LOOP;
END $$;

-- Allow anyone to read user_summary (for leaderboard)
CREATE POLICY "Anyone can read user summary" ON user_summary
  FOR SELECT
  USING (TRUE);

-- Allow the trigger function to insert/update user_summary
-- This is done by making the trigger function SECURITY DEFINER
-- But we also need to allow the authenticated user's own summary to be updated

-- Allow users to insert their own summary (via trigger)
CREATE POLICY "Users can insert own summary" ON user_summary
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own summary (via trigger)
CREATE POLICY "Users can update own summary" ON user_summary
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow admins to do everything
CREATE POLICY "Admins can manage all summaries" ON user_summary
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Make the trigger functions SECURITY DEFINER so they can bypass RLS
DROP FUNCTION IF EXISTS update_user_summary() CASCADE;
CREATE OR REPLACE FUNCTION update_user_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recalculate user summary
  INSERT INTO user_summary (user_id, solved_count, total_points, total_time_seconds, last_solve_at, current_challenge_index)
  SELECT 
    NEW.user_id,
    COUNT(*) FILTER (WHERE status = 'solved') as solved_count,
    COALESCE(SUM(
      CASE 
        WHEN cp.status = 'solved' THEN 
          GREATEST(1, c.points - 
            FLOOR((cp.incorrect_attempts) / 2) - 
            LEAST(200, (cp.hints_used * (cp.hints_used + 1) * 5 / 2)) -
            CASE WHEN cp.duration_seconds > 120 THEN LEAST(100, FLOOR((cp.duration_seconds - 120) / 45)) ELSE 0 END
          )
        ELSE 0 
      END
    ), 0) as total_points,
    COALESCE(SUM(duration_seconds) FILTER (WHERE status = 'solved'), 0) as total_time_seconds,
    MAX(solved_at) FILTER (WHERE status = 'solved') as last_solve_at,
    CASE 
      WHEN COUNT(*) FILTER (WHERE status = 'solved') = (SELECT COUNT(*) FROM challenges WHERE is_active = true) 
      THEN -1
      ELSE COALESCE((
        SELECT MIN(c2.order_index)
        FROM challenges c2
        WHERE c2.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM challenge_progress cp2 
          WHERE cp2.user_id = NEW.user_id 
          AND cp2.challenge_id = c2.id 
          AND cp2.status = 'solved'
        )
      ), 1)
    END as current_challenge_index
  FROM challenge_progress cp
  JOIN challenges c ON cp.challenge_id = c.id
  WHERE cp.user_id = NEW.user_id
  GROUP BY cp.user_id
  ON CONFLICT (user_id) 
  DO UPDATE SET
    solved_count = EXCLUDED.solved_count,
    total_points = EXCLUDED.total_points,
    total_time_seconds = EXCLUDED.total_time_seconds,
    last_solve_at = EXCLUDED.last_solve_at,
    current_challenge_index = EXCLUDED.current_challenge_index;
    
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_update_user_summary ON challenge_progress;
CREATE TRIGGER trigger_update_user_summary
  AFTER INSERT OR UPDATE ON challenge_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_user_summary();

-- Also make create_user_summary SECURITY DEFINER
DROP FUNCTION IF EXISTS create_user_summary() CASCADE;
CREATE OR REPLACE FUNCTION create_user_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_summary (user_id, current_challenge_index)
  VALUES (NEW.id, 1)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_create_user_summary ON profiles;
CREATE TRIGGER trigger_create_user_summary
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_summary();
