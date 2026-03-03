-- Change event_duration_hours to support decimal values (NUMERIC type)
ALTER TABLE event_settings 
ALTER COLUMN event_duration_hours TYPE NUMERIC(4,1);

-- Update the column to allow half-hour increments
COMMENT ON COLUMN event_settings.event_duration_hours IS 'Event duration in hours, supports half-hour increments (e.g., 1.5, 2.5)';
