-- Admin improvements migration
-- This migration adds event status control, certificates table, and improves admin functionality

-- First, let's update the event_settings table to use a key-value structure for better flexibility
DROP TABLE IF EXISTS event_settings CASCADE;

CREATE TABLE event_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default event settings
INSERT INTO event_settings (key, value, description) VALUES
  ('event_status', 'not_started', 'Current status of the competition event'),
  ('event_title', 'Decrypt Night — Devs@PSU', 'Title of the event'),
  ('event_datetime', '2025-01-15T18:00:00Z', 'Date and time of the event'),
  ('event_location', 'Innovation Hub, PSU', 'Location of the event'),
  ('allow_play_access', 'true', 'Whether users can access the play page'),
  ('allow_new_entries', 'true', 'Whether new challenge entries are allowed'),
  ('pause_timers', 'false', 'Whether challenge timers should be paused');

-- Create certificates table for admin-managed certificates
CREATE TABLE certificates (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('champion', 'participation', 'special')),
  title TEXT NOT NULL,
  description TEXT,
  certificate_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  challenges_solved INTEGER NOT NULL DEFAULT 0,
  total_challenges INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_time_seconds INTEGER NOT NULL DEFAULT 0,
  issued_by UUID REFERENCES profiles(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add hints_used column to challenge_progress if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'challenge_progress' AND column_name = 'hints_used') THEN
    ALTER TABLE challenge_progress ADD COLUMN hints_used INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Update user_summary table to fix the challenge display issue
ALTER TABLE user_summary 
DROP COLUMN IF EXISTS current_challenge_index,
ADD COLUMN current_challenge_index INTEGER DEFAULT 1;

-- Function to get current challenge index properly
CREATE OR REPLACE FUNCTION get_current_challenge_index(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  solved_challenges INTEGER;
  total_challenges INTEGER;
  next_challenge_index INTEGER;
BEGIN
  -- Count solved challenges
  SELECT COUNT(*) INTO solved_challenges
  FROM challenge_progress cp
  JOIN challenges c ON c.id = cp.challenge_id
  WHERE cp.user_id = user_uuid 
    AND cp.status = 'solved' 
    AND c.is_active = TRUE;
  
  -- Count total active challenges
  SELECT COUNT(*) INTO total_challenges
  FROM challenges
  WHERE is_active = TRUE;
  
  -- If all challenges are solved, return a completion indicator
  IF solved_challenges >= total_challenges THEN
    RETURN -1; -- Special value indicating completion
  END IF;
  
  -- Find the next unsolved challenge
  SELECT MIN(c.order_index) INTO next_challenge_index
  FROM challenges c
  WHERE c.is_active = TRUE
    AND c.id NOT IN (
      SELECT cp.challenge_id 
      FROM challenge_progress cp 
      WHERE cp.user_id = user_uuid AND cp.status = 'solved'
    );
  
  RETURN COALESCE(next_challenge_index, 1);
END;
$$ LANGUAGE plpgsql;

-- Update the user summary update function
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
$$ LANGUAGE plpgsql;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_event_settings_key ON event_settings(key);

-- RLS policies for new tables
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_settings ENABLE ROW LEVEL SECURITY;

-- Certificates policies
CREATE POLICY "Users can view their own certificates" ON certificates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all certificates" ON certificates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Event settings policies (public read, admin write)
CREATE POLICY "Anyone can read event settings" ON event_settings
  FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage event settings" ON event_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add update trigger for timestamps
CREATE TRIGGER trigger_certificates_updated_at 
  BEFORE UPDATE ON certificates 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_event_settings_updated_at 
  BEFORE UPDATE ON event_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at();

-- Function to check if event allows play access
CREATE OR REPLACE FUNCTION can_access_play()
RETURNS BOOLEAN AS $$
DECLARE
  event_status TEXT;
  allow_access TEXT;
BEGIN
  SELECT value INTO event_status FROM event_settings WHERE key = 'event_status';
  SELECT value INTO allow_access FROM event_settings WHERE key = 'allow_play_access';
  
  RETURN (event_status IN ('live', 'paused') AND allow_access = 'true');
END;
$$ LANGUAGE plpgsql;

-- Function to check if new entries are allowed
CREATE OR REPLACE FUNCTION can_submit_answers()
RETURNS BOOLEAN AS $$
DECLARE
  event_status TEXT;
  allow_entries TEXT;
BEGIN
  SELECT value INTO event_status FROM event_settings WHERE key = 'event_status';
  SELECT value INTO allow_entries FROM event_settings WHERE key = 'allow_new_entries';
  
  RETURN (event_status = 'live' AND allow_entries = 'true');
END;
$$ LANGUAGE plpgsql;

-- Function to check if timers should be paused
CREATE OR REPLACE FUNCTION are_timers_paused()
RETURNS BOOLEAN AS $$
DECLARE
  pause_timers TEXT;
BEGIN
  SELECT value INTO pause_timers FROM event_settings WHERE key = 'pause_timers';
  RETURN (pause_timers = 'true');
END;
$$ LANGUAGE plpgsql;