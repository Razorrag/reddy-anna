# 🔄 Restart VPS with New Changes

## Step 1: Push Your Changes to Git (If Using Git)

```bash
# On local machine
git add .
git commit -m "Applied login fixes and database updates"
git push origin main
```

---

## Step 2: Connect to Your VPS

```bash
ssh root@91.108.110.72
```

---

## Step 3: Navigate to Project Directory

```bash
cd /root/reddy-anna
```

---

## Step 4: Pull Latest Changes (If Using Git)

```bash
git pull origin main
```

**OR** If you're not using Git, upload your files:

```bash
# On local machine - create a deployment package
tar -czf deployment.tar.gz \
  server/ \
  shared/ \
  client/dist/ \
  package.json \
  package-lock.json \
  .env \
  ecosystem.config.js \
  scripts/

# Upload to VPS
scp deployment.tar.gz root@91.108.110.72:/root/reddy-anna/

# On VPS - extract
cd /root/reddy-anna
tar -xzf deployment.tar.gz
```

---

## Step 5: Apply Database Changes

If you have SQL changes (like in `QUICK_FIX_LOGIN.sql`):

```bash
# Connect to your database and run the SQL file
# If using Supabase, you can run this through their SQL editor
# Or if you have direct PostgreSQL access:
psql -h your-db-host -U your-db-user -d your-db-name -f QUICK_FIX_LOGIN.sql
```

**OR** Apply via Supabase Dashboard:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Copy and paste the contents of `QUICK_FIX_LOGIN.sql`
5. Click "Run"

---

## Step 6: Install/Update Dependencies

```bash
# Install any new dependencies
npm install
```

---

## Step 7: Rebuild the Application

```bash
# Build the server
npm run build:server

# If you also need to rebuild the client
npm run build:client
```

---

## Step 8: Restart PM2 Process

### Option A: Reload (Zero Downtime - Recommended)

```bash
pm2 reload reddy-anna
```

### Option B: Restart (Brief Downtime)

```bash
pm2 restart reddy-anna
```

### Option C: Full Stop and Start (If having issues)

```bash
# Stop the current process
pm2 stop reddy-anna
pm2 delete reddy-anna

# Start fresh
pm2 start server/index.ts --name reddy-anna --interpreter=tsx

# OR if using built version
pm2 start dist/index.js --name reddy-anna

# Save the configuration
pm2 save
```

---

## Step 9: Verify Deployment

```bash
# Check PM2 status
pm2 status

# View logs in real-time
pm2 logs reddy-anna

# View last 50 lines of logs
pm2 logs reddy-anna --lines 50

# Check if server is responding
curl http://localhost:5000/api/health

# Check from outside
curl http://91.108.110.72:5000/api/health
```

---

## Step 10: Monitor Application

```bash
# Real-time monitoring dashboard
pm2 monit

# Check resource usage
pm2 status

# View error logs only
pm2 logs reddy-anna --err

# View output logs only
pm2 logs reddy-anna --out
```

---

## 🚨 Troubleshooting

### If Server Won't Start

```bash
# Check for port conflicts
netstat -tulpn | grep 5000

# Kill any process using port 5000
kill -9 $(lsof -t -i:5000)

# Check environment variables
cat .env

# Verify Node version
node --version  # Should be 18 or higher

# Check for syntax errors
npm run check
```

### If Database Connection Fails

```bash
# Verify Supabase credentials in .env
cat .env | grep SUPABASE

# Test database connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
supabase.from('users').select('count').then(console.log);
"
```

### If Getting Import Errors

```bash
# Use tsx interpreter instead of built version
pm2 stop reddy-anna
pm2 delete reddy-anna
pm2 start server/index.ts --name reddy-anna --interpreter=tsx
pm2 save
```

---

## 📋 Quick Reference Commands

```bash
# View logs
pm2 logs reddy-anna

# Restart
pm2 restart reddy-anna

# Reload (zero downtime)
pm2 reload reddy-anna

# Stop
pm2 stop reddy-anna

# Start
pm2 start reddy-anna

# Status
pm2 status

# Monitor
pm2 monit

# Save configuration
pm2 save

# View PM2 startup script
pm2 startup
```

---

## 🎯 Complete Restart Script (Copy-Paste Ready)

```bash
# Complete restart with all steps
cd /root/reddy-anna && \
git pull origin main && \
npm install && \
npm run build:server && \
pm2 reload reddy-anna && \
pm2 logs reddy-anna --lines 20
```

---

## ✅ Success Indicators

Your deployment is successful when you see:

1. ✅ PM2 status shows "online"
2. ✅ No errors in `pm2 logs`
3. ✅ Server responds to health check: `curl http://localhost:5000/api/health`
4. ✅ Application accessible from browser: `http://91.108.110.72:5000`

---

## 🔐 Environment Variables Checklist

Make sure your `.env` file on VPS has:

```bash
NODE_ENV=production
PORT=5000
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
ALLOWED_ORIGINS=http://91.108.110.72:5000,http://91.108.110.72
REDIS_URL=redis://localhost:6379
```

---

## 📞 Need Help?

If you encounter issues:

1. Check logs: `pm2 logs reddy-anna --lines 100`
2. Check PM2 status: `pm2 status`
3. Check server is listening: `netstat -tulpn | grep 5000`
4. Check environment: `cat .env`
5. Restart fresh: `pm2 delete reddy-anna && pm2 start server/index.ts --name reddy-anna --interpreter=tsx`

---

**🎯 RECOMMENDED: Use the "Complete Restart Script" above for fastest deployment!**
