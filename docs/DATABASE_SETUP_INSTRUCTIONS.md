# Database Setup Instructions for Reddy Anna Andar Bahar

## Issue: "relation 'users' does not exist"

This error occurs because the database has been reset but the schema hasn't been recreated yet. Follow these steps to fix it.

## Quick Fix Steps

### Step 1: Database Already Reset ✅
The reset script has already been executed and removed all tables, which is why you're getting the "users does not exist" error.

### Step 2: Recreate Database Schema
You need to run the main schema file to recreate all tables:

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Click on "SQL Editor" in the sidebar
   - Click "New query"

2. **Copy and Paste Schema**
   - Copy the entire contents of `supabase_schema.sql`
   - Paste it into the SQL Editor

3. **Execute the Schema**
   - Click the "Run" button or press `Ctrl+Enter`
   - Wait for the script to complete (should show "Success" message)

### Step 3: Verify Database Setup
Run this verification query to confirm all tables were created:

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

You should see these tables:
- audit_log
- bets
- dealt_cards
- game_history
- game_sessions
- site_content
- stream_settings
- system_settings
- transactions
- user_sessions
- users

### Step 4: Test Database Connection
Run this simple test to verify the database is working:

```sql
-- Test basic database functionality
SELECT COUNT(*) as total_tables 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- Test stream_settings table (for streaming)
SELECT COUNT(*) as stream_settings_count FROM stream_settings;

-- Test users table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
```

## What the Schema Creates

### Core Tables:
- **users** - User accounts and profiles
- **game_sessions** - Active and completed game sessions
- **bets** - All betting records
- **transactions** - Financial transactions
- **user_sessions** - Login sessions

### Game Tables:
- **dealt_cards** - Card dealing history
- **game_history** - Completed game records

### System Tables:
- **system_settings** - Application configuration
- **site_content** - Website content management
- **stream_settings** - Streaming configuration ⭐ **NEW**
- **audit_log** - Audit trail

### Features Included:
- ✅ Row Level Security (RLS)
- ✅ Database triggers and functions
- ✅ Indexes for performance
- ✅ Default system settings
- ✅ Streaming configuration
- ✅ User statistics views

## Troubleshooting

### If Schema Fails to Execute:

1. **Check for Syntax Errors**
   - Look for any error messages in the SQL Editor
   - Make sure you copied the entire file content

2. **Run in Smaller Chunks**
   - If the full schema fails, try running it section by section
   - Start with extensions and types, then tables, then functions

3. **Check Permissions**
   - Ensure you have admin rights on the Supabase project
   - Verify you're using the correct project

### Common Errors:

**Error: "extension already exists"**
- This is normal, the script uses `IF NOT EXISTS`

**Error: "permission denied"**
- Check if you have the correct role permissions
- Ensure you're the project owner or have admin rights

**Error: "syntax error at or near"**
- Check for any copy/paste issues
- Ensure the entire file was copied correctly

## Next Steps After Setup

1. **Create Admin User**
   - Run the admin creation script to create your first admin account

2. **Test Application**
   - Start your application and verify database connectivity
   - Test user registration and login

3. **Configure Streaming**
   - The stream_settings table is now ready for streaming configuration
   - Test the streaming endpoints

## Verification Commands

Copy and paste these commands to verify everything is working:

```sql
-- 1. Check all tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- 2. Check stream settings (for streaming fix)
SELECT * FROM stream_settings LIMIT 5;

-- 3. Check system settings
SELECT key, value FROM system_settings WHERE is_public = true;

-- 4. Test user table structure
DESCRIBE users;

-- 5. Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('users', 'bets', 'transactions');
```

If all these commands work successfully, your database is ready and the "users does not exist" error should be resolved!
