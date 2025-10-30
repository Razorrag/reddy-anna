# Stream Visibility 500 Error - Complete Fix

## Problem

The admin panel's stream visibility toggle was failing with a 500 error:
```
StreamControlPanel.tsx:73 Failed to update stream visibility: Error: Request failed with status 500
    at APIClient.handleResponse (apiClient.ts:73:15)
    at async handleToggleShowStream (StreamControlPanel.tsx:65:20)
```

## Root Cause

The `stream_config` table in the database was missing the `show_stream` column that the application code was trying to update. The code in [`stream-storage.ts`](server/stream-storage.ts:473) was attempting to execute:

```sql
UPDATE stream_config SET show_stream = ? WHERE id = ?
```

But the column didn't exist in the database schema, causing a SQL error that resulted in the 500 HTTP response.

## Solution

### 1. Database Schema Updates

Updated [`comprehensive_db_schema.sql`](server/schemas/comprehensive_db_schema.sql) to include:
- `show_stream BOOLEAN DEFAULT true` column in `stream_config` table
- Index `idx_stream_config_show_stream` for better performance
- Default data insertion with `show_stream = true`

### 2. Migration Script

Created [`add_show_stream_column.sql`](server/migrations/add_show_stream_column.sql) to safely add the missing column:
```sql
ALTER TABLE stream_config 
ADD COLUMN IF NOT EXISTS show_stream BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_stream_config_show_stream ON stream_config(show_stream);

UPDATE stream_config 
SET show_stream = true 
WHERE show_stream IS NULL;
```

### 3. Code Improvements

Updated [`stream-storage.ts`](server/stream-storage.ts:451) to handle missing `show_stream` values gracefully:
```typescript
showStream: data.show_stream !== undefined ? data.show_stream : true, // Default to true if not set
```

### 4. Quick Fix Script

Created [`quick-fix-stream-visibility.js`](server/quick-fix-stream-visibility.js) for immediate resolution without full deployment.

## How to Apply the Fix

### Option 1: Quick Fix (Recommended for immediate resolution)

1. Set your Supabase credentials in environment variables:
   ```bash
   export SUPABASE_URL=your_supabase_url
   export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Run the quick fix script:
   ```bash
   cd server
   node quick-fix-stream-visibility.js
   ```

3. Restart your server

### Option 2: Manual SQL Execution

Run this SQL in your Supabase SQL Editor:
```sql
-- Add show_stream column to stream_config table
ALTER TABLE stream_config 
ADD COLUMN IF NOT EXISTS show_stream BOOLEAN DEFAULT true;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_stream_config_show_stream ON stream_config(show_stream);

-- Update existing records
UPDATE stream_config 
SET show_stream = true 
WHERE show_stream IS NULL;
```

### Option 3: Full Database Migration

1. Run the migration script:
   ```bash
   # Execute server/migrations/add_show_stream_column.sql in Supabase SQL Editor
   ```

2. Update your database schema to use the updated [`comprehensive_db_schema.sql`](server/schemas/comprehensive_db_schema.sql)

## Verification

After applying the fix:

1. **Check the column exists**:
   ```sql
   SELECT column_name, data_type, column_default 
   FROM information_schema.columns 
   WHERE table_name = 'stream_config' AND column_name = 'show_stream';
   ```

2. **Test the stream visibility toggle**:
   - Log in as admin
   - Go to stream settings
   - Click the eye icon to toggle stream visibility
   - Should work without 500 error

3. **Verify the API response**:
   ```bash
   curl -X POST http://localhost:3000/api/stream/show \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -d '{"show": false}' \
     -w "\nHTTP Status: %{http_code}\n"
   ```
   Should return HTTP Status: 200 instead of 500

## Files Modified

1. [`server/schemas/comprehensive_db_schema.sql`](server/schemas/comprehensive_db_schema.sql) - Added `show_stream` column
2. [`server/stream-storage.ts`](server/stream-storage.ts) - Improved error handling for missing `show_stream`
3. [`server/migrations/add_show_stream_column.sql`](server/migrations/add_show_stream_column.sql) - Migration script
4. [`server/migrations/README.md`](server/migrations/README.md) - Migration documentation
5. [`server/quick-fix-stream-visibility.js`](server/quick-fix-stream-visibility.js) - Quick fix script

## Prevention

To prevent similar issues in the future:

1. **Always run schema validation** after database updates
2. **Test API endpoints** that modify database schema
3. **Keep migration scripts** in version control
4. **Add integration tests** for new database columns

## Support

If you encounter issues:
1. Check server logs for specific SQL errors
2. Verify the column was added correctly
3. Ensure your Supabase credentials have proper permissions
4. Test with the quick fix script first before full deployment