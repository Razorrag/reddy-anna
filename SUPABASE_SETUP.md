# Supabase Database Setup Instructions

## Your Supabase Details
- URL: https://ktblkbkulozdfefsxuez.supabase.co
- Project Reference: ktblkbkulozdfefsxuez

## Step 1: Import Database Schema

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** in the left sidebar
4. Click **New query**
5. Copy the entire content from `backend/db_postgres.sql`
6. Paste it into the SQL Editor
7. Click **Run** to execute the schema

### Option B: Using the Setup Script

1. First, update the DATABASE_URL in `backend/.env` with your actual database password
2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Run the setup script:
   ```bash
   node setup-supabase.js
   ```

## Step 2: Environment Variables Are Already Set

Good news! The `.env` file is already configured with your Supabase credentials:
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

No additional configuration needed for the database connection since we're using the Supabase client directly.

## Step 3: Verify Tables Created

After importing the schema, you should see these tables in your Supabase database:
- `users` - User accounts
- `admins` - Administrator accounts
- `game_settings` - Game configuration
- `stream_settings` - Streaming configuration
- `blocked_users` - Blocked users list

## Step 4: Test Database Connection

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```
2. If the server starts without errors, your database connection is working

## Default Admin Accounts

The database is pre-populated with these admin accounts:
- Username: `admin`, Password: `admin123`
- Username: `reddy`, Password: `reddy123`
- Username: `superadmin`, Password: `super123`

**Important:** Change these passwords in production!

## Next Steps

Once the database is set up:
1. Deploy the backend to Render
2. Update the frontend config.js with your Render URL
3. Deploy the frontend to Netlify