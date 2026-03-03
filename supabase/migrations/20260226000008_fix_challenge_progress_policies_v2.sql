-- Drop ALL existing policies on challenge_progress to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'challenge_progress') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON challenge_progress';
    END LOOP;
END $$;

-- Allow users to view their own progress
CREATE POLICY "Users can view own progress" ON challenge_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own progress
CREATE POLICY "Users can insert own progress" ON challenge_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own progress
CREATE POLICY "Users can update own progress" ON challenge_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow admins to do everything
CREATE POLICY "Admins can do everything" ON challenge_progress
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
