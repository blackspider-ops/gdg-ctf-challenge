-- Convert user_summary from VIEW to TABLE
-- This must run before other migrations that expect user_summary to be a table

-- Drop the view if it exists
DROP VIEW IF EXISTS public.user_summary CASCADE;

-- Create user_summary as a table
CREATE TABLE IF NOT EXISTS public.user_summary (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'player',
  current_challenge_index INTEGER DEFAULT 1,
  challenges_solved INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_time_seconds INTEGER NOT NULL DEFAULT 0,
  last_solve_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_summary
ALTER TABLE public.user_summary ENABLE ROW LEVEL SECURITY;

-- Create policies for user_summary
CREATE POLICY "Anyone can read user summary for leaderboard" 
ON public.user_summary 
FOR SELECT 
USING (true);

CREATE POLICY "Only system can modify user summary" 
ON public.user_summary 
FOR ALL 
USING (false);

-- Enable realtime
ALTER TABLE public.user_summary REPLICA IDENTITY FULL;
