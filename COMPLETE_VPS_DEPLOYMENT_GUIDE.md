# 🚀 COMPLETE VPS DEPLOYMENT GUIDE
## Fresh Deployment with Database Migration & All Fixes

> **This guide covers deploying the fixed Andar Bahar application to your VPS, including database migration, authentication fixes, and all game functionality improvements.**

---

## 📋 TABLE OF CONTENTS

1. [Pre-Deployment Preparation](#1-pre-deployment-preparation)
2. [Backup Current System](#2-backup-current-system)
3. [Database Migration](#3-database-migration)
4. [Code Deployment](#4-code-deployment)
5. [Environment Configuration](#5-environment-configuration)
6. [Build & Deploy](#6-build--deploy)
7. [Verification & Testing](#7-verification--testing)
8. [Troubleshooting](#8-troubleshooting)
9. [Rollback Procedure](#9-rollback-procedure)

---

## 1. PRE-DEPLOYMENT PREPARATION

### **1.1 What You Need**

- [ ] SSH access to your VPS
- [ ] Supabase project credentials (URL and Service Key)
- [ ] Domain name (if using custom domain)
- [ ] Git repository access
- [ ] Admin credentials for testing
- [ ] At least 30 minutes of downtime window

### **1.2 System Requirements**

```bash
# SSH into your VPS
ssh your-username@your-vps-ip

# Check Node.js version (must be v18+)
node --version

# If Node.js is not installed or outdated:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### **1.3 Check Current Setup**

```bash
# Navigate to your app directory
cd /path/to/your/andar-bahar-app
# Example: cd /var/www/andar-bahar or cd ~/andar-bahar

# Check current status
pm2 status
# OR
sudo systemctl status your-app-name

# Check current git branch
git branch
git status
```

---

## 2. BACKUP CURRENT SYSTEM

### **2.1 Backup Application Files**

```bash
# Create backup directory
mkdir -p ~/backups/andar-bahar-$(date +%Y%m%d-%H%M%S)

# Backup current .env file
cp .env ~/backups/andar-bahar-$(date +%Y%m%d-%H%M%S)/.env.backup

# Backup entire application (optional but recommended)
cd ..
tar -czf ~/backups/andar-bahar-$(date +%Y%m%d-%H%M%S)/app-backup.tar.gz andar-bahar/

# Return to app directory
cd andar-bahar
```

### **2.2 Backup Database (Supabase)**

```bash
# Go to Supabase Dashboard
# 1. Navigate to: https://app.supabase.com
# 2. Select your project
# 3. Go to Database → Backups
# 4. Click "Create Backup" or note the latest automatic backup time
# 5. Download backup if needed (Settings → Database → Download backup)
```

**IMPORTANT:** Make sure you have a recent database backup before proceeding!

---

## 3. DATABASE MIGRATION

### **3.1 Understand Database Changes**

The new schema includes:
- ✅ Enhanced user authentication (JWT-only)
- ✅ Admin requests & WhatsApp integration tables
- ✅ Stream configuration (RTMP + WebRTC)
- ✅ Atomic balance update functions
- ✅ Request audit trail
- ✅ Token blacklist for logout
- ✅ Enhanced game statistics

### **3.2 Run Database Migration**

```bash
# Open Supabase SQL Editor
# Go to: https://app.supabase.com → Your Project → SQL Editor

# Option A: Run the comprehensive schema (RECOMMENDED)
# Copy the contents of: server/schemas/comprehensive_db_schema.sql
# Paste into SQL Editor and click "Run"
```

**SQL Editor Steps:**
1. Go to Supabase Dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the entire contents of `server/schemas/comprehensive_db_schema.sql`
5. Paste into the editor
6. Click "Run" (or press Ctrl+Enter)
7. Wait for completion (should show "Success")

### **3.3 Verify Database Migration**

```sql
-- Run these queries in Supabase SQL Editor to verify:

-- Check if new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verify admin_requests table
SELECT COUNT(*) FROM admin_requests;

-- Verify stream_config table
SELECT COUNT(*) FROM stream_config;

-- Verify atomic balance function exists
SELECT proname FROM pg_proc WHERE proname = 'update_balance_atomic';

-- Check admin credentials
SELECT username, role FROM admin_credentials;
```

### **3.4 Migrate Existing Data (If Needed)**

If you have existing users and want to preserve their data:

```sql
-- Check existing users
SELECT COUNT(*), SUM(balance) as total_balance FROM users;

-- If you need to migrate from old schema to new schema:
-- (Only run if you have data to preserve)

-- Example: Update user roles to match new enum
UPDATE users 
SET role = 'player'::user_role 
WHERE role = 'player' AND role::text = 'player';

-- Example: Update user status to match new enum
UPDATE users 
SET status = 'active'::user_status 
WHERE status = 'active' AND status::text = 'active';
```

---

## 4. CODE DEPLOYMENT

### **4.1 Stop Current Application**

```bash
# If using PM2
pm2 stop all
pm2 list

# If using systemd
sudo systemctl stop your-app-name
sudo systemctl status your-app-name

# If running directly
pkill -f "node.*server"
ps aux | grep node  # Verify no node processes running
```

### **4.2 Pull Latest Code**

```bash
# Stash any local changes
git stash

# Pull latest changes
git pull origin main
# OR if you're on a different branch:
# git pull origin your-branch-name

# Verify new files exist
ls -la | grep -E "(AUTH_FIX|GAME_FIXES|COMPLETE_VPS)"

# Check what changed
git log --oneline -10
```

### **4.3 Clean Install Dependencies**

```bash
# Remove old dependencies
rm -rf node_modules package-lock.json

# Clean npm cache
npm cache clean --force

# Install fresh dependencies
npm install

# Verify installation
npm list --depth=0
```

---

## 5. ENVIRONMENT CONFIGURATION

### **5.1 Create New .env File**

```bash
# Create/edit .env file
nano .env
```

### **5.2 Required Environment Variables**

Copy and paste this template, then fill in your actual values:

```env
# ============================================
# SUPABASE DATABASE CONFIGURATION (REQUIRED)
# ============================================
# Get these from: Supabase Dashboard → Settings → API
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SUPABASE_SERVICE_KEY_HERE

# For client-side (same values)
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE

# ============================================
# JWT AUTHENTICATION (REQUIRED - CRITICAL!)
# ============================================
# Generate with: openssl rand -base64 32
JWT_SECRET=PASTE_YOUR_GENERATED_SECRET_HERE
JWT_EXPIRES_IN=24h

# ============================================
# SERVER CONFIGURATION
# ============================================
NODE_ENV=production
PORT=5000

# ============================================
# CORS CONFIGURATION
# ============================================
# Replace with your actual domain
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# ============================================
# CLIENT API CONFIGURATION
# ============================================
# Replace with your actual domain (without https://)
VITE_API_BASE_URL=yourdomain.com
VITE_WS_URL=wss://yourdomain.com/ws

# ============================================
# GAME SETTINGS (Optional - has defaults)
# ============================================
MIN_BET=1000
MAX_BET=100000
DEFAULT_BALANCE=100000.00
DEFAULT_TIMER_DURATION=30
HOUSE_COMMISSION=0.05

# ============================================
# NOT NEEDED (Removed in new version)
# ============================================
# SESSION_SECRET - NOT NEEDED (JWT-only auth)
# REDIS_URL - NOT NEEDED (JWT is stateless)
```

### **5.3 Generate JWT Secret**

```bash
# Generate a secure JWT secret
openssl rand -base64 32

# Copy the output and paste it as JWT_SECRET in .env
```

### **5.4 Get Supabase Credentials**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → Use as `SUPABASE_URL`
   - **anon public** key → Use as `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → Use as `SUPABASE_SERVICE_KEY`

### **5.5 Save and Verify .env**

```bash
# Save the file
# Press: Ctrl+X, then Y, then Enter

# Verify all required variables are set
cat .env | grep -E "(SUPABASE_URL|JWT_SECRET|NODE_ENV|PORT|ALLOWED_ORIGINS)"

# Check for any missing values
if grep -q "YOUR_" .env; then
  echo "⚠️  WARNING: You have placeholder values in .env!"
  grep "YOUR_" .env
else
  echo "✅ All placeholders replaced"
fi
```

---

## 6. BUILD & DEPLOY

### **6.1 Build Application**

```bash
# Build both client and server
npm run build

# This will:
# 1. Build the React client (Vite)
# 2. Bundle the Express server (esbuild)
# 3. Output to dist/ directory

# Verify build output
ls -la dist/
# Should see: index.js, public/, assets/, etc.
```

### **6.2 Test Build Locally (Optional)**

```bash
# Test the production build
NODE_ENV=production node dist/index.js

# In another terminal, test the endpoint
curl http://localhost:5000/api/health

# If successful, stop the test server (Ctrl+C)
```

### **6.3 Start Application**

#### **Option A: Using PM2 (Recommended)**

```bash
# If PM2 is not installed
npm install -g pm2

# Start the application
pm2 start dist/index.js --name andar-bahar

# OR if you have ecosystem.config.js
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the command it outputs

# Check status
pm2 status
pm2 logs andar-bahar --lines 50
```

#### **Option B: Using systemd**

```bash
# Create systemd service file
sudo nano /etc/systemd/system/andar-bahar.service
```

Paste this configuration:

```ini
[Unit]
Description=Andar Bahar Game Server
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/your/andar-bahar-app
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Save and enable the service
sudo systemctl daemon-reload
sudo systemctl enable andar-bahar
sudo systemctl start andar-bahar
sudo systemctl status andar-bahar
```

#### **Option C: Using nohup (Not Recommended)**

```bash
# Start in background
NODE_ENV=production nohup npm start > app.log 2>&1 &

# Check if running
ps aux | grep node
tail -f app.log
```

---

## 7. VERIFICATION & TESTING

### **7.1 Check Server Logs**

```bash
# PM2
pm2 logs andar-bahar --lines 100

# systemd
sudo journalctl -u andar-bahar -f

# Look for these SUCCESS messages:
# ✅ JWT Authentication enabled
# ✅ All required environment variables are set
# ✅ JWT-only authentication configured
# ✅ Database connected successfully
# ✅ WebSocket server initialized
# ✅ Server running on port 5000
```

### **7.2 Test API Endpoints**

```bash
# Test health check
curl http://localhost:5000/api/health

# Expected response:
# {"status":"ok","timestamp":"..."}

# Test registration (replace with test data)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9999999999",
    "password": "Test@123",
    "fullName": "Test User"
  }'

# Expected response:
# {"success":true,"user":{...},"token":"..."}

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9999999999",
    "password": "Test@123"
  }'

# Expected response:
# {"success":true,"user":{...},"token":"..."}
```

### **7.3 Test from Browser**

#### **Clear Browser Data First (CRITICAL!)**

```
1. Open your website in browser
2. Press F12 to open DevTools
3. Go to Application tab
4. Click "Storage" in left sidebar
5. Click "Clear site data"
6. Close DevTools
7. OR use Incognito/Private window
```

#### **Test Player Flow**

1. **Registration:**
   - Go to your domain
   - Click "Register" or go to `/register`
   - Fill in phone, password, full name
   - Submit
   - Should redirect to game page
   - Check console: "✅ Token stored successfully"

2. **Login:**
   - Go to login page
   - Enter credentials
   - Submit
   - Should redirect to game page
   - Check console: "✅ WebSocket connected successfully"

3. **Game Play:**
   - Wait for admin to start game
   - Place a bet
   - Balance should decrease
   - Game should proceed normally

#### **Test Admin Flow**

1. **Admin Login:**
   - Go to `/admin-login`
   - Username: `admin`
   - Password: `Admin@123` (from database schema)
   - Should redirect to admin panel

2. **Admin Functions:**
   - Start a new game
   - Select opening card
   - Timer should start
   - Deal cards (Bahar first, then Andar)
   - Game should complete and pay winners

3. **Admin Requests:**
   - Check "Admin Requests" tab
   - Should see deposit/withdrawal requests
   - Approve/reject should work

#### **Test WebSocket Connection**

```javascript
// Open browser console (F12) and check for:
✅ WebSocket connected successfully
✅ WebSocket authenticated
✅ Received game state update

// Should NOT see:
❌ WebSocket connection failed
❌ Authentication required
❌ Token expired
```

### **7.4 Test Database Functions**

```sql
-- Run in Supabase SQL Editor

-- Test atomic balance update
SELECT * FROM update_balance_atomic('test_user_id', -1000.00);

-- Check admin requests
SELECT * FROM admin_requests ORDER BY created_at DESC LIMIT 10;

-- Check game statistics
SELECT * FROM game_statistics ORDER BY created_at DESC LIMIT 5;

-- Verify stream config
SELECT * FROM stream_config;
```

---

## 8. TROUBLESHOOTING

### **Problem 1: Server Won't Start**

**Symptoms:**
- PM2 shows "errored" status
- Server crashes immediately
- No logs appearing

**Solutions:**

```bash
# Check logs for error details
pm2 logs andar-bahar --err --lines 100

# Common causes and fixes:

# 1. Missing JWT_SECRET
cat .env | grep JWT_SECRET
# If empty, generate and add:
openssl rand -base64 32

# 2. Missing Supabase credentials
cat .env | grep SUPABASE
# Verify both URL and SERVICE_KEY are set

# 3. Port already in use
sudo lsof -i :5000
# Kill the process using the port:
sudo kill -9 <PID>

# 4. Build failed
npm run build
# Check for errors in build output

# 5. Permissions issue
ls -la dist/
sudo chown -R $USER:$USER dist/
```

### **Problem 2: "Authentication Required" Errors**

**Symptoms:**
- Users get logged out immediately
- "Authentication required" in console
- Can't access game after login

**Solutions:**

```bash
# 1. Verify JWT_SECRET is set
cat .env | grep JWT_SECRET
# Should show a long random string, not empty

# 2. Restart server
pm2 restart andar-bahar
pm2 logs andar-bahar --lines 50

# 3. Clear browser data
# In browser: F12 → Application → Clear site data

# 4. Check token in localStorage
# In browser console:
localStorage.getItem('token')
# Should show a JWT token

# 5. Test login endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"test","password":"test"}'
# Should return token
```

### **Problem 3: CORS Errors**

**Symptoms:**
- "Access-Control-Allow-Origin" errors
- API requests blocked
- Can't connect from frontend

**Solutions:**

```bash
# 1. Check ALLOWED_ORIGINS in .env
cat .env | grep ALLOWED_ORIGINS

# 2. Add your domain
nano .env
# Add: ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# 3. Restart server
pm2 restart andar-bahar

# 4. Test from browser
# Open DevTools → Network tab
# Check if CORS headers are present in response
```

### **Problem 4: WebSocket Won't Connect**

**Symptoms:**
- "WebSocket connection failed"
- Real-time updates not working
- Game state not syncing

**Solutions:**

```bash
# 1. Check if HTTPS is enabled
# WebSocket Secure (wss://) requires HTTPS

# 2. Verify token is stored
# Browser console:
localStorage.getItem('token')

# 3. Check firewall rules
sudo ufw status
# Ensure ports 80, 443 are open

# 4. Check Nginx/Apache proxy config
# For Nginx:
sudo nano /etc/nginx/sites-available/your-site

# Add WebSocket proxy:
location /ws {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# Reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### **Problem 5: Database Connection Failed**

**Symptoms:**
- "Database connection error"
- "Supabase client error"
- Can't fetch data

**Solutions:**

```bash
# 1. Verify Supabase credentials
cat .env | grep SUPABASE

# 2. Test Supabase connection
curl -X GET "https://YOUR_PROJECT_ID.supabase.co/rest/v1/users?select=count" \
  -H "apikey: YOUR_SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_KEY"

# 3. Check Supabase project status
# Go to: https://app.supabase.com
# Verify project is active and not paused

# 4. Check database schema
# Run in Supabase SQL Editor:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

### **Problem 6: Build Errors**

**Symptoms:**
- `npm run build` fails
- TypeScript errors
- Missing dependencies

**Solutions:**

```bash
# 1. Clean install
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# 2. Check Node.js version
node --version
# Should be v18 or higher

# 3. Fix TypeScript errors
npm run check
# Fix any errors shown

# 4. Check for missing dependencies
npm install

# 5. Try building client and server separately
cd client && npm run build
cd .. && npm run build:server
```

---

## 9. ROLLBACK PROCEDURE

If something goes wrong and you need to rollback:

### **9.1 Rollback Application Code**

```bash
# Stop current application
pm2 stop andar-bahar

# Restore old .env
cp ~/backups/andar-bahar-YYYYMMDD-HHMMSS/.env.backup .env

# Revert to previous commit
git log --oneline -10
git reset --hard <previous-commit-hash>

# Reinstall dependencies
rm -rf node_modules
npm install

# Rebuild
npm run build

# Restart
pm2 start andar-bahar
pm2 logs andar-bahar
```

### **9.2 Rollback Database**

```bash
# Go to Supabase Dashboard
# 1. Navigate to: https://app.supabase.com
# 2. Select your project
# 3. Go to Database → Backups
# 4. Find the backup from before deployment
# 5. Click "Restore" on that backup
# 6. Wait for restoration to complete (5-10 minutes)
# 7. Verify data is restored
```

### **9.3 Verify Rollback**

```bash
# Check server is running
pm2 status

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"test","password":"test"}'

# Test in browser
# Clear cache and try logging in
```

---

## 10. POST-DEPLOYMENT CHECKLIST

After successful deployment, verify:

### **Security**
- [ ] JWT_SECRET is strong (32+ characters)
- [ ] SUPABASE_SERVICE_KEY is not exposed in client code
- [ ] .env file is not in Git repository
- [ ] HTTPS/SSL is enabled
- [ ] CORS only allows your domain
- [ ] Firewall is configured (only ports 80, 443, 22)

### **Functionality**
- [ ] Users can register
- [ ] Users can login
- [ ] Users stay logged in (no repeated prompts)
- [ ] WebSocket connects and stays connected
- [ ] Admin can start games
- [ ] Admin can deal cards
- [ ] Bets are placed successfully
- [ ] Winners are paid automatically
- [ ] Balance updates correctly

### **Monitoring**
- [ ] PM2 is monitoring the app
- [ ] Logs are being written
- [ ] Error notifications are set up
- [ ] Database backups are scheduled

### **Documentation**
- [ ] Admin credentials documented securely
- [ ] .env backed up safely
- [ ] Deployment date recorded
- [ ] Team notified of changes

---

## 11. MONITORING & MAINTENANCE

### **11.1 Setup Log Rotation**

```bash
# Install PM2 log rotation
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### **11.2 Monitor Application**

```bash
# Real-time monitoring
pm2 monit

# Check status
pm2 status

# View logs
pm2 logs andar-bahar --lines 100

# Error logs only
pm2 logs andar-bahar --err --lines 50
```

### **11.3 Setup Alerts**

```bash
# Install PM2 notification module
pm2 install pm2-slack
# OR
pm2 install pm2-discord

# Configure notifications
pm2 set pm2-slack:slack_url https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### **11.4 Regular Maintenance**

```bash
# Weekly: Check logs for errors
pm2 logs andar-bahar --err --lines 1000 | grep -i error

# Weekly: Check disk space
df -h

# Weekly: Check database size
# Run in Supabase SQL Editor:
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as db_size;

# Monthly: Update dependencies
npm outdated
npm update

# Monthly: Review and clean old logs
pm2 flush
```

---

## 12. SUCCESS CRITERIA

Your deployment is successful when:

### **Server Logs Show:**
```
✅ JWT Authentication enabled
✅ All required environment variables are set
✅ JWT-only authentication configured
✅ Database connected successfully
✅ WebSocket server initialized
✅ Server running on port 5000
```

### **Browser Console Shows:**
```
✅ Token stored successfully
✅ WebSocket connected successfully
✅ WebSocket authenticated
✅ Game state received
```

### **User Experience:**
- ✅ Can register new account
- ✅ Can login (player and admin)
- ✅ Stay logged in (no repeated prompts)
- ✅ Can place bets
- ✅ Balance updates correctly
- ✅ Game works smoothly
- ✅ Real-time updates work
- ✅ Admin panel functions properly

---

## 13. SUPPORT & RESOURCES

### **Documentation Files:**
- `AUTH_FIX_README.md` - Authentication fixes overview
- `AUTHENTICATION_FIX_GUIDE.md` - Detailed auth guide
- `GAME_FIXES.md` - Game functionality fixes
- `QUICK_START.md` - Quick deployment guide
- `VPS_DEPLOYMENT_STEPS.md` - Original VPS guide
- `DEPLOYMENT_CHECKLIST.md` - Deployment checklist

### **Database Schema:**
- `server/schemas/comprehensive_db_schema.sql` - Complete database schema
- `database-setup.sql` - Basic database setup

### **Scripts:**
- `setup-env.sh` - Automated environment setup
- `deploy-auth-fix.sh` - Deployment automation script

### **Test Commands:**

```bash
# Test authentication
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"test","password":"test"}'

# Test health
curl http://localhost:5000/api/health

# Test WebSocket (in browser console)
const ws = new WebSocket('ws://localhost:5000');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Message:', e.data);
```

---

## 🎉 CONGRATULATIONS!

If you've completed all steps and all tests pass, your Andar Bahar application is now successfully deployed with:

✅ **Fixed Authentication** - JWT-only, no more session issues  
✅ **Fixed Game Logic** - Proper card dealing, payouts, and state management  
✅ **Enhanced Database** - Complete schema with all features  
✅ **WebSocket Support** - Real-time game updates  
✅ **Admin Panel** - Full admin functionality  
✅ **Streaming Support** - RTMP and WebRTC streaming  
✅ **Security** - Proper CORS, JWT, and environment variables  

---

**Deployment Guide Version:** 2.0  
**Last Updated:** October 28, 2025  
**Compatibility:** Node.js 18+, Supabase, PM2/systemd  

---

## 📞 QUICK HELP

**Server won't start?** → Check logs: `pm2 logs andar-bahar --err`  
**Auth errors?** → Verify JWT_SECRET: `cat .env | grep JWT_SECRET`  
**CORS errors?** → Check ALLOWED_ORIGINS: `cat .env | grep ALLOWED_ORIGINS`  
**WebSocket issues?** → Check token: `localStorage.getItem('token')` in browser  
**Database errors?** → Verify Supabase credentials in .env  

**Still stuck?** Review the Troubleshooting section (#8) or check the documentation files listed above.
