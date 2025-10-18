# Database Setup Instructions

## Problem
The server is showing errors like `TypeError: client.from(...).eq is not a function` because the database tables haven't been created in Supabase yet.

## Solution

### Option 1: Automatic Setup (Recommended)

1. Run the database initialization script:
```bash
cd backend
node init-database.js
```

2. If the automatic setup doesn't work, follow the manual setup below.

### Option 2: Manual Setup

1. **Open your Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Sign in to your account
   - Select your project (jasnmtqxbwjxdxkijcgn)

2. **Open the SQL Editor**
   - In the left sidebar, click on "SQL Editor"
   - Click "New query" to create a new SQL query

3. **Run the Schema Setup**
   - Open the file `backend/supabase-schema.sql` in a text editor
   - Copy the entire content of the file
   - Paste it into the SQL Editor in Supabase
   - Click "Run" to execute the schema setup

4. **Verify the Setup**
   - After running the schema, you should see a success message
   - You can verify by checking the "Table Editor" in Supabase
   - You should see tables like: `game_settings`, `stream_settings`, `game_sessions`, etc.

5. **Restart the Server**
   ```bash
   # Stop the current server (Ctrl+C)
   # Restart the server
   node server.js
   ```

## What This Does

The schema setup creates:
- ✅ `game_settings` table for game configuration
- ✅ `stream_settings` table for live stream configuration
- ✅ `game_sessions` table for active game sessions
- ✅ `player_bets` table for tracking player bets
- ✅ `dealt_cards` table for tracking dealt cards
- ✅ `game_history` table for completed games
- ✅ `users` table for player accounts
- ✅ `admins` table for admin accounts
- ✅ Default admin accounts for testing

## Default Admin Accounts

After setup, you can use these admin accounts:
- **Username**: `admin` | **Email**: `admin@reddyanna.com`
- **Username**: `reddy` | **Email**: `reddy@reddyanna.com`
- **Username**: `superadmin` | **Email**: `super@reddyanna.com`

All passwords are: `password123`

## Troubleshooting

### If you still see errors after setup:

1. **Check Environment Variables**
   ```bash
   # Make sure these are set in backend/.env
   SUPABASE_URL=https://jasnmtqxbwjxdxkijcgn.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Verify Table Creation**
   - In Supabase Dashboard → Table Editor
   - You should see all the tables listed
   - Click on each table to verify they have data

3. **Check RLS Policies**
   - The schema includes Row Level Security (RLS) policies
   - These might restrict access if not properly configured

4. **Restart the Server**
   ```bash
   node server.js
   ```

### Common Error Messages

- `relation "game_settings" does not exist` → Tables not created, run the schema setup
- `client.from(...).eq is not a function` → Supabase client not initialized, check environment variables
- `permission denied for table` → RLS policies blocking access, check admin authentication

## Next Steps

Once the database is set up:
1. The server should start without errors
2. The game admin panel should work properly
3. Real-time synchronization should function correctly
4. All API endpoints should respond correctly

## Support

If you continue to have issues:
1. Check the server logs for specific error messages
2. Verify all environment variables are correctly set
3. Ensure the Supabase project is active and not paused
4. Check that you have the correct permissions in Supabase