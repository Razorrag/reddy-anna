# ⚡ Quick Start - 5 Minutes Setup

## 🎯 Goal
Get your Andar Bahar game running with a fresh database in 5 minutes.

## 📝 Step-by-Step

### 1️⃣ Create Supabase Project (2 min)
```
1. Go to: https://supabase.com/dashboard
2. Click: "New Project"
3. Name: "reddy-anna-game"
4. Choose region (closest to you)
5. Set database password (SAVE IT!)
6. Click: "Create new project"
7. Wait 2-3 minutes...
```

### 2️⃣ Run SQL Script (1 min)
```
1. In Supabase, click: "SQL Editor" (left sidebar)
2. Click: "New query"
3. Open file: supabase_init.sql
4. Copy ALL contents (Ctrl+A, Ctrl+C)
5. Paste in SQL Editor (Ctrl+V)
6. Click: "Run" button
7. Wait for: ✅ Success message
```

### 3️⃣ Get API Keys (30 sec)
```
1. In Supabase, click: "Settings" → "API"
2. Copy these 3 values:
   - Project URL
   - anon public key
   - service_role key (secret!)
```

### 4️⃣ Update .env File (30 sec)
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5️⃣ Start Server (30 sec)
```bash
npm run dev
```

### 6️⃣ Login as Admin (30 sec)
```
URL: http://localhost:5000/admin-game
Username: admin
Password: Admin@123
```

## ✅ Done!

You should now see the admin control panel.

## 🎮 Test the Game

### As Admin:
1. Select opening card (e.g., 7♥)
2. Click "Start Round 1"
3. Wait for betting timer

### As Player (in another browser):
1. Go to: http://localhost:5000/register
2. Register with phone: 9999999999
3. Password: Test@123
4. Login and place a bet

### Back to Admin:
1. Deal cards (Bahar → Andar)
2. Watch for winner
3. Check player balance updated

## 🔐 Admin Credentials

```
Username: admin
Password: Admin@123
```

**⚠️ Change this password after first login!**

## 📊 What Was Created

- **17 database tables**
- **25+ indexes** for performance
- **1 admin account** (admin/Admin@123)
- **Game settings** pre-configured
- **Stream settings** pre-configured

## 🆘 Troubleshooting

### SQL script fails?
- Check you copied ALL contents
- Make sure project is fully initialized
- Try running again

### Can't login as admin?
- Check username is exactly: `admin`
- Check password is exactly: `Admin@123`
- Clear browser cache

### Environment variables not working?
- Restart the server after updating .env
- Check no extra spaces in .env values
- Verify Supabase URL is correct

## 📚 More Information

- **Full Setup Guide:** `SUPABASE_SETUP_GUIDE.md`
- **Admin Reference:** `ADMIN_CREDENTIALS.md`
- **Database Summary:** `DATABASE_SETUP_SUMMARY.md`

## 🎉 Success!

If you can login as admin and see the control panel, you're ready to go!

**Next:** Change the admin password and start testing the game flow.

---

**Total Time:** ~5 minutes
**Difficulty:** Easy
**Prerequisites:** Supabase account
