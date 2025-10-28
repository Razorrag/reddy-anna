# 🔧 VPS TROUBLESHOOTING GUIDE
## Solutions for Common Deployment Issues

---

## 📋 TABLE OF CONTENTS

1. [Server Issues](#1-server-issues)
2. [Authentication Issues](#2-authentication-issues)
3. [Database Issues](#3-database-issues)
4. [WebSocket Issues](#4-websocket-issues)
5. [CORS Issues](#5-cors-issues)
6. [Build Issues](#6-build-issues)
7. [Performance Issues](#7-performance-issues)
8. [Network Issues](#8-network-issues)

---

## 1. SERVER ISSUES

### ❌ **Problem: Server Won't Start**

**Symptoms:**
```
PM2 shows "errored" status
Server crashes immediately after start
No logs appearing
```

**Diagnosis:**
```bash
# Check error logs
pm2 logs andar-bahar --err --lines 100

# Check if port is in use
sudo lsof -i :5000

# Check environment variables
cat .env | grep -E "(JWT_SECRET|SUPABASE_URL|NODE_ENV)"

# Check file permissions
ls -la dist/
```

**Solutions:**

#### **Solution 1: Missing JWT_SECRET**
```bash
# Generate JWT secret
openssl rand -base64 32

# Add to .env
nano .env
# Add: JWT_SECRET=<generated-secret>

# Restart
pm2 restart andar-bahar
```

#### **Solution 2: Port Already in Use**
```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill the process
sudo kill -9 <PID>

# Or change port in .env
nano .env
# Change: PORT=5001

# Restart
pm2 restart andar-bahar
```

#### **Solution 3: Missing Dependencies**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Rebuild
npm run build

# Restart
pm2 restart andar-bahar
```

#### **Solution 4: Permissions Issue**
```bash
# Fix ownership
sudo chown -R $USER:$USER .
sudo chown -R $USER:$USER dist/

# Fix permissions
chmod -R 755 dist/

# Restart
pm2 restart andar-bahar
```

---

### ❌ **Problem: Server Keeps Crashing**

**Symptoms:**
```
Server starts but crashes after few seconds
PM2 shows restart count increasing
Memory errors in logs
```

**Diagnosis:**
```bash
# Check PM2 status
pm2 status

# Check memory usage
free -h
pm2 monit

# Check error logs
pm2 logs andar-bahar --err --lines 200
```

**Solutions:**

#### **Solution 1: Memory Leak**
```bash
# Increase memory limit
pm2 delete andar-bahar
pm2 start dist/index.js --name andar-bahar --max-memory-restart 500M

# Save configuration
pm2 save
```

#### **Solution 2: Uncaught Exceptions**
```bash
# Check logs for errors
pm2 logs andar-bahar --err --lines 500 | grep -i "error"

# Common fixes:
# - Missing environment variables
# - Database connection issues
# - Invalid configuration
```

#### **Solution 3: Database Connection Timeout**
```bash
# Test Supabase connection
curl -X GET "https://YOUR_PROJECT.supabase.co/rest/v1/users?select=count" \
  -H "apikey: YOUR_SERVICE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_KEY"

# If fails, check Supabase status
# Go to: https://status.supabase.com
```

---

## 2. AUTHENTICATION ISSUES

### ❌ **Problem: Users Get Logged Out Immediately**

**Symptoms:**
```
Login successful but redirects back to login
"Authentication required" errors
Token not persisting
```

**Diagnosis:**
```bash
# Check JWT_SECRET is set
cat .env | grep JWT_SECRET

# Check server logs
pm2 logs andar-bahar | grep -i "jwt\|auth"

# In browser console:
localStorage.getItem('token')
```

**Solutions:**

#### **Solution 1: JWT_SECRET Not Set or Changed**
```bash
# Verify JWT_SECRET exists and is not empty
cat .env | grep JWT_SECRET

# If empty or missing, generate new one
openssl rand -base64 32

# Add to .env
nano .env
JWT_SECRET=<generated-secret>

# IMPORTANT: Restart server
pm2 restart andar-bahar

# Clear browser storage
# In browser: localStorage.clear()
```

#### **Solution 2: Token Expiration Too Short**
```bash
# Check JWT_EXPIRES_IN
cat .env | grep JWT_EXPIRES_IN

# Set to 24 hours
nano .env
JWT_EXPIRES_IN=24h

# Restart
pm2 restart andar-bahar
```

#### **Solution 3: CORS Blocking Cookies/Headers**
```bash
# Check ALLOWED_ORIGINS
cat .env | grep ALLOWED_ORIGINS

# Must include your domain
nano .env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Restart
pm2 restart andar-bahar
```

---

### ❌ **Problem: "Invalid Token" Errors**

**Symptoms:**
```
"Invalid token" in console
"jwt malformed" errors
WebSocket authentication fails
```

**Diagnosis:**
```bash
# Check server logs
pm2 logs andar-bahar | grep -i "invalid\|jwt"

# Test login endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"test","password":"test"}'

# Check token format in browser
# Should be: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Solutions:**

#### **Solution 1: Token Corruption**
```bash
# Clear all tokens
# In browser console:
localStorage.clear()
sessionStorage.clear()

# Try login again
```

#### **Solution 2: JWT_SECRET Mismatch**
```bash
# This happens if JWT_SECRET changed after tokens were issued
# Solution: Clear all user tokens and re-login

# In browser:
localStorage.clear()

# Users must login again
```

---

## 3. DATABASE ISSUES

### ❌ **Problem: Database Connection Failed**

**Symptoms:**
```
"Database connection error"
"Supabase client error"
Can't fetch data
```

**Diagnosis:**
```bash
# Check Supabase credentials
cat .env | grep SUPABASE

# Test connection
curl -X GET "https://YOUR_PROJECT.supabase.co/rest/v1/" \
  -H "apikey: YOUR_SERVICE_KEY"
```

**Solutions:**

#### **Solution 1: Wrong Credentials**
```bash
# Get correct credentials from Supabase
# Go to: https://app.supabase.com → Your Project → Settings → API

# Update .env
nano .env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=YOUR_CORRECT_KEY

# Restart
pm2 restart andar-bahar
```

#### **Solution 2: Supabase Project Paused**
```bash
# Check project status
# Go to: https://app.supabase.com → Your Project

# If paused, click "Restore Project"
# Wait 2-3 minutes for restoration
```

#### **Solution 3: Network/Firewall Blocking**
```bash
# Test connectivity
ping YOUR_PROJECT.supabase.co

# Check firewall
sudo ufw status

# Allow outbound HTTPS
sudo ufw allow out 443/tcp
```

---

### ❌ **Problem: Missing Tables or Functions**

**Symptoms:**
```
"relation does not exist" errors
"function does not exist" errors
Data not saving
```

**Diagnosis:**
```sql
-- Run in Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check for functions
SELECT proname FROM pg_proc 
WHERE proname LIKE '%balance%';
```

**Solutions:**

#### **Solution 1: Run Database Migration**
```bash
# Go to Supabase SQL Editor
# Copy entire contents of: server/schemas/comprehensive_db_schema.sql
# Paste and Run

# Verify tables created
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
```

#### **Solution 2: Row Level Security Blocking**
```sql
-- Disable RLS for development
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE player_bets DISABLE ROW LEVEL SECURITY;
-- Repeat for all tables
```

---

## 4. WEBSOCKET ISSUES

### ❌ **Problem: WebSocket Won't Connect**

**Symptoms:**
```
"WebSocket connection failed"
Real-time updates not working
Game state not syncing
```

**Diagnosis:**
```bash
# Check server logs
pm2 logs andar-bahar | grep -i "websocket\|ws"

# In browser console:
const ws = new WebSocket('ws://localhost:5000');
ws.onopen = () => console.log('Connected');
ws.onerror = (e) => console.error('Error:', e);

# Check if token exists
localStorage.getItem('token')
```

**Solutions:**

#### **Solution 1: HTTPS/WSS Mismatch**
```bash
# If using HTTPS, must use WSS (not WS)
nano client/.env.production
VITE_WS_URL=wss://yourdomain.com/ws  # Not ws://

# Rebuild client
cd client && npm run build
```

#### **Solution 2: Nginx Not Configured for WebSocket**
```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/your-site

# Add WebSocket proxy
location /ws {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

#### **Solution 3: Firewall Blocking WebSocket**
```bash
# Check firewall
sudo ufw status

# Allow WebSocket port
sudo ufw allow 5000/tcp

# Or if using Nginx proxy
sudo ufw allow 'Nginx Full'
```

#### **Solution 4: Missing or Invalid Token**
```bash
# In browser console:
const token = localStorage.getItem('token');
console.log('Token:', token);

# If null or undefined, login again
# If exists but WebSocket fails, token might be expired
localStorage.clear();
# Login again
```

---

## 5. CORS ISSUES

### ❌ **Problem: CORS Errors in Browser**

**Symptoms:**
```
"Access-Control-Allow-Origin" errors
"CORS policy blocked" messages
API requests fail from frontend
```

**Diagnosis:**
```bash
# Check ALLOWED_ORIGINS
cat .env | grep ALLOWED_ORIGINS

# Check server logs
pm2 logs andar-bahar | grep -i "cors"

# In browser DevTools → Network tab
# Check response headers for Access-Control-Allow-Origin
```

**Solutions:**

#### **Solution 1: Domain Not in ALLOWED_ORIGINS**
```bash
# Add your domain
nano .env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,http://localhost:5173

# Restart
pm2 restart andar-bahar
```

#### **Solution 2: Protocol Mismatch**
```bash
# If frontend uses HTTPS, backend must too
# Or add both HTTP and HTTPS to ALLOWED_ORIGINS
nano .env
ALLOWED_ORIGINS=http://yourdomain.com,https://yourdomain.com

# Restart
pm2 restart andar-bahar
```

#### **Solution 3: Nginx Stripping CORS Headers**
```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/your-site

# Add CORS headers
location /api {
    proxy_pass http://localhost:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    
    # Don't add CORS here if backend handles it
    # Just proxy the headers through
    proxy_pass_header Access-Control-Allow-Origin;
}

# Reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. BUILD ISSUES

### ❌ **Problem: Build Fails**

**Symptoms:**
```
npm run build fails
TypeScript errors
Module not found errors
```

**Diagnosis:**
```bash
# Try building
npm run build

# Check Node version
node --version  # Should be v18+

# Check for TypeScript errors
npm run check
```

**Solutions:**

#### **Solution 1: Clean Install**
```bash
# Remove everything
rm -rf node_modules package-lock.json
rm -rf client/node_modules client/package-lock.json

# Clean cache
npm cache clean --force

# Reinstall
npm install
cd client && npm install && cd ..

# Rebuild
npm run build
```

#### **Solution 2: TypeScript Errors**
```bash
# Check for errors
npm run check

# Common fixes:
# - Update tsconfig.json
# - Fix type imports
# - Install missing @types packages

# Install missing types
npm install --save-dev @types/node @types/express @types/ws
```

#### **Solution 3: Memory Issues During Build**
```bash
# Increase Node memory
export NODE_OPTIONS="--max-old-space-size=4096"

# Build
npm run build

# Or build separately
cd client && npm run build
cd .. && npm run build:server
```

---

## 7. PERFORMANCE ISSUES

### ❌ **Problem: Slow Response Times**

**Symptoms:**
```
API requests take >2 seconds
Page loads slowly
WebSocket lag
```

**Diagnosis:**
```bash
# Check server load
top
htop

# Check memory
free -h

# Check PM2 metrics
pm2 monit

# Check database queries
# Run in Supabase SQL Editor:
SELECT * FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 10;
```

**Solutions:**

#### **Solution 1: Insufficient Resources**
```bash
# Check VPS resources
df -h  # Disk space
free -h  # Memory
top  # CPU usage

# Upgrade VPS if needed
# Or optimize code/queries
```

#### **Solution 2: Database Query Optimization**
```sql
-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_player_bets_user_game 
ON player_bets(user_id, game_id);

CREATE INDEX IF NOT EXISTS idx_user_transactions_user_date 
ON user_transactions(user_id, created_at DESC);
```

#### **Solution 3: Enable Compression**
```bash
# Edit Nginx config
sudo nano /etc/nginx/nginx.conf

# Add in http block:
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript 
           application/json application/javascript application/xml+rss;

# Reload
sudo systemctl reload nginx
```

---

## 8. NETWORK ISSUES

### ❌ **Problem: Can't Access Site**

**Symptoms:**
```
Site not loading
Connection timeout
DNS errors
```

**Diagnosis:**
```bash
# Check if server is running
pm2 status

# Check if port is listening
sudo netstat -tulpn | grep :5000

# Check firewall
sudo ufw status

# Test locally
curl http://localhost:5000/api/health

# Test DNS
nslookup yourdomain.com
```

**Solutions:**

#### **Solution 1: Firewall Blocking**
```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (don't lock yourself out!)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

#### **Solution 2: Nginx Not Running**
```bash
# Check Nginx status
sudo systemctl status nginx

# Start if stopped
sudo systemctl start nginx

# Enable on boot
sudo systemctl enable nginx
```

#### **Solution 3: SSL Certificate Issues**
```bash
# Check certificate
sudo certbot certificates

# Renew if expired
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

---

## 🆘 EMERGENCY PROCEDURES

### **Complete System Reset**

```bash
# 1. Stop everything
pm2 stop all
sudo systemctl stop nginx

# 2. Backup
cp .env .env.emergency.backup
tar -czf ~/emergency-backup.tar.gz .

# 3. Clean slate
rm -rf node_modules dist
git reset --hard HEAD

# 4. Fresh start
npm install
npm run build

# 5. Restart
pm2 restart all
sudo systemctl start nginx
```

### **Quick Diagnostics Script**

```bash
#!/bin/bash
echo "=== System Diagnostics ==="
echo "Node version: $(node --version)"
echo "PM2 status:"
pm2 status
echo "Disk space:"
df -h | grep -E "/$|/var"
echo "Memory:"
free -h
echo "Port 5000:"
sudo lsof -i :5000
echo "Environment:"
cat .env | grep -E "(JWT_SECRET|SUPABASE_URL|NODE_ENV)" | sed 's/=.*/=***/'
echo "Recent errors:"
pm2 logs andar-bahar --err --lines 10 --nostream
```

---

## 📞 GETTING HELP

### **Collect This Information:**

```bash
# 1. System info
uname -a
node --version
npm --version

# 2. PM2 status
pm2 status
pm2 logs andar-bahar --lines 50 --nostream

# 3. Environment (sanitized)
cat .env | grep -v "SECRET\|KEY" | grep -v "^#"

# 4. Recent errors
pm2 logs andar-bahar --err --lines 100 --nostream

# 5. Network status
curl -I http://localhost:5000/api/health
```

### **Documentation References:**
- `COMPLETE_VPS_DEPLOYMENT_GUIDE.md` - Full deployment guide
- `DEPLOYMENT_QUICK_CHECKLIST.md` - Quick checklist
- `AUTH_FIX_README.md` - Authentication fixes
- `GAME_FIXES.md` - Game functionality fixes

---

**Troubleshooting Guide Version:** 1.0  
**Last Updated:** October 28, 2025  
**Coverage:** Common VPS deployment issues
