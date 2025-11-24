# 🚀 VPS Deployment Guide - CRITICAL FIX

## ⚠️ PROBLEM IDENTIFIED

Your `.env` file was configured for **localhost** instead of your production domain **rajugarikossu.com**. This prevents the frontend from connecting to the backend on the VPS.

## ✅ FIXES APPLIED

### 1. Updated `.env` Configuration
Changed from:
```env
CORS_ORIGIN=http://localhost:5000
ALLOWED_ORIGINS=http://localhost:5000,http://localhost:3000,http://localhost:5173
WEBSOCKET_URL=wss://localhost:5000/ws
VITE_WS_URL=wss://localhost:5000/ws
```

To:
```env
CORS_ORIGIN=https://rajugarikossu.com
ALLOWED_ORIGINS=https://rajugarikossu.com,https://www.rajugarikossu.com
WEBSOCKET_URL=wss://rajugarikossu.com/ws
VITE_WS_URL=wss://rajugarikossu.com/ws
```

## 🔧 DEPLOYMENT STEPS ON VPS

### Step 1: Update .env on VPS
```bash
# SSH into your VPS
ssh root@your-vps-ip

# Navigate to project directory
cd /path/to/your/project

# Update the .env file with the corrected configuration
# Copy the updated .env from your local machine or edit manually
nano .env
```

Make sure your VPS `.env` has:
```env
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://rajugarikossu.com
ALLOWED_ORIGINS=https://rajugarikossu.com,https://www.rajugarikossu.com
WEBSOCKET_URL=wss://rajugarikossu.com/ws
VITE_API_BASE_URL=/api
VITE_WS_URL=wss://rajugarikossu.com/ws
```

### Step 2: Run Diagnostic Script
```bash
# Make diagnostic script executable
chmod +x scripts/diagnose-vps.sh

# Run diagnostic
./scripts/diagnose-vps.sh
```

This will check:
- ✅ Nginx status
- ✅ Node.js backend process
- ✅ Port 5000 (backend)
- ✅ Port 443 (HTTPS)
- ✅ Port 80 (HTTP)
- ✅ SSL certificates
- ✅ Nginx configuration
- ✅ Firewall status
- ✅ Application logs
- ✅ Domain DNS

### Step 3: Rebuild Application
```bash
# Install dependencies (if needed)
npm install

# Build the application with updated .env
npm run build

# This creates:
# - dist/index.js (backend)
# - dist/public/ (frontend)
```

### Step 4: Restart Services

#### Option A: Using PM2 (Recommended)
```bash
# Stop existing process
pm2 stop all

# Start with new build
pm2 start dist/index.js --name "reddy-anna"

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs
```

#### Option B: Using systemd service
```bash
sudo systemctl restart reddy-anna
sudo systemctl status reddy-anna
```

#### Option C: Direct node (not recommended for production)
```bash
# Kill existing process
pkill -f "node.*index.js"

# Start in background
nohup node dist/index.js > app.log 2>&1 &
```

### Step 5: Restart Nginx
```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Or restart if needed
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx
```

### Step 6: Verify Firewall
```bash
# Check firewall status
sudo ufw status

# Ensure required ports are open
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 5000/tcp  # Backend (if accessing directly)

# Reload firewall
sudo ufw reload
```

## 🧪 TESTING

### 1. Test Backend Locally on VPS
```bash
# Should return health status
curl http://127.0.0.1:5000/api/health

# Or test API
curl http://127.0.0.1:5000/api/settings
```

### 2. Test HTTPS Access
```bash
# From VPS
curl https://rajugarikossu.com

# From your local machine
curl https://rajugarikossu.com
```

### 3. Check WebSocket
Open browser console on https://rajugarikossu.com and check:
- Network tab for WebSocket connection
- Should connect to `wss://rajugarikossu.com/ws`

## 🔍 COMMON ISSUES & SOLUTIONS

### Issue 1: "CORS Error" in Browser
**Solution:** Ensure `.env` has correct `ALLOWED_ORIGINS`
```env
ALLOWED_ORIGINS=https://rajugarikossu.com,https://www.rajugarikossu.com
```
Then rebuild and restart.

### Issue 2: "WebSocket Connection Failed"
**Symptoms:** Console shows `WebSocket connection to 'wss://localhost:5000/ws' failed`

**Solution:** 
1. Check `.env` has `VITE_WS_URL=wss://rajugarikossu.com/ws`
2. Rebuild frontend: `npm run build`
3. Restart backend

### Issue 3: "502 Bad Gateway"
**Cause:** Backend not running or Nginx can't reach it

**Solution:**
```bash
# Check backend is running
curl http://127.0.0.1:5000/api/health

# If not running, start it
pm2 start dist/index.js

# Check Nginx error logs
sudo tail -50 /var/log/nginx/reddy-anna-error.log
```

### Issue 4: SSL Certificate Errors
**Solution:**
```bash
# Renew certificates
sudo certbot renew

# Or re-issue
sudo certbot --nginx -d rajugarikossu.com -d www.rajugarikossu.com

# Restart Nginx
sudo systemctl restart nginx
```

### Issue 5: Backend Not Starting
**Check logs:**
```bash
# PM2 logs
pm2 logs

# System logs
journalctl -u reddy-anna -n 50
```

**Common causes:**
- Missing environment variables
- Port 5000 already in use
- Database connection issues

## 📊 MONITORING

### Check Application Status
```bash
# Backend process
pm2 status
pm2 logs reddy-anna --lines 50

# Nginx status
sudo systemctl status nginx

# Port usage
sudo netstat -tulpn | grep -E "(80|443|5000)"
```

### View Logs
```bash
# Nginx access logs
sudo tail -f /var/log/nginx/reddy-anna-access.log

# Nginx error logs
sudo tail -f /var/log/nginx/reddy-anna-error.log

# Application logs (if using PM2)
pm2 logs reddy-anna
```

## 🎯 QUICK CHECKLIST

After deployment, verify:
- [ ] `.env` has production domain (not localhost)
- [ ] `npm run build` completed successfully
- [ ] Backend running on port 5000
- [ ] Nginx running and proxying to backend
- [ ] Port 443 (HTTPS) is listening
- [ ] SSL certificates are valid
- [ ] Firewall allows ports 80, 443
- [ ] Website loads at https://rajugarikossu.com
- [ ] WebSocket connects (check browser console)
- [ ] Can login and place bets
- [ ] Admin panel accessible

## 🚨 EMERGENCY ROLLBACK

If something breaks:
```bash
# Stop current version
pm2 stop all

# Restore previous working version
git checkout <previous-commit-hash>

# Rebuild
npm run build

# Restart
pm2 start dist/index.js
sudo systemctl restart nginx
```

## 📝 CONFIGURATION FILES

Your Nginx configuration is correct at:
`/etc/nginx/sites-available/reddy-anna-rajugarikossu.conf`

It should already be symlinked to:
`/etc/nginx/sites-enabled/reddy-anna-rajugarikossu.conf`

The config correctly:
- ✅ Redirects HTTP (80) → HTTPS (443)
- ✅ Proxies HTTPS to backend on 127.0.0.1:5000
- ✅ Handles WebSocket upgrades on /ws
- ✅ Serves HLS stream from /live/
- ✅ Uses SSL certificates from Let's Encrypt

## 🎉 SUCCESS INDICATORS

You'll know it's working when:
1. https://rajugarikossu.com loads the website
2. No CORS errors in browser console
3. WebSocket shows "Connected" status
4. You can login successfully
5. Real-time updates work (game state, bets)
6. Video stream plays

## 📞 SUPPORT

If issues persist after following this guide:
1. Run `./scripts/diagnose-vps.sh` and share output
2. Check browser console for specific errors
3. Share relevant logs from PM2 or Nginx