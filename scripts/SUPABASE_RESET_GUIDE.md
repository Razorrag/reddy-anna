# 🔄 Supabase Database Reset Guide

Complete guide to reset your Raju Gari Kossu database in Supabase with fresh password hashes.

## 📋 What This Script Does

This script will:
- ✅ Drop all existing tables, views, functions, and types
- ✅ Recreate the entire database schema from scratch
- ✅ Create admin accounts with FRESH password hashes
- ✅ Create 8 test user accounts with various balances
- ✅ Insert default game settings
- ✅ Insert default stream configurations
- ✅ Insert test transaction data
- ✅ Set up all indexes, triggers, and functions

## ⚠️ WARNING

**THIS WILL DELETE ALL DATA PERMANENTLY!**

Make sure you:
1. Have a backup of your data (if needed)
2. Are running this on the correct database
3. Have admin access to your Supabase project

## 🚀 How to Run in Supabase

### Step 1: Access Supabase SQL Editor

1. Log in to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Click on "SQL Editor" in the left sidebar

### Step 2: Run the Reset Script

1. Open the file: `scripts/supabase-reset-database.sql`
2. Copy the ENTIRE contents of the file
3. Paste it into the Supabase SQL Editor
4. Click "Run" button (or press `Ctrl+Enter`)

### Step 3: Wait for Completion

The script will take 30-60 seconds to complete. You'll see output messages showing:
- Tables created
- Indexes created
- Functions created
- Data inserted
- Verification results

### Step 4: Verify Success

At the end of execution, you should see:
```
✅ Database reset completed successfully!
📊 Verification Results:
2 admin accounts created
8 test users created
19 game settings configured
4 stream settings configured
8 test transactions recorded
```

## 🔐 Login Credentials

### Admin Accounts

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | admin |
| rajugarikossu | admin123 | super_admin |

### Test User Accounts

All test users use password: **Test@123**

| Phone | Name | Balance | Referral Code |
|-------|------|---------|---------------|
| 9876543210 | Test Player 1 - VIP | ₹1,00,000 | TEST001 |
| 9876543211 | Test Player 2 - Premium | ₹50,000 | TEST002 |
| 9876543212 | Test Player 3 - Gold | ₹75,000 | TEST003 |
| 9876543213 | Test Player 4 - Silver | ₹25,000 | TEST004 |
| 9876543214 | Test Player 5 - Bronze | ₹10,000 | TEST005 |
| 8686886632 | Owner Test Account | ₹5,00,000 | OWNER001 |
| 9999999999 | Demo Player | ₹1,000 | DEMO001 |
| 8888888888 | High Roller | ₹2,50,000 | HIGHROLL |

## 🔑 Password Hashes

All password hashes in this script are **FRESH** and generated on November 1, 2025:

- **Admin (admin123)**: `$2b$12$kBXYropiQsR8cwFr386z/e9GuJSyGZbj1LctFVQ7tJcQU7HXfvrp6`
- **Test Users (Test@123)**: `$2b$12$tbrgA//VDxYmIKQ37uAdE.ew7L7Wv6l5b65kivV0Xvir5HNdLx8cK`

These are bcrypt hashes with 12 salt rounds, matching your application's authentication system.

## 🧪 Testing After Reset

1. **Test Admin Login**:
   - Go to `/admin/login`
   - Username: `admin`
   - Password: `admin123`

2. **Test Player Login**:
   - Go to `/login`
   - Phone: `9876543210`
   - Password: `Test@123`

3. **Check Database**:
   ```sql
   -- Check users
   SELECT id, full_name, balance FROM users;
   
   -- Check admins
   SELECT username, role FROM admin_credentials;
   
   -- Check settings
   SELECT setting_key, setting_value FROM game_settings;
   ```

## 🔧 Troubleshooting

### Error: "permission denied for table"
**Solution**: Make sure you're running this as a Supabase admin/owner.

### Error: "function does not exist"
**Solution**: The script drops and recreates all functions. Run the entire script, not parts of it.

### Error: "type already exists"
**Solution**: The script drops all types first. Make sure the entire script runs in order.

### Login Not Working
**Solution**: 
1. Verify the password hashes match in the database
2. Check your JWT_SECRET in environment variables
3. Clear browser cache and cookies

## 📊 Database Schema Overview

### Core Tables
- `users` - Player accounts
- `admin_credentials` - Admin accounts
- `game_sessions` - Active and past games
- `player_bets` - All player bets
- `game_history` - Completed game records
- `user_transactions` - All transactions
- `payment_requests` - Deposit/withdrawal requests
- `admin_requests` - Admin request management

### Settings Tables
- `game_settings` - Game configuration
- `stream_settings` - Stream configuration
- `stream_config` - Advanced stream setup
- `admin_dashboard_settings` - Admin panel settings

### Analytics Tables
- `game_statistics` - Per-game statistics
- `daily_game_statistics` - Daily aggregates
- `monthly_game_statistics` - Monthly aggregates
- `yearly_game_statistics` - Yearly aggregates

## 🛡️ Security Notes

1. **Change default passwords** in production
2. **Enable Row Level Security (RLS)** for production
3. **Update JWT_SECRET** environment variable
4. **Secure your Supabase API keys**

## 📝 Next Steps

After reset:
1. ✅ Test admin login
2. ✅ Test player login
3. ✅ Start a test game
4. ✅ Place test bets
5. ✅ Test deposit/withdrawal requests
6. ✅ Verify WebSocket connections
7. ✅ Test stream functionality

## 💡 Tips

- **Backup First**: Always backup before running reset scripts
- **Test Environment**: Run on test database first
- **Verify Settings**: Check game settings match your requirements
- **Update Passwords**: Change default passwords for production

## 🆘 Need Help?

If you encounter issues:
1. Check Supabase logs in the Dashboard
2. Verify all tables were created
3. Check function definitions
4. Ensure triggers are active

## 📞 Support

For additional support, contact your development team or check the project documentation.

---

**Last Updated**: November 1, 2025  
**Script Version**: 2.0  
**Compatible With**: Supabase (PostgreSQL 14+)



