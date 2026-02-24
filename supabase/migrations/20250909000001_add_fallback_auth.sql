-- Add fallback authentication settings
INSERT INTO event_settings (key, value, description) VALUES
  ('fallback_auth_enabled', 'false', 'Whether fallback authentication is enabled'),
  ('fallback_access_code', '', 'Current fallback access code for emergency login')
ON CONFLICT (key) DO NOTHING;