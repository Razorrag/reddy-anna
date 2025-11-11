# Complete VPS Deployment Guide - Andar Bahar Game

**Domain:** rajugarikossu.com  
**VPS IP:** 72.61.170.227  
**User:** root  
**OS:** Ubuntu 20.04/22.04  
**Tech Stack:** Node.js + Express + React (Vite) + Supabase + PM2 + Nginx + Let's Encrypt

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 0: SSH into VPS](#step-0-ssh-into-vps)
3. [Step 1: Install Runtime Dependencies](#step-1-install-runtime-dependencies)
4. [Step 2: Clone Project to VPS](#step-2-clone-project-to-vps)
5. [Step 3: Create Production Environment File](#step-3-create-production-environment-file)
6. [Step 4: Install Dependencies and Build](#step-4-install-dependencies-and-build)
7. [Step 5: Start Server with PM2](#step-5-start-server-with-pm2)
8. [Step 6: Configure Nginx Reverse Proxy](#step-6-configure-nginx-reverse-proxy)
9. [Step 7: Namecheap DNS Setup](#step-7-namecheap-dns-setup)
10. [Step 8: Enable HTTPS with Let's Encrypt](#step-8-enable-https-with-lets-encrypt)
11. [Step 9: Verification Checklist](#step-9-verification-checklist)
12. [Step 10: Troubleshooting](#step-10-troubleshooting)
13. [Step 11: Maintenance Commands](#step-11-maintenance-commands)

---

## Prerequisites

Before starting, ensure you have:

- ✅ VPS access credentials (root@72.61.170.227)
- ✅ Domain registered on Namecheap (rajugarikossu.com)
- ✅ Supabase project with URL and keys (from `client/.env.production`)
- ✅ GitHub repository access (or project files ready to upload)
- ✅ SSH client installed on your local machine

---

## Step 0: SSH into VPS

Open your terminal (Windows PowerShell, macOS Terminal, or Linux shell) and connect:

```bash
ssh root@72.61.170.227
```

**Enter password when prompted.**

> **All commands below run inside this SSH session as root.**

---

## Step 1: Install Runtime Dependencies

Copy and paste this entire block into your SSH session:

```bash
# Update system packages
apt update && apt upgrade -y

# Install Node.js 20 LTS (recommended for production)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify Node.js installation
node -v  # Should show v20.x.x
npm -v   # Should show 10.x.x

# Install build tools (required for native dependencies)
apt install -y build-essential

# Install PM2 globally (process manager for Node.js)
npm install -g pm2

# Verify PM2 installation
pm2 -v

# Install Nginx (reverse proxy and web server)
apt install -y nginx

# Install Certbot for SSL certificates
apt install -y certbot python3-certbot-nginx

# Install Git (if not already installed)
apt install -y git

# Optional: Install htop for monitoring
apt install -y htop
```

**Expected output:**
- Node.js v20.x.x installed
- npm 10.x.x installed
- PM2 installed globally
- Nginx installed and running
- Certbot installed

---

## Step 2: Clone Project to VPS

### Option A: Clone from GitHub (Recommended)

```bash
# Create web directory
mkdir -p /var/www
cd /var/www

# Clone your repository (replace with your actual GitHub URL)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git andar-bahar

# Navigate to project
cd /var/www/andar-bahar

# Verify files
ls -la
```

### Option B: Upload Files Manually

If you don't have GitHub access:

```bash
# On your LOCAL machine (not VPS):
# 1. Zip your project folder
# 2. Upload using SCP:
scp andar-bahar.zip root@72.61.170.227:/var/www/

# Back on VPS:
cd /var/www
apt install -y unzip
unzip andar-bahar.zip
mv andar-bahar-main andar-bahar  # Adjust folder name if needed
cd andar-bahar
```

---

## Step 3: Create Production Environment File

### 3.1: Get Your Supabase Service Key

**CRITICAL:** You need your Supabase **service_role** key (NOT the anon key).

1. Go to: https://supabase.com/dashboard
2. Select your project: `vtnlaofpaovkmeqiidaw`
3. Click **Settings** → **API**
4. Copy the **service_role** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
5. **Keep this secret!** Never expose it to frontend.

### 3.2: Generate JWT Secret

Run this command to generate a secure JWT secret:

```bash
openssl rand -base64 32
```

**Copy the output** (e.g., `A7x9K2mP5qR8sT1vW4yZ6bC3dF0gH9jL2nM5pQ8rS1t=`)

### 3.3: Create .env File

Now create the production environment file:

```bash
cat > /var/www/andar-bahar/.env <<"EOF"
# ============================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# ============================================

# Core Environment
NODE_ENV=production
PORT=5000

# Domain Configuration
CORS_ORIGIN=https://rajugarikossu.com
ALLOWED_ORIGINS=https://rajugarikossu.com
WEBSOCKET_URL=wss://rajugarikossu.com/ws

# Supabase Configuration (from existing project)
SUPABASE_URL=https://vtnlaofpaovkmeqiidaw.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0bmxhb2ZwYW92a21lcWlpZGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTc3MDMsImV4cCI6MjA3NjU3MzcwM30.9g1BlGxuxt_EkSFnM4h51mOUvhAWAEBywMZqqk7Zpiw

# CRITICAL: Paste your Supabase service_role key here
SUPABASE_SERVICE_KEY=PASTE_YOUR_SERVICE_ROLE_KEY_HERE

# JWT Configuration (paste the generated secret from openssl command)
JWT_SECRET=PASTE_YOUR_GENERATED_JWT_SECRET_HERE
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Game Configuration
MIN_BET=1000
MAX_BET=100000
DEFAULT_BALANCE=0.00
DEFAULT_TIMER_DURATION=30
HOUSE_COMMISSION=0.05

# Payment Configuration
MIN_DEPOSIT=100
MAX_DEPOSIT=1000000
MIN_WITHDRAWAL=500
MAX_WITHDRAWAL=500000

# HTTPS Configuration (Nginx handles SSL, not Node)
HTTPS_ENABLED=false
HTTP_TO_HTTPS_REDIRECT=false

# Vite Build-Time Variables (for frontend build)
VITE_SUPABASE_URL=https://vtnlaofpaovkmeqiidaw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0bmxhb2ZwYW92a21lcWlpZGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTc3MDMsImV4cCI6MjA3NjU3MzcwM30.9g1BlGxuxt_EkSFnM4h51mOUvhAWAEBywMZqqk7Zpiw
VITE_API_BASE_URL=https://rajugarikossu.com
VITE_WS_URL=wss://rajugarikossu.com/ws
EOF
```

### 3.4: Edit .env File

Now you MUST edit the file to add your actual secrets:

```bash
nano /var/www/andar-bahar/.env
```

**Replace these two lines:**

1. Find: `SUPABASE_SERVICE_KEY=PASTE_YOUR_SERVICE_ROLE_KEY_HERE`  
   Replace with: `SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your actual service key)

2. Find: `JWT_SECRET=PASTE_YOUR_GENERATED_JWT_SECRET_HERE`  
   Replace with: `JWT_SECRET=A7x9K2mP5qR8sT1vW4yZ6bC3dF0gH9jL2nM5pQ8rS1t=` (your generated secret)

**Save and exit:**
- Press `Ctrl + O` (save)
- Press `Enter` (confirm)
- Press `Ctrl + X` (exit)

### 3.5: Secure the .env File

```bash
# Make .env readable only by owner (root)
chmod 600 /var/www/andar-bahar/.env

# Verify permissions
ls -la /var/www/andar-bahar/.env
# Should show: -rw------- 1 root root
```

---

## Step 4: Install Dependencies and Build

### 4.1: Install Root Dependencies

```bash
cd /var/www/andar-bahar

# Install all dependencies
npm install

# This may take 2-5 minutes
```

### 4.2: Build the Project

```bash
# Build both server and client
npm run build

# If the above fails, try building separately:
# Build client first
cd client
npm install
npm run build
cd ..

# Build server
npm run build:server
```

### 4.3: Verify Build Output

```bash
# Check if build succeeded
ls -la dist/
ls -la client/dist/

# You should see:
# - dist/server/ (compiled TypeScript server)
# - client/dist/ (built React app)
```

### 4.4: Copy Client Build to Dist Public Directory

```bash
# IMPORTANT: Copy to dist/public (not server/public)
# The compiled server looks for files in dist/public/
mkdir -p dist/public

# Copy client build to dist/public folder
cp -r client/dist/* dist/public/

# Verify
ls -la dist/public/
# Should see: index.html, assets/, cards/, coins/, hero-images/
```

---

## Step 5: Start Server with PM2

### 5.1: Start the Application

```bash
cd /var/www/andar-bahar

# Start with PM2 (esbuild outputs to dist/index.js, not dist/server/index.js)
pm2 start dist/index.js --name "andar-bahar" --time

# Note: If your build creates dist/server/index.js instead, use:
# pm2 start dist/server/index.js --name "andar-bahar" --time
```

### 5.2: Verify Server is Running

```bash
# Check PM2 status
pm2 status

# Should show:
# ┌─────┬──────────────┬─────────────┬─────────┬─────────┬──────────┐
# │ id  │ name         │ mode        │ ↺       │ status  │ cpu      │
# ├─────┼──────────────┼─────────────┼─────────┼─────────┼──────────┤
# │ 0   │ andar-bahar  │ fork        │ 0       │ online  │ 0%       │
# └─────┴──────────────┴─────────────┴─────────┴─────────┴──────────┘

# View logs (last 100 lines)
pm2 logs andar-bahar --lines 100

# You should see:
# "Server running on port 5000"
# "Connected to Supabase"
```

### 5.3: Test Local Server

```bash
# Test API endpoint
curl http://127.0.0.1:5000/api/game/current

# Should return JSON (not error)
```

### 5.4: Enable PM2 Startup on Boot

```bash
# Generate startup script
pm2 startup systemd

# Copy and run the command it outputs, example:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root

# Save current PM2 process list
pm2 save

# Verify startup is enabled
systemctl status pm2-root
```

---

## Step 6: Configure Nginx Reverse Proxy

### 6.1: Create Nginx Configuration

```bash
cat > /etc/nginx/sites-available/reddy-anna.conf <<"EOF"
# Reddy Anna Game - Nginx Configuration
# Domain: rajugarikossu.com
# Backend: Node.js on localhost:5000

server {
    listen 80;
    listen [::]:80;
    server_name rajugarikossu.com www.rajugarikossu.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Allow large uploads (for payment screenshots, etc.)
    client_max_body_size 50M;

    # Logging
    access_log /var/log/nginx/reddy-anna-access.log;
    error_log /var/log/nginx/reddy-anna-error.log;

    # Main application proxy
    location / {
        proxy_pass http://127.0.0.1:5000;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Explicit WebSocket endpoint
    location /ws {
        proxy_pass http://127.0.0.1:5000/ws;
        
        # WebSocket configuration
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeouts (keep connection alive)
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Static assets caching (optional optimization)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
```

### 6.2: Enable the Site


```bash
# Create symbolic link to enable site
ln -s /etc/nginx/sites-available/reddy-anna.conf /etc/nginx/sites-enabled/reddy-anna.conf

# Remove default Nginx site (optional)
rm -f /etc/nginx/sites-enabled/default
```

### 6.3: Test and Reload Nginx

```bash
# Test configuration syntax
nginx -t

# Should output:
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Reload Nginx
systemctl reload nginx

# Check Nginx status
systemctl status nginx

# Should show: active (running)
```

---

## Step 7: Namecheap DNS Setup

### 7.1: Login to Namecheap

1. Go to: https://www.namecheap.com/
2. Login to your account
3. Click **Domain List**

### 7.2: Manage DNS for rajugarikossu.com

1. Find **rajugarikossu.com** in your domain list
2. Click **Manage** button

### 7.3: Configure Nameservers

1. Scroll to **Nameservers** section
2. Select **Namecheap BasicDNS** (or **Custom DNS** if using Cloudflare)

### 7.4: Add DNS Records

1. Click **Advanced DNS** tab
2. Delete any existing A records for `@` and `www`
3. Add the following records:

**A Record for Root Domain:**
- **Type:** A Record
- **Host:** `@`
- **Value:** `72.61.170.227`
- **TTL:** Automatic (or 5 min)

**A Record for www Subdomain:**
- **Type:** A Record
- **Host:** `www`
- **Value:** `72.61.170.227`
- **TTL:** Automatic (or 5 min)

**Alternative: CNAME for www (choose one):**
- **Type:** CNAME Record
- **Host:** `www`
- **Value:** `rajugarikossu.com`
- **TTL:** Automatic

4. Click **Save All Changes**

### 7.5: Wait for DNS Propagation

```bash
# On VPS, check DNS propagation (wait 5-30 minutes)
nslookup rajugarikossu.com

# Should return:
# Name:   rajugarikossu.com
# Address: 72.61.170.227

# Alternative check
dig rajugarikossu.com +short
# Should output: 72.61.170.227
```

### 7.6: Test HTTP Access

```bash
# Test from VPS
curl -I http://rajugarikossu.com

# Should return HTTP 200 OK

# Test from your local machine browser:
# Open: http://rajugarikossu.com
# You should see your app (without HTTPS yet)
```

---

## Step 8: Enable HTTPS with Let's Encrypt

### 8.1: Verify Domain is Accessible

Before running Certbot, ensure:
- ✅ DNS points to your VPS (72.61.170.227)
- ✅ Nginx is running
- ✅ Port 80 is open and accessible
- ✅ http://rajugarikossu.com loads your app

### 8.2: Run Certbot

```bash
# Obtain SSL certificate and auto-configure Nginx
certbot --nginx -d rajugarikossu.com -d www.rajugarikossu.com
```

**Follow the prompts:**

1. **Enter email address:** (for renewal notifications)
   ```
   your-email@example.com
   ```

2. **Agree to Terms of Service:**
   ```
   (A)gree
   ```

3. **Share email with EFF (optional):**
   ```
   (N)o
   ```

4. **Redirect HTTP to HTTPS:**
   ```
   2: Redirect - Make all requests redirect to secure HTTPS access
   ```

**Expected output:**
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/rajugarikossu.com/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/rajugarikossu.com/privkey.pem
```

### 8.3: Verify SSL Configuration

```bash
# Check updated Nginx config
cat /etc/nginx/sites-available/andar-bahar.conf

# Should now have SSL blocks added by Certbot

# Test Nginx config
nginx -t

# Reload Nginx
systemctl reload nginx
```

### 8.4: Test HTTPS Access

```bash
# Test from VPS
curl -I https://rajugarikossu.com

# Should return HTTP 200 OK with HTTPS

# Test redirect
curl -I http://rajugarikossu.com
# Should return 301 redirect to https://
```

**Open in browser:**
- https://rajugarikossu.com
- Should show 🔒 secure padlock
- Certificate should be valid

### 8.5: Setup Auto-Renewal

```bash
# Certbot auto-renewal is already configured via systemd timer
# Verify it's enabled:
systemctl status certbot.timer

# Test renewal (dry run)
certbot renew --dry-run

# Should output: "Congratulations, all simulated renewals succeeded"
```

---

## Step 9: Verification Checklist

### 9.1: Backend API Tests

```bash
# Test game API
curl https://rajugarikossu.com/api/game/current

# Should return JSON with game state

# Test health check (if you have one)
curl https://rajugarikossu.com/api/health
```

### 9.2: Frontend Tests

Open browser and test:

1. **Homepage:**
   - ✅ https://rajugarikossu.com loads
   - ✅ No console errors
   - ✅ Assets load correctly

2. **User Registration:**
   - ✅ Navigate to signup page
   - ✅ Create new account
   - ✅ Receives success message

3. **User Login:**
   - ✅ Login with created account
   - ✅ Redirects to game page
   - ✅ Token stored in localStorage

4. **Game Page:**
   - ✅ Game interface loads
   - ✅ WebSocket connects (check browser console)
   - ✅ Video stream loads
   - ✅ Can see current game state

5. **Betting:**
   - ✅ Can select bet amount
   - ✅ Can place bet on Andar/Bahar
   - ✅ Balance updates after bet
   - ✅ Bet appears in active bets

6. **Admin Panel:**
   - ✅ Navigate to /admin-login
   - ✅ Login with admin credentials
   - ✅ Can access admin dashboard
   - ✅ Can control game (start, deal cards)
   - ✅ Can see analytics

7. **Payment System:**
   - ✅ Can request deposit
   - ✅ Can upload payment screenshot
   - ✅ Admin can approve/reject payments

### 9.3: WebSocket Tests

Open browser console (F12) and check:

```javascript
// Should see WebSocket connection
// Network tab → WS → wss://rajugarikossu.com/ws

// Console should show:
// "WebSocket connected"
// "Authenticated successfully"
```

### 9.4: Server Logs Check

```bash
# Check PM2 logs
pm2 logs andar-bahar --lines 50

# Should NOT see:
# - Database connection errors
# - Supabase authentication errors
# - Missing environment variable errors
# - Uncaught exceptions

# Check Nginx logs
tail -f /var/log/nginx/andar-bahar-error.log
# Should be empty or minimal errors
```

---

## Step 10: Troubleshooting

### Issue 1: "502 Bad Gateway"

**Cause:** Node server not running

**Fix:**
```bash
# Check PM2 status
pm2 status

# If stopped, restart
pm2 restart andar-bahar

# Check logs
pm2 logs andar-bahar --lines 100
```

### Issue 2: "Cannot connect to WebSocket"

**Cause:** WebSocket proxy not configured or firewall blocking

**Fix:**
```bash
# Check Nginx config has /ws location block
cat /etc/nginx/sites-available/andar-bahar.conf | grep -A 10 "location /ws"

# Reload Nginx
systemctl reload nginx

# Check if port 5000 is listening
netstat -tulpn | grep 5000
```

### Issue 3: "Supabase connection failed"

**Cause:** Wrong SUPABASE_SERVICE_KEY or network issue

**Fix:**
```bash
# Verify .env file
cat /var/www/andar-bahar/.env | grep SUPABASE

# Test Supabase connection
curl -H "apikey: YOUR_SERVICE_KEY" \
     -H "Authorization: Bearer YOUR_SERVICE_KEY" \
     https://vtnlaofpaovkmeqiidaw.supabase.co/rest/v1/users?limit=1

# Should return JSON, not 401
```

### Issue 4: "JWT authentication failed"

**Cause:** JWT_SECRET mismatch or not set

**Fix:**
```bash
# Verify JWT_SECRET exists and is strong
cat /var/www/andar-bahar/.env | grep JWT_SECRET

# If missing, generate new one
openssl rand -base64 32

# Edit .env and add it
nano /var/www/andar-bahar/.env

# Restart server
pm2 restart andar-bahar
```

### Issue 5: "Static files not loading (404)"

**Cause:** Client build not copied to correct location (must be dist/public/)

**Fix:**
```bash
cd /var/www/andar-bahar

# Rebuild client
cd client
npm run build
cd ..

# Copy to dist/public (NOT server/public)
rm -rf dist/public/*
mkdir -p dist/public
cp -r client/dist/* dist/public/

# Verify
ls -la dist/public/
# Should see index.html, assets/, cards/, coins/, hero-images/

# Restart server
pm2 restart andar-bahar

# Check logs - should see "Serving static files from: /var/www/andar-bahar/dist/public"
pm2 logs andar-bahar --lines 20
```

### Issue 6: SSL Certificate Error

**Cause:** Certbot failed or certificate expired

**Fix:**
```bash
# Check certificate status
certbot certificates

# Renew manually
certbot renew

# If failed, delete and recreate
certbot delete --cert-name rajugarikossu.com
certbot --nginx -d rajugarikossu.com -d www.rajugarikossu.com
```

### Issue 7: High Memory Usage

**Cause:** Memory leak or too many connections

**Fix:**
```bash
# Check memory
free -h
htop

# Restart PM2 process
pm2 restart andar-bahar

# Enable PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
```

---

## Step 11: Maintenance Commands

### Daily Operations

```bash
# Check server status
pm2 status

# View real-time logs
pm2 logs andar-bahar

# Restart server (zero downtime)
pm2 reload andar-bahar

# Check Nginx status
systemctl status nginx

# Check SSL certificate expiry
certbot certificates
```

### Update Deployment

```bash
# Pull latest code
cd /var/www/andar-bahar
git pull origin main

# Install new dependencies
npm install
cd client && npm install && cd ..

# Rebuild
npm run build
cp -r client/dist/* dist/public/

# Restart
pm2 restart andar-bahar

# Clear PM2 logs
pm2 flush
```

### Database Backup (Supabase)

```bash
# Supabase handles backups automatically
# To export manually:
# 1. Go to Supabase Dashboard
# 2. Database → Backups
# 3. Download backup

# Or use pg_dump if you have direct DB access
```

### Monitor Server Resources

```bash
# CPU and Memory
htop

# Disk usage
df -h

# Network connections
netstat -tulpn

# PM2 monitoring
pm2 monit
```

### View Logs

```bash
# PM2 logs
pm2 logs andar-bahar --lines 200

# Nginx access logs
tail -f /var/log/nginx/andar-bahar-access.log

# Nginx error logs
tail -f /var/log/nginx/andar-bahar-error.log

# System logs
journalctl -u nginx -f
journalctl -u pm2-root -f
```

### Security Updates

```bash
# Update system packages
apt update && apt upgrade -y

# Update Node.js packages
cd /var/www/andar-bahar
npm audit
npm audit fix

# Restart after updates
pm2 restart andar-bahar
systemctl restart nginx
```

---

## Quick Reference

### Important Paths

- **Project root:** `/var/www/andar-bahar`
- **Environment file:** `/var/www/andar-bahar/.env`
- **Nginx config:** `/etc/nginx/sites-available/andar-bahar.conf`
- **SSL certificates:** `/etc/letsencrypt/live/rajugarikossu.com/`
- **PM2 logs:** `~/.pm2/logs/`

### Important URLs

- **Frontend:** https://rajugarikossu.com
- **Admin:** https://rajugarikossu.com/admin-login
- **API:** https://rajugarikossu.com/api/
- **WebSocket:** wss://rajugarikossu.com/ws

### Important Commands

```bash
# Restart everything
pm2 restart andar-bahar && systemctl reload nginx

# View all logs
pm2 logs andar-bahar --lines 100

# Check all services
pm2 status && systemctl status nginx && systemctl status certbot.timer

# Full rebuild and restart
cd /var/www/andar-bahar && \
git pull && \
npm install && \
npm run build && \
cp -r client/dist/* dist/public/ && \
pm2 restart andar-bahar
```

---

## Success Criteria

Your deployment is successful when:

- ✅ https://rajugarikossu.com loads with valid SSL
- ✅ Users can register and login
- ✅ WebSocket connects (wss://rajugarikossu.com/ws)
- ✅ Game interface displays correctly
- ✅ Betting system works (balance updates)
- ✅ Admin panel accessible and functional
- ✅ Payment requests can be submitted
- ✅ No errors in PM2 logs
- ✅ No errors in Nginx logs
- ✅ No console errors in browser

---

## Support

If you encounter issues not covered in this guide:

1. Check PM2 logs: `pm2 logs andar-bahar --lines 200`
2. Check Nginx logs: `tail -f /var/log/nginx/andar-bahar-error.log`
3. Check browser console (F12) for frontend errors
4. Verify .env file has all required values
5. Ensure DNS is properly configured
6. Test Supabase connection separately

---

**Deployment completed successfully! 🎉**

Your Andar Bahar game is now live at: **https://rajugarikossu.com**
