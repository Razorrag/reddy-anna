# Database Reset and Recreation Script

## Overview
This script (`reset-and-recreate-database.sql`) completely resets your database by:
1. **Dropping all existing tables, views, functions, and types**
2. **Recreating everything from scratch** using the comprehensive schema
3. **Creating admin accounts** for testing
4. **Creating test user accounts** for testing

## ⚠️ WARNING
**THIS SCRIPT WILL PERMANENTLY DELETE ALL DATA IN YOUR DATABASE!**
- All users, games, transactions, and settings will be deleted
- Make sure you have a backup if you need to preserve any data
- This is intended for development/testing environments

## How to Use

### Option 1: Run via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `reset-and-recreate-database.sql`
5. Click **Run** (or press Ctrl+Enter)
6. Wait for the script to complete

### Option 2: Run via psql Command Line
```bash
# Connect to your Supabase database
psql -h <your-supabase-host> -U postgres -d postgres

# Run the script
\i scripts/reset-and-recreate-database.sql
```

### Option 3: Run via Supabase CLI
```bash
# Make sure you have Supabase CLI installed and authenticated
supabase db reset --file scripts/reset-and-recreate-database.sql
```

## What Gets Created

### Admin Accounts
After running the script, you'll have these admin accounts:

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | admin |
| `rajugarikossu` | `admin123` | admin |

### Test User Accounts
The script creates 5 test user accounts:

| Phone | Password | Name | Balance |
|-------|----------|------|---------|
| `9876543210` | `Test@123` | Test Player 1 | ₹1,00,000 |
| `9876543211` | `Test@123` | Test Player 2 | ₹50,000 |
| `9876543212` | `Test@123` | Test Player 3 | ₹75,000 |
| `9876543213` | `Test@123` | Test Player 4 | ₹25,000 |
| `9876543214` | `Test@123` | Test Player 5 | ₹10,000 |

All test users have:
- Phone number as their user ID
- Referral codes generated automatically (RAJUGARIKOSSU0001-0005)
- Active status

### Database Objects Created

#### Tables
- `users` - User accounts
- `admin_credentials` - Admin accounts
- `game_sessions` - Active game sessions
- `player_bets` - Player bets
- `dealt_cards` - Cards dealt in games
- `game_history` - Completed game history
- `game_statistics` - Game statistics
- `daily_game_statistics` - Daily aggregated stats
- `monthly_game_statistics` - Monthly aggregated stats
- `yearly_game_statistics` - Yearly aggregated stats
- `user_transactions` - User transaction history
- `payment_requests` - Payment requests (deposits/withdrawals)
- `user_referrals` - Referral tracking
- `blocked_users` - Blocked user records
- `game_settings` - Game configuration settings
- `stream_settings` - Stream configuration
- `stream_config` - Stream method configuration
- `admin_dashboard_settings` - Admin dashboard settings
- `whatsapp_messages` - WhatsApp message tracking
- `admin_requests` - Admin request management
- `request_audit` - Request audit trail
- `user_creation_log` - User creation tracking

#### Functions
- `generate_referral_code(p_user_id TEXT)` - Generates unique referral codes
- `update_balance_atomic(p_user_id TEXT, p_amount_change NUMERIC)` - Atomic balance updates
- `update_request_status(...)` - Updates request status with audit
- `update_balance_with_request(...)` - Updates balance based on request

#### Views
- `admin_requests_summary` - Summary view of admin requests

#### Types (ENUMs)
- `user_role` - ('player', 'admin', 'super_admin')
- `user_status` - ('active', 'suspended', 'banned', 'inactive')
- `game_phase` - ('idle', 'betting', 'dealing', 'complete')
- `game_status` - ('active', 'completed', 'cancelled')
- `bet_side` - ('andar', 'bahar')
- `transaction_type` - ('deposit', 'withdrawal', 'bet', 'win', 'refund', 'bonus', 'commission', 'support')
- `transaction_status` - ('pending', 'completed', 'failed', 'cancelled')
- `request_status` - ('pending', 'approved', 'rejected', 'processing', 'processed', 'completed')

### Default Settings

The script sets up default game settings including:
- Minimum bet: ₹1,000
- Maximum bet: ₹1,00,000
- Betting timer: 30 seconds
- Deposit bonus: 5%
- Referral bonus: 1%
- Stream title: "RAJU GARI KOSSU Andar Bahar Live"

## Verification

After running the script, you can verify everything was created correctly:

```sql
-- Check admin accounts
SELECT username, role, created_at FROM admin_credentials;

-- Check test user accounts
SELECT id, phone, full_name, balance, status FROM users ORDER BY created_at;

-- Check game settings
SELECT setting_key, setting_value FROM game_settings;

-- Check stream settings
SELECT setting_key, setting_value FROM stream_settings;
```

## Troubleshooting

### If the script fails:
1. **Check for existing connections**: Make sure no other applications are connected to the database
2. **Check permissions**: Ensure your database user has DROP and CREATE privileges
3. **Check for custom objects**: If you have custom tables/functions not in the script, you may need to drop them manually first

### If admin login doesn't work:
1. Verify the admin account was created: `SELECT * FROM admin_credentials WHERE username = 'admin';`
2. Check the password hash matches: `$2b$12$Vc738883Bz.Rn6y4N5pP.eNl93jBQ.aJ5sXK3v3jVcQFpNQ7vZ5XW`
3. If needed, update the password hash manually using `fix-admin-password.sql`

### If test user login doesn't work:
1. Verify the test user exists: `SELECT * FROM users WHERE phone = '9876543210';`
2. The password hash for test users is: `$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5LdJKLpYFqFHy` (for password: `Test@123`)

## Notes

- **Password Hashes**: The script uses bcrypt hashes. If you need to change passwords, generate new hashes using a bcrypt generator.
- **Row Level Security**: RLS is disabled for all tables in development. **Enable RLS in production!**
- **Referral Codes**: Test users have referral codes starting with "RAJUGARIKOSSU" followed by numbers (0001-0005)

## Support

If you encounter issues:
1. Check the Supabase logs for detailed error messages
2. Verify your database connection settings
3. Ensure you have the correct permissions
4. Check that all required extensions (pgcrypto, uuid-ossp) are enabled





























