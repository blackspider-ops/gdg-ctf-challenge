-- Decrypt Night Competition Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('player', 'admin');
CREATE TYPE event_status AS ENUM ('not_started', 'live', 'paused', 'ended');
CREATE TYPE challenge_status AS ENUM ('in_progress', 'solved', 'given_up');

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'player',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event settings (single row configuration)
CREATE TABLE event_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  status event_status NOT NULL DEFAULT 'not_started',
  event_title TEXT DEFAULT 'Decrypt Night — Devs@PSU',
  event_datetime TIMESTAMPTZ,
  event_location TEXT DEFAULT 'Innovation Hub, PSU',
  about_md TEXT DEFAULT '**Decrypt Night** is a cybersecurity competition where you solve cryptographic challenges to climb the leaderboard.',
  prizes_md TEXT DEFAULT '🥇 **1st Place**: $500 + Trophy\n🥈 **2nd Place**: $300\n🥉 **3rd Place**: $200',
  faq_md TEXT DEFAULT '**Q: Do I need prior experience?**\nA: No! Challenges range from beginner to advanced.\n\n**Q: Can I work in teams?**\nA: This is an individual competition.',
  coc_md TEXT DEFAULT 'Be respectful, no cheating, have fun!',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row_settings CHECK (id = 1)
);

-- Challenges table
CREATE TABLE challenges (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  prompt_md TEXT NOT NULL,
  hint_md TEXT,
  answer_pattern TEXT NOT NULL,
  is_regex BOOLEAN NOT NULL DEFAULT FALSE,
  points INTEGER NOT NULL DEFAULT 100,
  order_index INTEGER NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenge progress tracking
CREATE TABLE challenge_progress (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id BIGINT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  solved_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  incorrect_attempts INTEGER NOT NULL DEFAULT 0,
  status challenge_status NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, challenge_id)
);

-- User summary for leaderboard (computed via triggers)
CREATE TABLE user_summary (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  solved_count INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_time_seconds INTEGER NOT NULL DEFAULT 0,
  last_solve_at TIMESTAMPTZ,
  current_challenge_index INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin activity log
CREATE TABLE admin_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_challenges_order ON challenges(order_index) WHERE is_active = TRUE;
CREATE INDEX idx_progress_user_challenge ON challenge_progress(user_id, challenge_id);
CREATE INDEX idx_progress_status ON challenge_progress(status);
CREATE INDEX idx_user_summary_leaderboard ON user_summary(solved_count DESC, total_time_seconds ASC, last_solve_at ASC);

-- Functions and Triggers

-- Function to update user_summary when challenge_progress changes
CREATE OR REPLACE FUNCTION update_user_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate user summary
  INSERT INTO user_summary (user_id, solved_count, total_points, total_time_seconds, last_solve_at, current_challenge_index)
  SELECT 
    NEW.user_id,
    COUNT(*) FILTER (WHERE cp.status = 'solved'),
    COALESCE(SUM(c.points - LEAST(cp.incorrect_attempts, c.points)) FILTER (WHERE cp.status = 'solved'), 0),
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

-- Trigger on challenge_progress changes
CREATE TRIGGER trigger_update_user_summary
  AFTER INSERT OR UPDATE ON challenge_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_user_summary();

-- Function to create user_summary entry for new profiles
CREATE OR REPLACE FUNCTION create_user_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_summary (user_id, current_challenge_index)
  VALUES (NEW.id, 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new profiles
CREATE TRIGGER trigger_create_user_summary
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_summary();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers for timestamp fields
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_challenges_updated_at BEFORE UPDATE ON challenges FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_progress_updated_at BEFORE UPDATE ON challenge_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_event_settings_updated_at BEFORE UPDATE ON event_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert default event settings
INSERT INTO event_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Event settings policies (public read, admin write)
CREATE POLICY "Anyone can read event settings" ON event_settings
  FOR SELECT USING (TRUE);

CREATE POLICY "Admins can update event settings" ON event_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Challenges policies (public read when active, admin write)
CREATE POLICY "Users can read active challenges" ON challenges
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage challenges" ON challenges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Challenge progress policies
CREATE POLICY "Users can manage their own progress" ON challenge_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress" ON challenge_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User summary policies (public read for leaderboard)
CREATE POLICY "Anyone can read user summary" ON user_summary
  FOR SELECT USING (TRUE);

CREATE POLICY "Admins can update user summary" ON user_summary
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin logs policies
CREATE POLICY "Admins can manage admin logs" ON admin_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );