-- Add viewer range columns to simple_stream_config table
-- These columns allow admins to configure a fake viewer count range
-- If both are NULL, the system falls back to real viewer count

ALTER TABLE simple_stream_config
ADD COLUMN IF NOT EXISTS min_viewers INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_viewers INTEGER DEFAULT NULL;

-- Add helpful comment
COMMENT ON COLUMN simple_stream_config.min_viewers IS 'Minimum fake viewer count to display (NULL = use real count)';
COMMENT ON COLUMN simple_stream_config.max_viewers IS 'Maximum fake viewer count to display (NULL = use real count)';