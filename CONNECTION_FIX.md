# Andar Bahar Backend Troubleshooting Guide

## Issue Summary

The authentication system code is properly structured and the core functions (password hashing, validation, JWT generation) work correctly. However, there are issues with the Supabase database connection, as evidenced by the "TypeError: fetch failed" errors.

## Database Connection Issues

### Problem:
Your Supabase credentials appear to be in the .env file, but the connection is failing with fetch errors.

### Solutions:

#### 1. Verify Supabase Project Status
- Log into your Supabase dashboard: https://app.supabase.com
- Check that your project `rfwhpsuahpxbeqbfgbrp` is active (not paused)
- Verify that your project is not in a free tier that has been exceeded

#### 2. Test Supabase Connection
Run this simple connection test:

```bash
# Create a quick test file to verify Supabase
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testConnection() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error('Connection failed:', error);
  } else {
    console.log('Connection successful, sample data:', data);
  }
}

testConnection();
"
```

#### 3. Check Your Tables Exist
Make sure your database contains the required tables:
- `users` - for user accounts
- `admin_credentials` - for admin login
- `game_sessions`, `player_bets`, `game_history`, `dealt_cards` - for game functionality

#### 4. Fix Row Level Security (RLS)
If your tables have Row Level Security enabled, you may need to:
- Either disable RLS for development: `ALTER TABLE users DISABLE ROW LEVEL SECURITY;`
- Or create proper policies that allow your service role to access the tables

## Quick Fixes to Try

### 1. Create Required Tables
If tables don't exist, create them manually in your Supabase SQL editor:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'player',
    status TEXT DEFAULT 'active',
    balance TEXT DEFAULT '100000.00',
    total_winnings TEXT DEFAULT '0.00',
    total_losses TEXT DEFAULT '0.00',
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    phone_verified BOOLEAN DEFAULT false,
    referral_code TEXT,
    original_deposit_amount TEXT DEFAULT '0.00',
    deposit_bonus_available TEXT DEFAULT '0.00',
    referral_bonus_available TEXT DEFAULT '0.00',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create admin_credentials table
CREATE TABLE IF NOT EXISTS admin_credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Disable RLS for Development
In your Supabase SQL editor, run these commands:
```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_credentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE player_bets DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE dealt_cards DISABLE ROW LEVEL SECURITY;
```

### 3. Verify Service Role Permissions
Make sure your service role key has full access to the tables:
- Go to your Supabase dashboard → Database → Policies
- Create permissive policies for the service role

## Alternative: Mock Storage for Development

If Supabase continues to cause issues, you could temporarily implement an in-memory storage option for development. However, the current system is properly structured for Supabase and should work once the database connection is fixed.

## Next Steps

1. First, test your Supabase connection using the command above
2. Check your project status and table existence
3. Disable RLS if needed
4. Run `npm run init` again to test admin setup

## Starting the Server

Once the database issues are resolved, start your server with:
- `npm run dev` - for development
- Or `npm run dev:both` for full stack development

## Contact Support

If Supabase connection issues persist, check:
- Your internet connection
- Firewall/proxy settings that might block the connection
- Supabase project region accessibility from your location
- Whether the Supabase project has hit any limits