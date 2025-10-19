# Supabase Database Migration Guide

This guide will help you migrate the Andar Bahar game from PostgreSQL to Supabase.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A new Supabase project created

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the following values:
   - Project URL (this is your `VITE_SUPABASE_URL` and `SUPABASE_URL`)
   - anon public key (this is your `VITE_SUPABASE_ANON_KEY`)
   - service_role key (this is your `SUPABASE_SERVICE_KEY`)

## Step 2: Update Environment Variables

Update your `.env` file with your Supabase credentials:

```env
# Supabase configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Other existing environment variables
VITE_API_BASE_URL=localhost:5000
NODE_ENV=development
PORT=5000
WEBSOCKET_URL=ws://localhost:5000
SESSION_SECRET=your-secret-key-here
```

## Step 3: Set Up Database Tables

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase_schema_adjusted.sql`
4. Click "Run" to execute the SQL script

This will create all the necessary tables for the Andar Bahar game:
- users
- game_settings
- game_sessions
- dealt_cards
- player_bets
- stream_settings
- game_history

## Step 4: Run the Application

1. Install dependencies (if not already done):
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Access the application at http://localhost:5000

## Step 5: Test the Integration

1. Create a new user account
2. Place a bet in the game
3. Verify that data is being saved to your Supabase database by checking the table view in the Supabase dashboard

## Troubleshooting

### Connection Issues
- Make sure your Supabase URL and keys are correctly set in the `.env` file
- Verify that your Supabase project is active and not paused

### Permission Errors
- Ensure that the service_role key has the necessary permissions
- Check that Row Level Security (RLS) policies are not blocking access

### Table Not Found Errors
- Make sure you've successfully run the SQL script to create the tables
- Verify that table names match exactly (case-sensitive)

## Benefits of Using Supabase

1. **Real-time Capabilities**: Supabase provides real-time subscriptions out of the box
2. **Authentication**: Built-in authentication system
3. **Easy Scaling**: No need to manage database servers
4. **Dashboard**: User-friendly dashboard for managing your data
5. **API Generation**: Automatic REST and GraphQL API generation

## Next Steps

1. Implement real-time updates using Supabase subscriptions
2. Add authentication using Supabase Auth
3. Set up database backups and point-in-time recovery
4. Configure database functions for complex operations