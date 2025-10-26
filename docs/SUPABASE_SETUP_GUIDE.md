# 🚀 Supabase Setup Guide - Reddy Anna Andar Bahar

## 📋 Prerequisites
- Supabase account (https://supabase.com)
- Project created in Supabase

## 🔧 Step 1: Create New Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Project Name**: `reddy-anna-game` (or any name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click **"Create new project"**
5. Wait 2-3 minutes for project to be ready

## 📊 Step 2: Run Database Initialization Script

1. In your Supabase project dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Open the file `supabase_init.sql` from this project
4. **Copy ALL contents** of `supabase_init.sql`
5. **Paste** into the SQL Editor
6. Click **"Run"** button (or press Ctrl+Enter)
7. Wait for execution to complete
8. You should see: ✅ Success message with admin credentials

## 🔐 Step 3: Get Your Supabase Credentials

1. In Supabase dashboard, click **"Settings"** (gear icon) in left sidebar
2. Click **"API"** under Project Settings
3. Copy these values:

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (keep secret!)
```

## ⚙️ Step 4: Update Your .env File

1. Open `.env` file in your project root
2. Update these values:

```env
# Supabase Configuration
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database URL (for migrations if needed)
DATABASE_URL=postgresql://postgres:[YOUR-DB-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

## 🎮 Step 5: Test Admin Login

### Admin Credentials:
```
Username: admin
Password: Admin@123
```

### Testing Steps:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open admin panel:**
   - Navigate to: `http://localhost:5000/admin-game`
   - Or: `http://localhost:5000/game-admin`

3. **Login with admin credentials:**
   - Username: `admin`
   - Password: `Admin@123`

4. **Verify admin access:**
   - You should see the admin control panel
   - Opening card selection should be visible
   - Game controls should be available

## 👤 Step 6: Create Test Player Account

### Option A: Via Admin Panel (Recommended)
1. Login as admin
2. Go to User Management section
3. Click "Create New User"
4. Fill in:
   - Phone: `9999999999`
   - Password: `Test@123`
   - Initial Balance: `100000`
5. Click "Create User"

### Option B: Via Registration Page
1. Go to: `http://localhost:5000/register`
2. Fill in:
   - Phone: `9999999999`
   - Password: `Test@123`
   - Confirm Password: `Test@123`
3. Click "Register"

### Test Player Login:
1. Go to: `http://localhost:5000/login`
2. Login with:
   - Phone: `9999999999`
   - Password: `Test@123`
3. You should see the player game interface

## ✅ Step 7: Verify Everything Works

### Test Checklist:

- [ ] **Admin Login** - Can login with admin/Admin@123
- [ ] **Admin Panel** - Can access admin control panel
- [ ] **Player Registration** - Can create new player account
- [ ] **Player Login** - Can login as player
- [ ] **Game Start** - Admin can select opening card and start game
- [ ] **Betting** - Player can place bets
- [ ] **Card Dealing** - Admin can deal cards
- [ ] **Payouts** - Winnings are credited correctly
- [ ] **Balance Updates** - Player balance updates in real-time
- [ ] **Game History** - Previous games show in history

## 🔍 Verify Database Tables

Run this query in Supabase SQL Editor to verify all tables:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see these tables:
- admin_credentials ✅
- blocked_users ✅
- daily_game_statistics ✅
- dealt_cards ✅
- game_history ✅
- game_sessions ✅
- game_settings ✅
- game_statistics ✅
- monthly_game_statistics ✅
- player_bets ✅
- stream_settings ✅
- user_creation_log ✅
- user_referrals ✅
- user_transactions ✅
- users ✅
- whatsapp_messages ✅
- yearly_game_statistics ✅

## 🎯 Quick Test Workflow

### Complete Game Test:

1. **Admin Side:**
   - Login as admin
   - Select opening card (e.g., 7♥)
   - Click "Start Round 1"
   - Wait for betting timer (30 seconds)

2. **Player Side:**
   - Login as player in another browser/tab
   - Place bet on Andar or Bahar (e.g., ₹5000)
   - Wait for timer to end

3. **Admin Side:**
   - Deal cards (Bahar first, then Andar)
   - If no winner, Round 2 starts automatically
   - Continue until winner found

4. **Verify:**
   - Check player balance updated
   - Check game history shows result
   - Check transaction log shows bet and win/loss

## 🔒 Security Notes

### ⚠️ IMPORTANT - Change Admin Password!

After first login, change the default admin password:

1. Login as admin
2. Go to Settings/Profile
3. Change password from `Admin@123` to something secure
4. Use a strong password with:
   - At least 12 characters
   - Uppercase and lowercase letters
   - Numbers and special characters

### Production Checklist:
- [ ] Change admin password
- [ ] Enable Row Level Security (RLS) in Supabase
- [ ] Set up proper authentication policies
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS only
- [ ] Set up backup schedule in Supabase

## 📊 Database Schema Overview

### Core Tables:
- **users** - Player accounts with phone-based auth
- **admin_credentials** - Admin accounts (separate from players)
- **game_sessions** - Active and completed games
- **player_bets** - All bets placed by players
- **dealt_cards** - Cards dealt in each game
- **user_transactions** - Complete transaction history

### Analytics Tables:
- **game_statistics** - Per-game analytics
- **daily_game_statistics** - Daily aggregated stats
- **monthly_game_statistics** - Monthly aggregated stats
- **yearly_game_statistics** - Yearly aggregated stats

### Supporting Tables:
- **game_settings** - Configurable game parameters
- **stream_settings** - Live stream configuration
- **user_referrals** - Referral tracking
- **game_history** - Historical game results
- **whatsapp_messages** - Player support requests

## 🆘 Troubleshooting

### Issue: "relation does not exist" error
**Solution:** Re-run the `supabase_init.sql` script

### Issue: Admin login fails
**Solution:** 
1. Check if admin_credentials table has data:
   ```sql
   SELECT * FROM admin_credentials;
   ```
2. If empty, re-run the INSERT statement from supabase_init.sql

### Issue: Player can't place bets
**Solution:**
1. Check player balance:
   ```sql
   SELECT id, phone, balance FROM users WHERE phone = '9999999999';
   ```
2. Verify game session is in 'betting' phase:
   ```sql
   SELECT * FROM game_sessions WHERE status = 'active';
   ```

### Issue: WebSocket connection fails
**Solution:**
1. Check if server is running on port 5000
2. Verify SUPABASE_URL in .env is correct
3. Check browser console for errors

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Check the server logs in terminal
3. Verify all environment variables are set correctly
4. Ensure Supabase project is active and not paused

## 🎉 Success!

If all tests pass, your database is ready for production use!

**Next Steps:**
1. Set up proper authentication policies
2. Configure live streaming
3. Set up payment gateway integration
4. Deploy to production server
5. Monitor with Supabase dashboard

---

**Created:** $(date)
**Version:** 1.0.0
**Database Schema:** supabase_init.sql
