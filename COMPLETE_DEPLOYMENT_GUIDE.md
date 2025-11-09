# 🚀 COMPLETE DEPLOYMENT GUIDE - ANDAR BAHAR APPLICATION

**Domain:** rajugarikossu.com  
**Server:** Qloudhost VPS  
**Application:** Andar Bahar Gaming Platform  
**Date:** November 9, 2024  

---

## 📋 TABLE OF CONTENTS

1. [Prerequisites & Credentials](#prerequisites--credentials)
2. [Architecture Overview](#architecture-overview)
3. [Phase 1: Domain Configuration](#phase-1-domain-configuration-namecheap)
4. [Phase 2: Server Environment Setup](#phase-2-server-environment-setup)
5. [Phase 3: Database Configuration](#phase-3-database-configuration)
6. [Phase 4: Build Application Files](#phase-4-build-application-files)
7. [Phase 5: Upload Files to Server](#phase-5-upload-files-to-server)
8. [Phase 6: Configure Environment Variables](#phase-6-configure-environment-variables)
9. [Phase 7: Install Dependencies](#phase-7-install-dependencies-on-server)
10. [Phase 8: Configure Nginx Web Server](#phase-8-configure-nginx-web-server)
11. [Phase 9: Set Up SSL Certificate](#phase-9-set-up-ssl-certificate-https)
12. [Phase 10: Configure Streaming Server](#phase-10-configure-streaming-server)
13. [Phase 11: Start Application with PM2](#phase-11-start-application-with-pm2)
14. [Phase 12: Update Client Stream URLs](#phase-12-update-client-stream-configuration)
15. [Phase 13: Configure OBS for Streaming](#phase-13-configure-obs-for-streaming)
16. [Phase 14: Testing & Verification](#phase-14-testing--verification)
17. [Troubleshooting](#troubleshooting-common-issues)
18. [Maintenance & Monitoring](#maintenance--monitoring)

---

## PREREQUISITES & CREDENTIALS

### Your Credentials

| Service | URL | Email/Username | Password |
|---------|-----|----------------|----------|
| **Domain (Namecheap)** | https://www.namecheap.com/ | reddyannakossuinfo@gmail.com | Reddy@8080 |
| **Server (Qloudhost)** | https://qloudhost.com/ | reddyannakossuinfo@gmail.com | Reddyanna@2003 |
| **Server SSH** | [Get from Qloudhost] | root | Reddyanna@2003 |

### Application Credentials (After Deployment)

| Account Type | Username/Phone | Password |
|-------------|----------------|----------|
| **Admin** | admin | admin123 |
| **Admin** | rajugarikossu | admin123 |
| **Test Player** | 9876543210 | player123 |
| **Test Player** | 9876543211 | player123 |
| **Test Player** | 9876543212 | player123 |

### Required Software on Your Local Machine

- ✅ Node.js 20.x or higher
- ✅ Git (optional but recommended)
- ✅ SSH client (PuTTY for Windows or built-in Terminal)
- ✅ FileZilla or WinSCP (for file transfer)
- ✅ OBS Studio (for streaming)

---

## ARCHITECTURE OVERVIEW

### Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│                   rajugarikossu.com                     │
│                     (Your Domain)                        │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Qloudhost VPS                         │
│                   (Your Server)                          │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Nginx     │  │   Node.js    │  │   Streaming  │  │
│  │ (Port 80/443)│  │  (Port 5000) │  │(Ports 1935,  │  │
│  │              │  │              │  │ 8000, 3000)  │  │
│  │  - Frontend  │  │  - Backend   │  │              │  │
│  │  - SSL/TLS   │  │  - WebSocket │  │  - RTMP      │  │
│  │  - Reverse   │  │  - API       │  │  - HLS       │  │
│  │    Proxy     │  │              │  │  - Player    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase PostgreSQL                     │
│                   (Cloud Database)                       │
└─────────────────────────────────────────────────────────┘
```

### Application Components

- **Frontend:** React + Vite + TypeScript
- **Backend:** Node.js + Express + TypeScript
- **Database:** Supabase (PostgreSQL)
- **Authentication:** JWT-based (stateless)
- **WebSocket:** Real-time game updates
- **Streaming:** Self-hosted RTMP/HLS server

### Ports Used

| Port | Service | Protocol |
|------|---------|----------|
| 80 | HTTP → HTTPS redirect | TCP |
| 443 | HTTPS (Nginx) | TCP |
| 5000 | Node.js API & WebSocket | TCP |
| 1935 | RTMP streaming input | TCP |
| 8000 | HLS streaming output | TCP |
| 3000 | Streaming player page | TCP |

---

## PHASE 1: DOMAIN CONFIGURATION (NAMECHEAP)

### Step 1.1: Log into Namecheap

1. Open browser and go to: https://www.namecheap.com/
2. Click **"Sign In"** (top right)
3. Enter credentials:
   - **Email:** reddyannakossuinfo@gmail.com
   - **Password:** Reddy@8080
4. Click **"Sign In"**

### Step 1.2: Access Domain Management

1. After login, click **"Domain List"** in the left sidebar
2. Find **rajugarikossu.com** in the list
3. Click **"Manage"** button next to the domain

### Step 1.3: Get Your Server IP Address

Before configuring DNS, you need your server IP:

1. Go to https://qloudhost.com/
2. Log in with:
   - **Email:** reddyannakossuinfo@gmail.com
   - **Password:** Reddyanna@2003
3. Go to your VPS/Server dashboard
4. **Copy the IP address** (e.g., 123.456.789.101)
5. **Write it down** - you'll need it multiple times

### Step 1.4: Configure DNS Records

1. In Namecheap domain management, click **"Advanced DNS"** tab
2. Look for the section **"Host Records"**
3. Remove any existing A records or CNAME records pointing to old servers
4. Add the following records:

**Record 1: Root Domain**
```
Type: A Record
Host: @
Value: [Your Server IP from Step 1.3]
TTL: Automatic
```

**Record 2: WWW Subdomain**
```
Type: A Record
Host: www
Value: [Your Server IP from Step 1.3]
TTL: Automatic
```

**Record 3: Streaming Subdomain** (Optional but recommended)
```
Type: A Record
Host: stream
Value: [Your Server IP from Step 1.3]
TTL: Automatic
```

5. Click **"Save All Changes"**

### Step 1.5: Wait for DNS Propagation

- DNS changes can take **5 minutes to 48 hours** to propagate
- Typically propagates within **5-30 minutes**
- You can check propagation status at: https://dnschecker.org/
- Enter **rajugarikossu.com** and check if it points to your server IP

**✅ Phase 1 Complete!** Your domain now points to your server.

---

## PHASE 2: SERVER ENVIRONMENT SETUP

### Step 2.1: Get SSH Access Details

1. Log into Qloudhost: https://qloudhost.com/
2. Navigate to your VPS dashboard
3. Note down:
   - **Server IP:** (e.g., 123.456.789.101)
   - **SSH Username:** root
   - **SSH Password:** Reddyanna@2003
   - **SSH Port:** 22 (default)

### Step 2.2: Connect via SSH

**Option A: Windows Command Prompt/PowerShell**
```bash
# Open Command Prompt or PowerShell
# Press Win+R, type 'cmd', press Enter

# Connect to server (replace with your actual IP)
ssh root@123.456.789.101

# Type 'yes' when asked about fingerprint
# Enter password: Reddyanna@2003
```

**Option B: Using PuTTY (Windows)**
1. Download PuTTY: https://www.putty.org/
2. Install and open PuTTY
3. In "Host Name" field, enter your server IP
4. Port: 22
5. Connection type: SSH
6. Click "Open"
7. Login as: root
8. Password: Reddyanna@2003

### Step 2.3: Update System Packages

Once connected via SSH, run these commands:

```bash
# Update package lists
apt update

# Upgrade all packages
apt upgrade -y

# This may take 5-10 minutes
```

### Step 2.4: Install Node.js 20.x

```bash
# Add NodeSource repository for Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Install Node.js and npm
apt install -y nodejs

# Verify installation
node --version
# Should output: v20.x.x

npm --version
# Should output: v10.x.x
```

### Step 2.5: Install Nginx Web Server

```bash
# Install Nginx
apt install -y nginx

# Start Nginx
systemctl start nginx

# Enable Nginx to start on boot
systemctl enable nginx

# Check status
systemctl status nginx
# Should show "active (running)"

# Verify installation
nginx -v
# Should output: nginx version: nginx/1.x.x
```

### Step 2.6: Install FFmpeg (for Streaming)

```bash
# Install FFmpeg
apt install -y ffmpeg

# Verify installation
ffmpeg -version
# Should show FFmpeg version and configuration
```

### Step 2.7: Install PM2 Process Manager

```bash
# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 --version
# Should output: 5.x.x or higher
```

### Step 2.8: Install Additional Tools

```bash
# Install certbot for SSL certificates
apt install -y certbot python3-certbot-nginx

# Install build essentials (needed for some npm packages)
apt install -y build-essential

# Install Git (optional, useful for updates)
apt install -y git

# Install unzip (for extracting archives)
apt install -y unzip
```

### Step 2.9: Configure Firewall (UFW)

```bash
# Install UFW if not already installed
apt install -y ufw

# Allow SSH (IMPORTANT: Do this first!)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow Node.js API
ufw allow 5000/tcp

# Allow streaming ports
ufw allow 1935/tcp  # RTMP
ufw allow 8000/tcp  # HLS
ufw allow 3000/tcp  # Player

# Enable firewall
ufw enable
# Type 'y' when prompted

# Check firewall status
ufw status verbose
# Should show all allowed ports
```

### Step 2.10: Create Application Directory

```bash
# Create main application directory
mkdir -p /var/www/andar-bahar

# Navigate to directory
cd /var/www/andar-bahar

# Set proper permissions
chown -R www-data:www-data /var/www/andar-bahar
chmod -R 755 /var/www/andar-bahar

# Verify directory created
pwd
# Should output: /var/www/andar-bahar
```

**✅ Phase 2 Complete!** Your server environment is ready.

---

## PHASE 3: DATABASE CONFIGURATION

### Step 3.1: Create or Access Supabase Project

**Option A: Create New Supabase Project**

1. Go to: https://supabase.com/
2. Click **"Start your project"** or **"Sign In"**
3. Sign in with GitHub or email
4. Click **"New Project"**
5. Fill in:
   - **Project Name:** andar-bahar
   - **Database Password:** (Create a strong password - write it down!)
   - **Region:** Choose closest to your server location
   - **Pricing Plan:** Free tier is sufficient for testing
6. Click **"Create new project"**
7. Wait 2-3 minutes for project to be created

**Option B: Use Existing Supabase Project**

1. Go to: https://supabase.com/
2. Sign in to your account
3. Select your existing project from the dashboard

### Step 3.2: Get Supabase Credentials

1. In your Supabase project dashboard
2. Click **"Settings"** (gear icon in left sidebar)
3. Click **"API"** in the settings menu
4. **Copy and save these values:**

**Project URL:**
```
https://[your-project-id].supabase.co
```

**Anon/Public Key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (long key)
```

**Service Role Key:** (Click "Reveal" button)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (different long key)
```

⚠️ **IMPORTANT:** 
- Keep these credentials secure
- Never commit them to version control
- The Service Role Key has full database access

### Step 3.3: Run Database Setup Script

1. In Supabase dashboard, click **"SQL Editor"** in left sidebar
2. Click **"New query"** button
3. Open your local file: `scripts/reset-and-recreate-database.sql`
4. **Copy ALL contents** of the file (it's 1,441 lines)
5. **Paste** into the Supabase SQL Editor
6. Click **"Run"** button (or press Ctrl+Enter)
7. **Wait for completion** (10-30 seconds)

### Step 3.4: Verify Database Setup

After running the script, you should see at the bottom:

```
Database reset completed successfully!
admin_count: 2
user_count: 3
game_settings_count: 18
stream_settings_count: 4
```

If you see this, the database is correctly set up!

### Step 3.5: Verify Tables Created

Run this query in SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see these 36 tables:
- admin_credentials
- admin_dashboard_settings
- admin_requests
- blocked_users
- bonus_transactions
- daily_game_statistics
- dealt_cards
- deposit_bonuses
- game_history
- game_sessions
- game_settings
- game_statistics
- monthly_game_statistics
- payment_requests
- player_bets
- referral_bonuses
- request_audit
- stream_config
- stream_sessions
- stream_settings
- token_blacklist
- user_creation_log
- user_referrals
- user_transactions
- users
- whatsapp_messages
- yearly_game_statistics

### Step 3.6: Verify Admin Accounts

Run this query:

```sql
SELECT username, role, created_at 
FROM admin_credentials 
ORDER BY username;
```

Should show:
- admin | admin
- rajugarikossu | admin

### Step 3.7: Verify Test Users

Run this query:

```sql
SELECT phone, full_name, balance, status 
FROM users 
ORDER BY phone;
```

Should show 3 users with ₹100,000 balance each.

**✅ Phase 3 Complete!** Database is configured and ready.

---

## PHASE 4: BUILD APPLICATION FILES

### Step 4.1: Open Your Local Project

On your Windows machine:

```bash
# Open Command Prompt or PowerShell
# Navigate to your project directory
cd C:\Users\15anu\Desktop\andar bahar\andar bahar
```

### Step 4.2: Install Dependencies

```bash
# Install root dependencies
npm install

# This may take 5-10 minutes depending on internet speed
```

### Step 4.3: Build the Client (Frontend)

```bash
# Navigate to client directory
cd client

# Install client dependencies
npm install

# Build the client for production
npm run build

# This creates a 'dist' folder with optimized files
# Wait for build to complete (1-3 minutes)
```

Verify build success:
```bash
# Check if dist folder was created
dir dist
# Should show: index.html, assets folder, etc.
```

### Step 4.4: Build the Server (Backend)

```bash
# Go back to root directory
cd ..

# Build the server
npm run build:server

# This creates a 'dist' folder with compiled server code
# Wait for build to complete (30-60 seconds)
```

Verify build success:
```bash
# Check if dist folder was created
dir dist
# Should show: index.js and other files
```

### Step 4.5: Prepare Files for Upload

Your project now has these built files ready:
```
andar bahar/
├── dist/              ← Built server (upload this)
├── client/
│   └── dist/          ← Built client (upload this)
├── live_stream/       ← Streaming server (upload this)
├── package.json       ← Dependencies (upload this)
├── package-lock.json  ← Lock file (upload this)
└── .env               ← Will create on server
```

**✅ Phase 4 Complete!** Application files are built and ready.

---

## PHASE 5: UPLOAD FILES TO SERVER

### Step 5.1: Prepare Local Files

On your Windows machine, open a new PowerShell or Command Prompt window:

```bash
# Navigate to your project
cd C:\Users\15anu\Desktop\andar bahar\andar bahar
```

### Step 5.2: Upload Using SCP (Command Line)

**Replace `YOUR_SERVER_IP` with your actual server IP**

```bash
# Upload server files
scp -r dist root@YOUR_SERVER_IP:/var/www/andar-bahar/

# Upload client files
scp -r client/dist root@YOUR_SERVER_IP:/var/www/andar-bahar/client/

# Upload streaming server
scp -r live_stream root@YOUR_SERVER_IP:/var/www/andar-bahar/

# Upload package files
scp package.json root@YOUR_SERVER_IP:/var/www/andar-bahar/
scp package-lock.json root@YOUR_SERVER_IP:/var/www/andar-bahar/

# Enter password when prompted: Reddyanna@2003
```

### Step 5.3: Alternative - Upload Using FileZilla (GUI Method)

**Download FileZilla:**
1. Go to: https://filezilla-project.org/
2. Download FileZilla Client
3. Install and open FileZilla

**Connect to Server:**
1. At the top, fill in:
   - **Host:** sftp://YOUR_SERVER_IP
   - **Username:** root
   - **Password:** Reddyanna@2003
   - **Port:** 22
2. Click **"Quickconnect"**
3. If prompted about unknown host key, click **"OK"**

**Upload Files:**
1. **Left panel:** Navigate to your local project folder
   ```
   C:\Users\15anu\Desktop\andar bahar\andar bahar
   ```

2. **Right panel:** Navigate to server directory
   ```
   /var/www/andar-bahar
   ```

3. **Drag and drop** these folders/files from left to right:
   - `dist` folder
   - `client/dist` folder
   - `live_stream` folder
   - `package.json`
   - `package-lock.json`

4. Wait for upload to complete (may take 10-30 minutes depending on connection)

### Step 5.4: Verify Upload on Server

SSH into your server and verify:

```bash
# Connect via SSH
ssh root@YOUR_SERVER_IP

# Navigate to app directory
cd /var/www/andar-bahar

# List all files
ls -la

# You should see:
# - dist/
# - client/
# - live_stream/
# - package.json
# - package-lock.json

# Check client dist folder
ls -la client/dist
# Should show: index.html, assets/, etc.

# Check server dist folder
ls -la dist
# Should show: index.js and other files

# Check streaming folder
ls -la live_stream
# Should show: server.js, package.json, etc.
```

**✅ Phase 5 Complete!** All files are uploaded to the server.

---

## PHASE 6: CONFIGURE ENVIRONMENT VARIABLES

### Step 6.1: Generate JWT Secret

On your server (via SSH):

```bash
# Generate a secure JWT secret
openssl rand -base64 32

# Copy the output - you'll need it for .env file
# Example output: kJ8n9mP3qR2sT5vW8xY1zA4bC6dE9fG2hJ5kL8nM0pQ=
```

### Step 6.2: Create .env File

```bash
# Make sure you're in the app directory
cd /var/www/andar-bahar

# Create .env file
nano .env
```

### Step 6.3: Add Environment Variables

Copy and paste this into the nano editor, then **replace the placeholder values**:

```bash
# ============================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# ============================================

# === SUPABASE CONFIGURATION (REQUIRED) ===
# Get these from: https://supabase.com → Your Project → Settings → API
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# === JWT CONFIGURATION (REQUIRED) ===
# Use the secret you generated in Step 6.1
JWT_SECRET=YOUR_GENERATED_JWT_SECRET_HERE
JWT_EXPIRES_IN=24h

# === SERVER CONFIGURATION ===
NODE_ENV=production
PORT=5000
WEBSOCKET_URL=wss://rajugarikossu.com

# === CORS CONFIGURATION ===
CORS_ORIGIN=https://rajugarikossu.com
ALLOWED_ORIGINS=https://rajugarikossu.com,https://www.rajugarikossu.com,https://stream.rajugarikossu.com

# === DATABASE CONFIGURATION ===
# PostgreSQL connection string from Supabase
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# === CLIENT-SIDE API CONFIGURATION ===
VITE_API_BASE_URL=rajugarikossu.com
VITE_WS_URL=wss://rajugarikossu.com/ws

# === GAME CONFIGURATION ===
MIN_BET=1000
MAX_BET=100000
DEFAULT_BALANCE=0.00
DEFAULT_TIMER_DURATION=30
HOUSE_COMMISSION=0.05

# === PAYMENT CONFIGURATION ===
MIN_DEPOSIT=100
MAX_DEPOSIT=1000000
MIN_WITHDRAWAL=500
MAX_WITHDRAWAL=500000

# === BONUS CONFIGURATION ===
DEFAULT_DEPOSIT_BONUS_PERCENT=5
WAGERING_MULTIPLIER=1
BONUS_CLAIM_THRESHOLD=500

# === SSL CONFIGURATION ===
HTTPS_ENABLED=true
SSL_KEY_PATH=/etc/letsencrypt/live/rajugarikossu.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/rajugarikossu.com/fullchain.pem
HTTPS_PORT=443
HTTP_TO_HTTPS_REDIRECT=true

# === RATE LIMITING ===
MAX_BETS_PER_MINUTE=30
RATE_LIMIT_WINDOW_MS=60000
```

### Step 6.4: Replace Placeholder Values

**You MUST replace these values:**

1. **YOUR_PROJECT_ID** → Your Supabase project ID
2. **YOUR_ANON_KEY_HERE** → Your Supabase anon key (from Phase 3)
3. **YOUR_SERVICE_ROLE_KEY_HERE** → Your Supabase service role key (from Phase 3)
4. **YOUR_GENERATED_JWT_SECRET_HERE** → The secret from Step 6.1
5. **[PASSWORD]** and **[PROJECT-REF]** in DATABASE_URL → Get from Supabase

**To get DATABASE_URL:**
1. Go to Supabase Dashboard
2. Settings → Database
3. Copy "Connection string" under "Connection pooling"
4. Replace `[YOUR-PASSWORD]` with your database password

### Step 6.5: Save the File

```bash
# Press Ctrl+X to exit
# Press Y to confirm save
# Press Enter to confirm filename
```

### Step 6.6: Verify .env File

```bash
# View the file (without showing sensitive data)
cat .env | grep -v "KEY\|SECRET\|PASSWORD"

# Should show your configuration with placeholders hidden
```

### Step 6.7: Set Proper Permissions

```bash
# Make .env file readable only by owner (security best practice)
chmod 600 .env

# Verify permissions
ls -la .env
# Should show: -rw------- (only owner can read/write)
```

**✅ Phase 6 Complete!** Environment variables are configured.

---

## PHASE 7: INSTALL DEPENDENCIES ON SERVER

### Step 7.1: Install Main Application Dependencies

```bash
# Make sure you're in the app directory
cd /var/www/andar-bahar

# Install production dependencies only
npm install --production

# This may take 10-20 minutes
# You'll see progress bars for each package
```

### Step 7.2: Install Streaming Server Dependencies

```bash
# Navigate to streaming directory
cd /var/www/andar-bahar/live_stream

# Install streaming dependencies
npm install

# This should be faster (2-5 minutes)

# Go back to main directory
cd /var/www/andar-bahar
```

### Step 7.3: Verify Installations

```bash
# Check main node_modules
ls node_modules | wc -l
# Should show a large number (500+)

# Check streaming node_modules
ls live_stream/node_modules | wc -l
# Should show fewer packages (50+)
```

### Step 7.4: Test Node.js Can Load Environment

```bash
# Quick test to ensure .env is being read
node -e "require('dotenv').config(); console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);"

# Should output: JWT_SECRET exists: true
```

**✅ Phase 7 Complete!** All dependencies are installed.

---

## PHASE 8: CONFIGURE NGINX WEB SERVER

### Step 8.1: Remove Default Nginx Configuration

```bash
# Remove default site configuration
rm /etc/nginx/sites-enabled/default

# Remove default site configuration file
rm /etc/nginx/sites-available/default
```

### Step 8.2: Create Application Nginx Configuration

```bash
# Create new configuration file
nano /etc/nginx/sites-available/andar-bahar
```

### Step 8.3: Add Nginx Configuration

Copy and paste this complete configuration:

```nginx
# ============================================
# ANDAR BAHAR APPLICATION - NGINX CONFIGURATION
# ============================================

# Upstream for Node.js backend
upstream nodejs_backend {
    server localhost:5000;
    keepalive 64;
}

# Upstream for streaming player
upstream streaming_player {
    server localhost:3000;
    keepalive 64;
}

# Upstream for HLS streaming
upstream hls_streaming {
    server localhost:8000;
    keepalive 64;
}

# ============================================
# MAIN WEBSITE - HTTP (Temporary, will be upgraded to HTTPS)
# ============================================
server {
    listen 80;
    listen [::]:80;
    server_name rajugarikossu.com www.rajugarikossu.com;

    # Root directory for static files
    root /var/www/andar-bahar/client/dist;
    index index.html;

    # Logging
    access_log /var/log/nginx/andar-bahar-access.log;
    error_log /var/log/nginx/andar-bahar-error.log;

    # Client max body size (for file uploads)
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client-side routing (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy to Node.js backend
    location /api/ {
        proxy_pass http://nodejs_backend;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
        proxy_send_timeout 90;
    }

    # WebSocket Proxy
    location /ws {
        proxy_pass http://nodejs_backend;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeout settings
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_connect_timeout 90s;
    }

    # Static assets with long-term caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}

# ============================================
# STREAMING SERVER - HTTP (Temporary)
# ============================================
server {
    listen 80;
    listen [::]:80;
    server_name stream.rajugarikossu.com;

    # Logging
    access_log /var/log/nginx/stream-access.log;
    error_log /var/log/nginx/stream-error.log;

    # Player page
    location / {
        proxy_pass http://streaming_player;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers for streaming
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'Content-Type' always;
    }

    # HLS streaming files
    location /live/ {
        proxy_pass http://hls_streaming/live/;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'Range, Content-Type' always;
        
        # Disable caching for live streaming
        add_header Cache-Control 'no-cache, no-store, must-revalidate' always;
        add_header Pragma 'no-cache' always;
        add_header Expires '0' always;
        
        # HLS MIME types
        types {
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
        }
    }

    # Health check endpoint
    location /health {
        proxy_pass http://streaming_player/health;
        access_log off;
    }
}
```

### Step 8.4: Save Nginx Configuration

```bash
# Press Ctrl+X to exit nano
# Press Y to confirm save
# Press Enter to confirm filename
```

### Step 8.5: Enable the Site

```bash
# Create symbolic link to enable site
ln -s /etc/nginx/sites-available/andar-bahar /etc/nginx/sites-enabled/andar-bahar

# Verify symbolic link created
ls -la /etc/nginx/sites-enabled/
```

### Step 8.6: Test Nginx Configuration

```bash
# Test configuration for syntax errors
nginx -t

# You should see:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Step 8.7: Restart Nginx

```bash
# Restart Nginx to apply changes
systemctl restart nginx

# Check if Nginx is running
systemctl status nginx

# Should show: "active (running)"

# Enable Nginx to start on boot
systemctl enable nginx
```

### Step 8.8: Verify Nginx is Listening

```bash
# Check if Nginx is listening on port 80
netstat -tulpn | grep :80

# Should show: nginx listening on 0.0.0.0:80
```

**✅ Phase 8 Complete!** Nginx is configured and running.

---

## PHASE 9: SET UP SSL CERTIFICATE (HTTPS)

### Step 9.1: Verify Domain Points to Server

Before setting up SSL, ensure DNS has propagated:

```bash
# Check if domain resolves to your server IP
nslookup rajugarikossu.com

# Should show your server's IP address
```

If it doesn't show your IP yet, wait longer for DNS propagation.

### Step 9.2: Obtain SSL Certificate with Certbot

```bash
# Run certbot for main domain
certbot --nginx -d rajugarikossu.com -d www.rajugarikossu.com

# Follow the prompts:
# 1. Enter email: reddyannakossuinfo@gmail.com
# 2. Agree to Terms of Service: Y
# 3. Share email with EFF: N (optional)
# 4. Redirect HTTP to HTTPS: 2 (Yes, redirect)
```

### Step 9.3: Obtain SSL for Streaming Subdomain

```bash
# Run certbot for streaming subdomain
certbot --nginx -d stream.rajugarikossu.com

# Follow the same prompts as above
```

### Step 9.4: Verify SSL Certificates

```bash
# List all certificates
certbot certificates

# Should show:
# Certificate Name: rajugarikossu.com
#   Domains: rajugarikossu.com www.rajugarikossu.com
#   Expiry Date: [90 days from now]
# Certificate Name: stream.rajugarikossu.com
#   Domains: stream.rajugarikossu.com
#   Expiry Date: [90 days from now]
```

### Step 9.5: Test Auto-Renewal

```bash
# Test certificate renewal (dry run)
certbot renew --dry-run

# Should show: "The dry run was successful"
```

### Step 9.6: Verify HTTPS is Working

```bash
# Test HTTPS connection
curl -I https://rajugarikossu.com

# Should show: HTTP/2 200 (or 301 redirect to https://www)

# Test streaming subdomain
curl -I https://stream.rajugarikossu.com

# Should show: HTTP/2 200
```

### Step 9.7: Check Nginx Configuration (Auto-Updated by Certbot)

```bash
# View updated nginx configuration
cat /etc/nginx/sites-available/andar-bahar

# Certbot should have added SSL configuration blocks
# Should see lines like:
#   listen 443 ssl;
#   ssl_certificate /etc/letsencrypt/live/rajugarikossu.com/fullchain.pem;
#   ssl_certificate_key /etc/letsencrypt/live/rajugarikossu.com/privkey.pem;
```

### Step 9.8: Set Up Automatic Certificate Renewal

```bash
# Certbot automatically sets up a systemd timer
# Verify it's active
systemctl status certbot.timer

# Should show: "active (waiting)"

# Check when next renewal is scheduled
systemctl list-timers | grep certbot
```

**✅ Phase 9 Complete!** SSL certificates are installed and auto-renewal is configured.

---

## PHASE 10: CONFIGURE STREAMING SERVER

### Step 10.1: Update Streaming Server Configuration

```bash
# Navigate to streaming directory
cd /var/www/andar-bahar/live_stream

# Edit server.js
nano server.js
```

### Step 10.2: Update Server URLs

Find and update these lines:

```javascript
// Line 49-50: Update RTMP and HLS URLs
console.log('RTMP URL: rtmp://rajugarikossu.com:1935/live');
console.log('HLS URL: https://rajugarikossu.com:8000/live/test/index.m3u8');

// Line 87: Update player URL
console.log('✅ Player running at https://stream.rajugarikossu.com');
```

Save and exit:
```bash
# Press Ctrl+X, then Y, then Enter
```

### Step 10.3: Verify FFmpeg Installation

```bash
# Check FFmpeg path
which ffmpeg
# Should show: /usr/bin/ffmpeg

# Verify the path in server.js
cat server.js | grep ffmpegPath

# Should show:
#   ? '/usr/bin/ffmpeg'
```

### Step 10.4: Create Media Directory

```bash
# Create directory for HLS segments
mkdir -p /var/www/andar-bahar/live_stream/media

# Set permissions
chmod 755 /var/www/andar-bahar/live_stream/media

# Verify directory created
ls -la /var/www/andar-bahar/live_stream/
# Should show: media/
```

**✅ Phase 10 Complete!** Streaming server is configured.

---

## PHASE 11: START APPLICATION WITH PM2

### Step 11.1: Start Main Application Server

```bash
# Navigate to app directory
cd /var/www/andar-bahar

# Start the main Node.js server
pm2 start dist/index.js --name "andar-bahar-server" --env production

# You should see:
# ┌────┬─────────────────────┬─────────┬─────────┬──────────┬────────┐
# │ id │ name                │ mode    │ ↺      │ status   │ cpu    │
# ├────┼─────────────────────┼─────────┼─────────┼──────────┼────────┤
# │ 0  │ andar-bahar-server  │ fork    │ 0       │ online   │ 0%     │
# └────┴─────────────────────┴─────────┴─────────┴──────────┴────────┘
```

### Step 11.2: Start Streaming Server

```bash
# Start streaming server
pm2 start live_stream/server.js --name "streaming-server"

# You should see both processes now:
# ┌────┬─────────────────────┬─────────┬─────────┬──────────┬────────┐
# │ id │ name                │ mode    │ ↺      │ status   │ cpu    │
# ├────┼─────────────────────┼─────────┼─────────┼──────────┼────────┤
# │ 0  │ andar-bahar-server  │ fork    │ 0       │ online   │ 0%     │
# │ 1  │ streaming-server    │ fork    │ 0       │ online   │ 0%     │
# └────┴─────────────────────┴─────────┴─────────┴──────────┴────────┘
```

### Step 11.3: View Application Logs

```bash
# View main server logs
pm2 logs andar-bahar-server --lines 50

# Should show:
# ✅ NODE_ENV: production
# ✅ JWT Authentication enabled
# ✅ All required environment variables are set
# ✅ CORS configured
# serving on http://0.0.0.0:5000

# Press Ctrl+C to exit logs

# View streaming server logs
pm2 logs streaming-server --lines 50

# Should show:
# ✅ NodeMediaServer started!
# RTMP URL: rtmp://rajugarikossu.com:1935/live
# ✅ Player running at https://stream.rajugarikossu.com

# Press Ctrl+C to exit logs
```

### Step 11.4: Save PM2 Process List

```bash
# Save current PM2 process list
pm2 save

# You should see:
# [PM2] Saving current process list...
# [PM2] Successfully saved in ~/.pm2/dump.pm2
```

### Step 11.5: Enable PM2 on System Startup

```bash
# Configure PM2 to start on boot
pm2 startup

# This will output a command like:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root

# COPY and RUN that exact command
# (Paste it in terminal and press Enter)
```

### Step 11.6: Verify PM2 Services

```bash
# Check PM2 status
pm2 list

# Monitor in real-time
pm2 monit

# Press Ctrl+C to exit monitoring

# Check system service
systemctl status pm2-root

# Should show: "active (running)"
```

### Step 11.7: Test Application Endpoints

```bash
# Test main API health
curl http://localhost:5000/api/health

# Should return JSON with status

# Test streaming health
curl http://localhost:3000/health

# Should return: {"status":"ok","streaming":true}
```

**✅ Phase 11 Complete!** Applications are running with PM2.

---

## PHASE 12: UPDATE CLIENT STREAM CONFIGURATION

### Step 12.1: On Your Local Machine

Open your project in VS Code or any text editor.

### Step 12.2: Update Stream URLs in Client Code

Search for files containing stream URLs and update them:

**File 1: Check for stream configuration files**

```bash
# Search for stream URL references
# In your local project directory
cd C:\Users\15anu\Desktop\andar bahar\andar bahar

# Search in client code (PowerShell)
Get-ChildItem -Path .\client\src -Recurse -Filter *.tsx,*.ts | Select-String "91.108.110.72"
```

**Update any found files:**

Change from:
```typescript
const STREAM_URL = 'http://91.108.110.72:3000';
```

To:
```typescript
const STREAM_URL = 'https://stream.rajugarikossu.com';
```

### Step 12.3: Update Environment Configuration

Check if there's a client environment file:

```bash
# Check client .env files
cd client
dir .env*
```

If you have `.env.production`, update it:

```bash
VITE_STREAM_URL=https://stream.rajugarikossu.com
VITE_RTMP_URL=rtmp://rajugarikossu.com:1935/live
VITE_HLS_URL=https://rajugarikossu.com:8000/live/test/index.m3u8
```

### Step 12.4: Rebuild Client

```bash
# In client directory
npm run build
```

### Step 12.5: Re-upload Updated Client

```bash
# Go back to root
cd ..

# Upload updated client dist folder
scp -r client/dist root@YOUR_SERVER_IP:/var/www/andar-bahar/client/

# Enter password: Reddyanna@2003
```

### Step 12.6: Clear Browser Cache

On the server, you may want to add cache-busting:

```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Add versioning to assets (optional)
cd /var/www/andar-bahar/client/dist

# Check current files
ls -la
```

**✅ Phase 12 Complete!** Client stream URLs are updated.

---

## PHASE 13: CONFIGURE OBS FOR STREAMING

### Step 13.1: Download and Install OBS Studio

1. Go to: https://obsproject.com/
2. Click **"Download OBS Studio"**
3. Install OBS Studio on your computer
4. Open OBS Studio

### Step 13.2: Configure Streaming Settings

1. In OBS, click **"Settings"** (bottom right)
2. Navigate to **"Stream"** section

**Configure Stream Settings:**
```
Service: Custom
Server: rtmp://rajugarikossu.com:1935/live
Stream Key: test
```

3. Click **"Apply"**

### Step 13.3: Configure Output Settings

1. Still in Settings, click **"Output"**
2. Set Output Mode to: **"Advanced"**

**Streaming Tab:**
```
Audio Track: 1
Encoder: x264 (or NVENC if you have NVIDIA GPU)
Rate Control: CBR
Bitrate: 2500 Kbps (adjust based on your upload speed)
Keyframe Interval: 2
CPU Usage Preset: veryfast (or faster if your CPU is slow)
Profile: high
```

3. Click **"Apply"**

### Step 13.4: Configure Video Settings

1. Click **"Video"** in Settings

**Configure Video:**
```
Base (Canvas) Resolution: 1920x1080
Output (Scaled) Resolution: 1280x720 (or 1920x1080 for better quality)
Downscale Filter: Lanczos
FPS: 30 (or 60 for smoother stream)
```

2. Click **"Apply"**

### Step 13.5: Configure Audio Settings

1. Click **"Audio"** in Settings

**Configure Audio:**
```
Sample Rate: 48 kHz
Channels: Stereo
Desktop Audio Device: Default
Mic/Auxiliary Audio: Your microphone (if needed)
```

2. Click **"OK"** to close Settings

### Step 13.6: Add Sources

1. In the main OBS window, under **"Sources"**
2. Click **"+"** button

**Add these sources:**

**Screen Capture:**
```
- Click "+" → "Display Capture" (for Windows)
- Name it "Game Screen"
- Select your display
- Click "OK"
```

**Optional - Webcam:**
```
- Click "+" → "Video Capture Device"
- Name it "Webcam"
- Select your webcam
- Position and resize as needed
```

**Optional - Game Audio:**
```
- Click "+" → "Audio Output Capture"
- Select your game audio source
```

### Step 13.7: Test Stream Connection

1. Click **"Start Streaming"** button (bottom right)
2. OBS should connect to your server
3. Bottom status bar should show:
   ```
   LIVE - [time] | [bitrate] kb/s
   ```

### Step 13.8: Verify Stream is Working

**On your web browser:**
1. Go to: `https://stream.rajugarikossu.com`
2. You should see your stream playing
3. There will be a 3-10 second delay (normal for HLS)

**Check server logs:**
```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# View streaming logs
pm2 logs streaming-server

# Should show:
# [Connect] stream publish: /live/test
```

### Step 13.9: Stop Stream

When done testing:
1. In OBS, click **"Stop Streaming"**

**✅ Phase 13 Complete!** OBS is configured and streaming works.

---

## PHASE 14: TESTING & VERIFICATION

### Test 14.1: Website Access Test

**Test Main Website:**
```bash
# Open browser
# Go to: https://rajugarikossu.com
```

**Expected Results:**
- ✅ HTTPS connection (padlock icon)
- ✅ Login page loads properly
- ✅ No console errors (press F12 to check)
- ✅ Images and CSS load correctly
- ✅ No mixed content warnings

### Test 14.2: Admin Login Test

**Login as Admin:**
```
URL: https://rajugarikossu.com
Username: admin
Password: admin123
```

**Expected Results:**
- ✅ Login successful
- ✅ Redirects to admin dashboard
- ✅ Admin game control panel visible
- ✅ Can see "Start Game" button
- ✅ Statistics showing (may be zero initially)

**Test Admin Features:**
1. Try starting a new game
2. Check if timer starts
3. Verify game controls are responsive

### Test 14.3: Player Login Test

**Login as Test Player:**
```
URL: https://rajugarikossu.com
Phone: 9876543210
Password: player123
```

**Expected Results:**
- ✅ Login successful
- ✅ Shows game interface
- ✅ Balance displays: ₹1,00,000
- ✅ Betting interface visible
- ✅ Can see Andar/Bahar sides

### Test 14.4: WebSocket Connection Test

**Check Console (Press F12):**
```javascript
// Should see in console:
"WebSocket connected"
// or
"Connected to game server"
```

**On Server - Check Logs:**
```bash
pm2 logs andar-bahar-server | grep WebSocket

# Should show connection messages
```

### Test 14.5: Complete Game Flow Test

**As Admin:**
1. Click **"Start Game"**
2. Select an opening card (e.g., King of Hearts)
3. Click **"Deal Opening Card"**
4. Timer should start (30 seconds)

**As Player (different browser/incognito):**
1. Should see game started
2. Should see opening card
3. Should see timer counting down
4. Place a bet:
   - Click on Andar or Bahar
   - Select chip amount (e.g., ₹1,000)
   - Click "Place Bet"
5. Balance should decrease by bet amount

**As Admin:**
1. Wait for timer to end
2. Start dealing cards one by one
3. Continue until game completes
4. Winner should be announced

**Verify Results:**
- ✅ Game completes properly
- ✅ Winner announced correctly
- ✅ Player balance updates (win/loss)
- ✅ Game history saved
- ✅ Statistics updated

### Test 14.6: Streaming Test

**Start OBS Streaming:**
1. Open OBS Studio
2. Click "Start Streaming"
3. Wait 5-10 seconds

**Test Stream Player:**
```bash
# Open browser
# Go to: https://stream.rajugarikossu.com
```

**Expected Results:**
- ✅ Stream player loads
- ✅ Video appears (3-10 second delay is normal)
- ✅ Video plays smoothly
- ✅ Audio works (if configured)

**Test Stream in Game:**
1. Login to game as player
2. Stream should be embedded in game interface
3. Should show live stream

### Test 14.7: Payment System Test

**Create Deposit Request:**
1. Login as player
2. Go to deposit page
3. Create deposit request for ₹10,000
4. Submit request

**Admin Approval:**
1. Login as admin
2. Go to payment requests
3. Should see pending deposit
4. Approve the deposit

**Verify:**
- ✅ Player balance increases by deposit amount
- ✅ Transaction logged in history
- ✅ Bonus calculated (if applicable)

### Test 14.8: Database Verification

**SSH into server and check database:**

```bash
# Connect to server
ssh root@YOUR_SERVER_IP

# Check recent game sessions
# (Run these in Supabase SQL Editor)
```

**In Supabase SQL Editor:**

```sql
-- Check recent games
SELECT 
  game_id, 
  status, 
  opening_card, 
  winner, 
  created_at 
FROM game_sessions 
ORDER BY created_at DESC 
LIMIT 5;

-- Check recent bets
SELECT 
  user_id, 
  game_id, 
  side, 
  amount, 
  actual_payout, 
  status 
FROM player_bets 
ORDER BY created_at DESC 
LIMIT 10;

-- Check user balances
SELECT 
  phone, 
  balance, 
  games_played, 
  total_winnings, 
  total_losses 
FROM users 
WHERE games_played > 0
ORDER BY games_played DESC;
```

**Expected Results:**
- ✅ Games are being saved
- ✅ Bets are being recorded
- ✅ `actual_payout` is NOT NULL
- ✅ Balances are updating correctly

### Test 14.9: Performance Test

**Check Server Resources:**

```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Check PM2 status and resource usage
pm2 monit

# Should show:
# - CPU usage < 50%
# - Memory usage < 512MB (total)
# - Both processes "online"

# Press Ctrl+C to exit

# Check system resources
htop
# or
top

# Press q to exit
```

### Test 14.10: Error Handling Test

**Test Various Scenarios:**

1. **Invalid Login:**
   - Try wrong password
   - Should show error message

2. **Insufficient Balance:**
   - Try betting more than balance
   - Should show error

3. **Network Interruption:**
   - Disable internet briefly
   - Re-enable
   - Should reconnect automatically

4. **Rapid Actions:**
   - Try multiple rapid bets
   - Should handle gracefully

### Test 14.11: Mobile Responsiveness Test

**Test on Mobile Device:**
1. Open `https://rajugarikossu.com` on phone
2. Login as player
3. Test all features:
   - ✅ Layout adapts to mobile screen
   - ✅ Buttons are tappable
   - ✅ Stream works on mobile
   - ✅ Betting interface usable

### Test 14.12: SSL Security Test

**Online SSL Checker:**
1. Go to: https://www.ssllabs.com/ssltest/
2. Enter: `rajugarikossu.com`
3. Click "Submit"
4. Wait for results (2-3 minutes)

**Expected Results:**
- ✅ Grade: A or A+
- ✅ Certificate valid
- ✅ Chain complete
- ✅ Protocol support good

**✅ Phase 14 Complete!** All systems tested and verified.

---

## TROUBLESHOOTING COMMON ISSUES

### Issue 1: 502 Bad Gateway Error

**Symptoms:**
- Website shows "502 Bad Gateway"
- Unable to access site

**Solution:**

```bash
# Check if Node.js server is running
pm2 list

# If not running, check logs
pm2 logs andar-bahar-server --lines 100

# Common causes:
# 1. Port 5000 already in use
# 2. Environment variables missing
# 3. Database connection failed

# Restart the server
pm2 restart andar-bahar-server

# Check nginx error logs
tail -f /var/log/nginx/andar-bahar-error.log
```

### Issue 2: WebSocket Connection Failed

**Symptoms:**
- "WebSocket connection failed" in console
- Real-time updates not working

**Solution:**

```bash
# Check if WebSocket port is accessible
netstat -tulpn | grep :5000

# Test WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" \
  http://localhost:5000/ws

# Check nginx WebSocket proxy configuration
cat /etc/nginx/sites-available/andar-bahar | grep -A 10 "location /ws"

# Restart nginx
systemctl restart nginx
```

### Issue 3: Stream Not Loading

**Symptoms:**
- Stream player shows error
- Video doesn't load

**Solution:**

```bash
# Check if streaming server is running
pm2 logs streaming-server

# Check if RTMP port is open
netstat -tulpn | grep :1935

# Check if OBS is streaming
# In OBS, status should show "LIVE"

# Check if HLS files are being generated
ls -la /var/www/andar-bahar/live_stream/media/live/test/

# Should show .m3u8 and .ts files

# Restart streaming server
pm2 restart streaming-server

# Check if FFmpeg is working
ps aux | grep ffmpeg
```

### Issue 4: SSL Certificate Errors

**Symptoms:**
- "Your connection is not private" warning
- Certificate expired or invalid

**Solution:**

```bash
# Check certificate status
certbot certificates

# If expired, renew
certbot renew --force-renewal

# Restart nginx
systemctl restart nginx

# Test certificate
openssl s_client -connect rajugarikossu.com:443 -servername rajugarikossu.com
```

### Issue 5: Database Connection Errors

**Symptoms:**
- "Cannot connect to database" errors
- API returns 500 errors

**Solution:**

```bash
# Check .env file
cat /var/www/andar-bahar/.env | grep SUPABASE_URL

# Verify Supabase is accessible
curl -I https://YOUR_PROJECT_ID.supabase.co

# Test database connection
node -e "
require('dotenv').config({path: '/var/www/andar-bahar/.env'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY
);
supabase.from('users').select('count').then(console.log);
"

# Restart server
pm2 restart andar-bahar-server
```

### Issue 6: High CPU Usage

**Symptoms:**
- Server slow
- High CPU usage in PM2 monit

**Solution:**

```bash
# Check what's using CPU
top
# Press 'P' to sort by CPU

# Check PM2 logs for errors
pm2 logs --lines 200

# Possible causes:
# 1. Memory leak in application
# 2. Too many concurrent connections
# 3. Inefficient database queries

# Restart application
pm2 restart all

# If persistent, consider upgrading server resources
```

### Issue 7: Port Already in Use

**Symptoms:**
- "Port 5000 is already in use" error
- Application won't start

**Solution:**

```bash
# Find what's using port 5000
lsof -i :5000

# Kill the process (replace PID with actual process ID)
kill -9 PID

# Or kill all node processes
pkill -f node

# Restart with PM2
pm2 restart all
```

### Issue 8: File Permission Errors

**Symptoms:**
- "EACCES: permission denied" errors
- Cannot write to files

**Solution:**

```bash
# Fix permissions for application directory
cd /var/www
chown -R www-data:www-data andar-bahar
chmod -R 755 andar-bahar

# Fix permissions for streaming media directory
chmod -R 755 /var/www/andar-bahar/live_stream/media

# Restart applications
pm2 restart all
```

### Issue 9: Memory Issues

**Symptoms:**
- "JavaScript heap out of memory" errors
- Server becomes unresponsive

**Solution:**

```bash
# Check available memory
free -h

# Increase Node.js memory limit
pm2 delete andar-bahar-server
pm2 start dist/index.js --name "andar-bahar-server" \
  --node-args="--max-old-space-size=2048" \
  --env production

pm2 save

# Clear PM2 logs
pm2 flush

# Monitor memory usage
pm2 monit
```

### Issue 10: Slow Database Queries

**Symptoms:**
- Slow page loads
- API timeouts

**Solution:**

```sql
-- In Supabase SQL Editor
-- Check for slow queries
SELECT * FROM pg_stat_statements 
WHERE mean_exec_time > 1000 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Add missing indexes if needed
CREATE INDEX IF NOT EXISTS idx_player_bets_user_id ON player_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_player_bets_game_id ON player_bets(game_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);

-- Analyze tables
ANALYZE player_bets;
ANALYZE game_sessions;
ANALYZE users;
```

---

## MAINTENANCE & MONITORING

### Daily Monitoring

**Check Application Health:**

```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Check PM2 status
pm2 list

# View recent logs
pm2 logs --lines 50

# Check server resources
htop
```

### Weekly Tasks

```bash
# Update system packages
apt update && apt upgrade -y

# Check SSL certificate expiry
certbot certificates

# Clear old logs
pm2 flush

# Check disk space
df -h

# Clean up old log files
find /var/log -name "*.log" -mtime +30 -delete
```

### Monthly Tasks

```bash
# Restart applications (clears memory leaks)
pm2 restart all

# Update Node.js packages (test first!)
cd /var/www/andar-bahar
npm outdated
# Review and update if needed

# Database maintenance (in Supabase)
VACUUM ANALYZE;

# Backup database (in Supabase)
# Use Supabase dashboard backup feature
```

### Useful PM2 Commands

```bash
# View all processes
pm2 list

# View logs
pm2 logs
pm2 logs andar-bahar-server
pm2 logs streaming-server

# Monitor resources
pm2 monit

# Restart processes
pm2 restart all
pm2 restart andar-bahar-server

# Stop processes
pm2 stop all
pm2 stop andar-bahar-server

# Delete processes
pm2 delete all
pm2 delete andar-bahar-server

# Clear logs
pm2 flush

# Save process list
pm2 save

# Restore processes
pm2 resurrect
```

### Backup Strategy

**Database Backup:**
1. Supabase provides automatic backups
2. Go to Supabase Dashboard → Settings → Backups
3. Enable "Point in Time Recovery" for production

**Application Backup:**
```bash
# Create backup of application files
cd /var/www
tar -czf andar-bahar-backup-$(date +%Y%m%d).tar.gz andar-bahar/

# Store backup in safe location
# Consider using rsync to backup to another server
```

### Update Procedure

**Updating Application:**

```bash
# On local machine: build new version
cd C:\Users\15anu\Desktop\andar bahar\andar bahar
npm run build
npm run build:client

# Upload new files
scp -r dist root@YOUR_SERVER_IP:/var/www/andar-bahar/dist-new
scp -r client/dist root@YOUR_SERVER_IP:/var/www/andar-bahar/client/dist-new

# On server: swap files
ssh root@YOUR_SERVER_IP
cd /var/www/andar-bahar

# Backup current version
mv dist dist-old
mv client/dist client/dist-old

# Install new version
mv dist-new dist
mv client/dist-new client/dist

# Restart
pm2 restart all

# If issues occur, rollback:
# mv dist dist-failed
# mv dist-old dist
# pm2 restart all
```

---

## 🎉 DEPLOYMENT COMPLETE!

### Your Application is Now Live!

**URLs:**
- **Main Website:** https://rajugarikossu.com
- **WWW Subdomain:** https://www.rajugarikossu.com
- **Streaming Page:** https://stream.rajugarikossu.com
- **API Endpoint:** https://rajugarikossu.com/api
- **WebSocket:** wss://rajugarikossu.com/ws

**Admin Access:**
- **URL:** https://rajugarikossu.com
- **Username:** admin or rajugarikossu
- **Password:** admin123

**Test Player Access:**
- **URL:** https://rajugarikossu.com
- **Phone:** 9876543210
- **Password:** player123

**OBS Streaming:**
- **Server:** rtmp://rajugarikossu.com:1935/live
- **Stream Key:** test

### Security Reminders

1. ✅ Change default passwords after first login
2. ✅ Keep SSL certificates updated (automatic with certbot)
3. ✅ Regularly update system packages
4. ✅ Monitor server logs for suspicious activity
5. ✅ Keep database credentials secure
6. ✅ Enable Supabase Row Level Security for production
7. ✅ Implement rate limiting on sensitive endpoints
8. ✅ Regular backups of database and application

### Support Contacts

**Server Issues:**
- Qloudhost Support: https://qloudhost.com/support

**Domain Issues:**
- Namecheap Support: https://www.namecheap.com/support/

**Database Issues:**
- Supabase Support: https://supabase.com/support

---

## 📚 ADDITIONAL RESOURCES

**Documentation Files in Your Project:**
- `DATABASE_SETUP_GUIDE.md` - Database configuration details
- `STREAMING_QUICK_START.md` - Streaming setup guide
- `DEPLOYMENT_CHECKLIST.md` - Deployment verification checklist

**Online Resources:**
- Node.js Documentation: https://nodejs.org/docs
- Nginx Documentation: https://nginx.org/en/docs/
- PM2 Documentation: https://pm2.keymetrics.io/docs/
- Supabase Documentation: https://supabase.com/docs
- Let's Encrypt: https://letsencrypt.org/docs/

---

**Document Version:** 1.0  
**Last Updated:** November 9, 2024  
**Status:** Production Ready ✅
