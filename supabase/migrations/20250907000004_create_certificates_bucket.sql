-- Create certificates storage bucket
-- This migration creates the storage bucket for certificate PDFs

-- Create the certificates bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the certificates bucket
CREATE POLICY "Anyone can view certificate files" ON storage.objects
  FOR SELECT USING (bucket_id = 'certificates');

CREATE POLICY "Admins can upload certificate files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'certificates' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update certificate files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'certificates' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete certificate files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'certificates' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );