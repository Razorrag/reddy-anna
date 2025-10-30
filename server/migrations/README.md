# Database Migrations

This directory contains SQL migration scripts to update the database schema.

## How to Apply Migrations

1. **Backup your database** before applying any migrations
2. Run the migration scripts in order in your Supabase SQL Editor
3. Verify the changes were applied correctly

## Available Migrations

### add_show_stream_column.sql

**Purpose**: Adds the `show_stream` column to the `stream_config` table to control stream visibility for players.

**Issue Fixed**: 
- Error: "Failed to update stream visibility: Error: Request failed with status 500"
- Cause: The `stream_config` table was missing the `show_stream` column that the application code was trying to update

**Changes**:
- Adds `show_stream BOOLEAN DEFAULT true` column to `stream_config` table
- Creates index `idx_stream_config_show_stream` for better performance
- Updates existing records to have `show_stream = true` as default

**After applying this migration**:
- The stream visibility toggle in the admin panel will work correctly
- Players will be able to see/hide the stream based on admin settings

## Verification

After applying the migration, you can verify it worked by:

1. Checking the `stream_config` table has the `show_stream` column:
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'stream_config' AND column_name = 'show_stream';
```

2. Testing the stream visibility toggle in the admin panel

## Rollback

If needed, you can rollback this migration by:
```sql
ALTER TABLE stream_config DROP COLUMN IF EXISTS show_stream;
DROP INDEX IF EXISTS idx_stream_config_show_stream;