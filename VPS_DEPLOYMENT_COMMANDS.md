# 🚀 VPS Deployment - Quick Commands

## Current Issue: Vite Import Error

Your server is trying to import `vite` which shouldn't be in production. Here's the fix:

---

## ✅ Solution 1: Use tsx Instead of Bundled Code (RECOMMENDED)

This is the simplest and most reliable solution:

```bash
# On VPS - Stop current process
pm2 stop reddy-anna
pm2 delete reddy-anna

# Install ALL dependencies (including dev)
npm install

# Start with tsx (no bundling needed)
pm2 start server/index.ts --name reddy-anna --interpreter=tsx

# Save configuration
pm2 save

# Check status
pm2 status

# View logs
pm2 logs reddy-anna --lines 50
```

**Why this works:**
- No bundling = no import issues
- tsx handles TypeScript at runtime
- All dependencies are available

---

## ✅ Solution 2: Rebuild Locally and Redeploy

If you want to use the bundled version:

### On Local Machine:

```bash
# Pull latest code (with fixed build script)
git pull

# Rebuild
npm run build

# Create deployment package
tar -czf deployment.tar.gz dist/ package.json package-lock.json .env node_modules/

# Upload to VPS
scp deployment.tar.gz root@91.108.110.72:/root/reddy-anna/
```

### On VPS:

```bash
# Extract
cd /root/reddy-anna
tar -xzf deployment.tar.gz

# Stop old process
pm2 stop reddy-anna
pm2 delete reddy-anna

# Start new process
pm2 start dist/index.js --name reddy-anna

# Save
pm2 save

# Check logs
pm2 logs reddy-anna
```

---

## ✅ Solution 3: Fix on VPS Directly

```bash
# On VPS
cd /root/reddy-anna

# Stop process
pm2 stop reddy-anna
pm2 delete reddy-anna

# Install ALL dependencies
npm install

# Rebuild server with proper externals
node scripts/build-server.js

# If build-server.js doesn't exist, use this:
npx esbuild server/index.ts \
  --bundle \
  --platform=node \
  --format=esm \
  --outdir=dist \
  --external:vite \
  --external:express \
  --external:ws \
  --external:bcrypt \
  --external:jsonwebtoken \
  --external:@supabase/supabase-js \
  --external:cors \
  --external:helmet \
  --external:express-rate-limit \
  --external:express-session \
  --external:passport \
  --external:passport-local \
  --external:redis \
  --external:drizzle-orm \
  --external:postgres

# Start server
pm2 start dist/index.js --name reddy-anna

# Save
pm2 save

# Check logs
pm2 logs reddy-anna
```

---

## 🔍 Verify Deployment

```bash
# Check PM2 status
pm2 status

# View logs (real-time)
pm2 logs reddy-anna

# View last 50 lines
pm2 logs reddy-anna --lines 50

# Check if server is listening
netstat -tulpn | grep 5000

# Test endpoint
curl http://localhost:5000/api/health

# Or from browser
# http://91.108.110.72:5000
```

---

## 🐛 If Still Not Working

### Check for Import Issues

```bash
# View the built file to see what's being imported
head -50 dist/index.js

# Look for any import statements that shouldn't be there
grep "import.*vite" dist/index.js
```

### Use Unbundled Version (Safest)

```bash
pm2 stop reddy-anna
pm2 delete reddy-anna

# Install tsx globally if not already
npm install -g tsx

# Start directly from source
pm2 start server/index.ts --name reddy-anna --interpreter=tsx

pm2 save
pm2 logs reddy-anna
```

---

## 📊 Monitor Application

```bash
# Real-time monitoring
pm2 monit

# Resource usage
pm2 status

# Logs
pm2 logs reddy-anna

# Restart if needed
pm2 restart reddy-anna

# Reload (zero-downtime)
pm2 reload reddy-anna
```

---

## ✅ Recommended Approach

**Use Solution 1 (tsx interpreter)** - It's the most reliable:

```bash
pm2 stop all
pm2 delete all
npm install
pm2 start server/index.ts --name reddy-anna --interpreter=tsx
pm2 save
pm2 logs reddy-anna
```

This avoids all bundling issues and works perfectly in production.

---

## 🔧 Environment Variables Check

Make sure your `.env` file has:

```bash
NODE_ENV=production
PORT=5000
SUPABASE_URL=your-url
SUPABASE_SERVICE_KEY=your-key
JWT_SECRET=your-secret
SESSION_SECRET=your-secret
ALLOWED_ORIGINS=http://91.108.110.72:5000
REDIS_URL=redis://localhost:6379
```

---

## 📞 Quick Reference

```bash
# Start
pm2 start server/index.ts --name reddy-anna --interpreter=tsx

# Stop
pm2 stop reddy-anna

# Restart
pm2 restart reddy-anna

# Logs
pm2 logs reddy-anna

# Status
pm2 status

# Save config
pm2 save
```

---

**🎯 RECOMMENDED: Use tsx interpreter (Solution 1) - it's the simplest and most reliable!**
