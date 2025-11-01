# 🔧 Fix Cloudflare DNS Issue for raajugarikossu.com

## Problem Identified

Your domain `raajugarikossu.com` is pointing to **Cloudflare IPs** (3.33.130.190, 15.197.148.33) instead of your VPS IP (91.108.110.72).

**This means:**
- DNS is proxied through Cloudflare (gray/orange cloud is ON)
- Let's Encrypt can't verify directly (gets redirected)
- Need to disable Cloudflare proxy OR use DNS challenge

---

## ✅ Solution 1: Disable Cloudflare Proxy (Easiest)

### Step 1: Go to Cloudflare Dashboard

1. Login to [Cloudflare](https://dash.cloudflare.com)
2. Select domain: `raajugarikossu.com`
3. Go to **DNS** settings

### Step 2: Disable Proxy (Turn Cloud Gray)

Find your A records:
- `raajugarikossu.com` → Currently proxied (orange cloud)
- `www.raajugarikossu.com` → Currently proxied (orange cloud)

**Click the orange/gray cloud icons** to turn them **gray (DNS only)**:
- **Orange cloud** = Proxied (won't work with Let's Encrypt HTTP challenge)
- **Gray cloud** = DNS only (will point directly to your VPS)

### Step 3: Update A Record Values

Change the IP address to your VPS IP:
- **Type**: A
- **Name**: `@` or `raajugarikossu.com`
- **IPv4 address**: `91.108.110.72` ← Change to this!
- **Proxy status**: **Gray cloud** (DNS only)

Do the same for `www`:
- **Type**: A
- **Name**: `www`
- **IPv4 address**: `91.108.110.72`
- **Proxy status**: **Gray cloud** (DNS only)

### Step 4: Wait for DNS Propagation

```bash
# Check DNS (should now show 91.108.110.72, not Cloudflare IPs)
dig raajugarikossu.com +short
# Should return: 91.108.110.72

nslookup raajugarikossu.com
# Should show: 91.108.110.72
```

**Wait 5-10 minutes** for DNS to propagate.

### Step 5: Get Certificate Again

```bash
# Make sure port 80 is free
sudo lsof -i :80

# Stop any service using port 80
sudo systemctl stop nginx  # or apache2

# Get certificate
sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com
```

---

## ✅ Solution 2: Use DNS Challenge (Keep Cloudflare Proxy ON)

If you want to keep Cloudflare proxy enabled, use DNS challenge instead:

### Step 1: Install Cloudflare Plugin

```bash
# Install certbot with Cloudflare plugin
sudo apt install python3-pip -y
sudo pip3 install certbot-dns-cloudflare
```

### Step 2: Get Cloudflare API Token

1. Go to Cloudflare Dashboard
2. Go to **My Profile** → **API Tokens**
3. Click **Create Token**
4. Use template: **Edit zone DNS**
5. Select zone: `raajugarikossu.com`
6. Copy the token

### Step 3: Create Cloudflare Credentials File

```bash
# Create directory
mkdir -p ~/.secrets
chmod 700 ~/.secrets

# Create credentials file
nano ~/.secrets/cloudflare.ini
```

Add this (replace with your actual token):
```ini
# Cloudflare API credentials
dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN_HERE
```

Save: `Ctrl+X`, `Y`, `Enter`

Set permissions:
```bash
chmod 600 ~/.secrets/cloudflare.ini
```

### Step 4: Get Certificate with DNS Challenge

```bash
# Get certificate using DNS challenge (doesn't need port 80!)
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d raajugarikossu.com \
  -d www.raajugarikossu.com
```

---

## 🚀 Recommended: Solution 1 (Disable Proxy)

**Easier and faster:**
1. Disable Cloudflare proxy (gray cloud)
2. Update A record IP to `91.108.110.72`
3. Wait for DNS propagation
4. Get certificate with HTTP challenge

---

## ✅ Quick Fix Steps

```bash
# 1. Check current DNS (showing Cloudflare IPs)
dig raajugarikossu.com +short
# Shows: 3.33.130.190 (Cloudflare) - WRONG!

# 2. After fixing in Cloudflare, check again
dig raajugarikossu.com +short
# Should show: 91.108.110.72 - CORRECT!

# 3. Once DNS is correct, get certificate
sudo systemctl stop nginx  # or whatever is using port 80
sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com
sudo systemctl start nginx

# 4. Copy certificates
sudo cp /etc/letsencrypt/live/raajugarikossu.com/privkey.pem ./server.key
sudo cp /etc/letsencrypt/live/raajugarikossu.com/fullchain.pem ./server.crt
sudo chown $USER:$USER server.key server.crt
chmod 600 server.key
chmod 644 server.crt
```

---

## 📝 Cloudflare DNS Settings Summary

**Before (WRONG):**
- IP: `3.33.130.190` or `15.197.148.33` (Cloudflare)
- Proxy: **ON** (Orange cloud)
- Result: Can't verify with Let's Encrypt HTTP challenge

**After (CORRECT):**
- IP: `91.108.110.72` (Your VPS)
- Proxy: **OFF** (Gray cloud)
- Result: Let's Encrypt can verify directly

---

## 🐛 Also Fix: PM2 Process Not Found

Your PM2 app isn't running. After getting certificate:

```bash
# Check PM2 status
pm2 status

# If app is not there, start it
cd /path/to/your/andar-bahar/app
npm run build
pm2 start ecosystem.config.js --env production
pm2 save

# Check status
pm2 list
pm2 logs andar-bahar
```

---

## ✅ After DNS is Fixed

1. **Verify DNS points to VPS:**
   ```bash
   dig raajugarikossu.com +short
   # Must show: 91.108.110.72
   ```

2. **Get certificate:**
   ```bash
   sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com
   ```

3. **Configure and restart:**
   ```bash
   # Copy certificates
   sudo cp /etc/letsencrypt/live/raajugarikossu.com/privkey.pem ./server.key
   sudo cp /etc/letsencrypt/live/raajugarikossu.com/fullchain.pem ./server.crt
   
   # Start PM2
   cd /path/to/your/app
   pm2 start ecosystem.config.js --env production
   ```

---

**Next Step:** Go to Cloudflare dashboard and:
1. Find A record for `raajugarikossu.com`
2. Click the orange cloud → Turn it gray
3. Change IP to `91.108.110.72`
4. Save changes

Then wait 5-10 minutes and try certbot again!











