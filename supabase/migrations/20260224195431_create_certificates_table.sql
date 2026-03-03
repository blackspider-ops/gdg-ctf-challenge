-- Create certificates table for tracking user achievements
CREATE TABLE IF NOT EXISTS certificates (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('champion', 'participation')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  challenges_solved INTEGER NOT NULL DEFAULT 0,
  total_challenges INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_time_seconds INTEGER NOT NULL DEFAULT 0,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);

-- Enable RLS
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own certificates" ON certificates;
CREATE POLICY "Users can view their own certificates" ON certificates
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own certificates" ON certificates;
CREATE POLICY "Users can create their own certificates" ON certificates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all certificates" ON certificates;
CREATE POLICY "Admins can view all certificates" ON certificates
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can update all certificates" ON certificates;
CREATE POLICY "Admins can update all certificates" ON certificates
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete certificates" ON certificates;
CREATE POLICY "Admins can delete certificates" ON certificates
  FOR DELETE USING (is_admin());

