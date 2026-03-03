-- Add event_duration_hours column to event_settings table
ALTER TABLE event_settings 
ADD COLUMN IF NOT EXISTS event_duration_hours INTEGER DEFAULT 2;

-- Set default duration to 2 hours for existing row
UPDATE event_settings 
SET event_duration_hours = 2 
WHERE id = 1 AND event_duration_hours IS NULL;
