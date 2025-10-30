-- Migration: Add show_stream column to stream_config table
-- This column is needed to control stream visibility for players

-- Add the show_stream column to stream_config table
ALTER TABLE stream_config 
ADD COLUMN IF NOT EXISTS show_stream BOOLEAN DEFAULT true;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_stream_config_show_stream ON stream_config(show_stream);

-- Update existing records to have a default value
UPDATE stream_config 
SET show_stream = true 
WHERE show_stream IS NULL;

-- Log the migration completion
DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed: Added show_stream column to stream_config table';
    RAISE NOTICE '📝 Default value: true (stream visible to players)';
END $$;