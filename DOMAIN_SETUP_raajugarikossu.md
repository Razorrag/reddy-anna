# 🌐 Domain Setup for raajugarikossu.com

## Your Domain: raajugarikossu.com
## Your VPS IP: 91.108.110.72

---

## 🚀 Quick Setup Steps

### Step 1: Configure DNS

**⚠️ IMPORTANT: If using Cloudflare, disable proxy!**

**Point your domain to your VPS:**

1. **If using Cloudflare:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Select domain: `raajugarikossu.com`
   - Go to **DNS** settings
   - Find A records for `raajugarikossu.com`
   - **Click orange cloud** → Turn it **GRAY** (DNS only, not proxied)
   - **Update IP to**: `91.108.110.72`
   - Save changes

2. **If NOT using Cloudflare (direct DNS):**
   - **Go to your domain registrar** (where you bought raajugarikossu.com)
   - **Add/Update A Record:**
     - **Type**: A
     - **Host/Name**: `@` or `raajugarikossu.com` (or leave blank)
     - **Value/IP**: `91.108.110.72` ← **Must be this IP!**
     - **TTL**: 3600 (or default)

3. **Add www record (optional):**
   - **Type**: A
   - **Host/Name**: `www`
   - **Value/IP**: `91.108.110.72`
   - **Proxy**: Gray (if Cloudflare) or DNS only

**Wait for DNS propagation** (usually 5-10 minutes, can take up to 48 hours)

**Verify DNS:**
```bash
dig raajugarikossu.com +short
# MUST return: 91.108.110.72 (NOT Cloudflare IPs like 3.33.130.190!)

nslookup raajugarikossu.com
# Should show: 91.108.110.72

# If you see Cloudflare IPs (3.33.130.190, 15.197.148.33), 
# the proxy is still ON - turn it OFF in Cloudflare!
```

---

### Step 2: Install Certbot

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot -y

# Verify installation
certbot --version
```

---

### Step 3: Stop Services Using Port 80

**Let's Encrypt needs port 80 free temporarily.**

```bash
# Check what's using port 80
sudo lsof -i :80
# OR
sudo netstat -tuln | grep :80

# Stop the service (common ones below):

# If Nginx is running:
sudo systemctl stop nginx

# If Apache is running:
sudo systemctl stop apache2
# OR
sudo systemctl stop httpd

# If PM2 is using port 80:
pm2 stop andar-bahar

# If unknown process, find and kill:
sudo lsof -i :80  # Find PID
sudo kill -9 PID   # Replace PID with actual process ID

# Verify port 80 is free
sudo lsof -i :80
# Should return nothing
```

---

### Step 4: Get Let's Encrypt Certificate

```bash
# Get certificate for raajugarikossu.com
sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com

# Follow prompts:
# - Email: Enter your email for renewal notifications
# - Terms: Type 'A' to agree
# - Share email: Your choice (Y or N)
```

**Certificate location:**
```
/etc/letsencrypt/live/raajugarikossu.com/
├── privkey.pem
├── fullchain.pem  ← USE THIS!
├── cert.pem
└── chain.pem
```

---

### Step 5: Copy Certificates to App Directory

```bash
# Copy certificates (replace /path/to/your/app with your actual path)
cd /path/to/your/andar-bahar/app

sudo cp /etc/letsencrypt/live/raajugarikossu.com/privkey.pem ./server.key
sudo cp /etc/letsencrypt/live/raajugarikossu.com/fullchain.pem ./server.crt

# Set ownership and permissions
sudo chown $USER:$USER server.key server.crt
chmod 600 server.key
chmod 644 server.crt

# Verify files exist
ls -la server.key server.crt
```

---

### Step 6: Configure .env File

```bash
# Edit .env file
nano .env
```

**Add/Update these lines:**
```bash
PORT=5000
HTTPS_ENABLED=true
SSL_KEY_PATH=./server.key
SSL_CERT_PATH=./server.crt
# Don't set HTTPS_PORT - it will use PORT (5000) for HTTPS
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

---

### Step 7: Restart Services and Start Application

```bash
# Restart the service you stopped (if needed)
# If you stopped Nginx:
sudo systemctl start nginx

# If you stopped Apache:
sudo systemctl start apache2

# Rebuild if needed
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save

# Check logs
pm2 logs andar-bahar --lines 50
```

**Look for:**
```
✅ SSL key loaded from: ./server.key
✅ SSL certificate loaded from: ./server.crt
✅ HTTPS server serving on https://0.0.0.0:5000
```

---

### Step 8: Access Your Application

**HTTPS URL:**
```
https://raajugarikossu.com:5000
```

**✅ Should see green padlock in browser!** (No security warnings!)

---

## 🔄 Auto-Renewal Setup

Let's Encrypt certificates expire every 90 days. Set up auto-renewal:

```bash
# Test renewal
sudo certbot renew --dry-run

# Enable auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Check status
sudo systemctl status certbot.timer
```

### Renewal Hook (Restart App After Renewal)

Create renewal hook script:

```bash
# Create hook directory
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy

# Create script (replace /path/to/your/app with actual path)
sudo nano /etc/letsencrypt/renewal-hooks/deploy/restart-raajugarikossu.sh
```

**Add this content:**
```bash
#!/bin/bash
# Renewal hook for raajugarikossu.com

APP_PATH="/path/to/your/andar-bahar/app"
USER="your-username"  # Replace with your VPS username

# Copy renewed certificates
cp /etc/letsencrypt/live/raajugarikossu.com/privkey.pem $APP_PATH/server.key
cp /etc/letsencrypt/live/raajugarikossu.com/fullchain.pem $APP_PATH/server.crt
chown $USER:$USER $APP_PATH/server.key $APP_PATH/server.crt
chmod 600 $APP_PATH/server.key
chmod 644 $APP_PATH/server.crt

# Restart PM2 application
pm2 restart andar-bahar
```

**Make executable:**
```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/restart-raajugarikossu.sh
```

---

## ✅ Verification

### Test Certificate

```bash
# Check certificate
openssl x509 -in server.crt -text -noout | grep -A 2 "Subject:"
# Should show: CN = raajugarikossu.com

# Check expiration
openssl x509 -in server.crt -text -noout | grep -A 2 "Validity"
```

### Test HTTPS

```bash
# From server
curl -k https://raajugarikossu.com:5000/api/health

# From browser
https://raajugarikossu.com:5000
```

### Test WebSocket

```javascript
// In browser console
const ws = new WebSocket('wss://raajugarikossu.com:5000/ws');
ws.onopen = () => console.log('✅ WebSocket connected');
ws.onerror = (e) => console.error('❌ WebSocket error:', e);
```

### Test Screen Sharing

1. Open: `https://raajugarikossu.com:5000`
2. Login as admin
3. Go to Admin Panel → Stream Control
4. Click "Start Screen Share"
5. Should work perfectly with trusted certificate! ✅

---

## 🔥 Firewall Configuration

```bash
# Open required ports
sudo ufw allow 80/tcp      # HTTP (for Let's Encrypt verification)
sudo ufw allow 5000/tcp    # HTTPS (your app)
sudo ufw allow 443/tcp     # HTTPS (if using standard port)

# WebRTC ports (for screen sharing)
sudo ufw allow 3478/udp    # STUN/TURN
sudo ufw allow 49152:65535/udp  # RTP/RTCP ports

# Enable firewall
sudo ufw enable
sudo ufw status
```

---

## 🐛 Troubleshooting

### DNS Not Working

```bash
# Check DNS propagation
dig raajugarikossu.com +short
nslookup raajugarikossu.com

# If not pointing to 91.108.110.72:
# 1. Check DNS settings at domain registrar
# 2. Wait for propagation (can take up to 48 hours)
# 3. Clear DNS cache: sudo systemd-resolve --flush-caches
```

### Certificate Generation Failed

**Error: "Failed to verify domain"**
- Ensure DNS is pointing to `91.108.110.72`
- Wait for DNS propagation
- Check port 80 is open: `sudo ufw allow 80/tcp`
- Make sure nothing is using port 80

**Error: "Port 80 already in use"**
```bash
# Check what's using port 80
sudo lsof -i :80

# Stop conflicting service (e.g., Nginx)
sudo systemctl stop nginx

# Get certificate
sudo certbot certonly --standalone -d raajugarikossu.com

# Restart service
sudo systemctl start nginx
```

### Certificate Expired

```bash
# Renew manually
sudo certbot renew

# Copy renewed certificates
sudo cp /etc/letsencrypt/live/raajugarikossu.com/privkey.pem ./server.key
sudo cp /etc/letsencrypt/live/raajugarikossu.com/fullchain.pem ./server.crt

# Restart app
pm2 restart andar-bahar
```

---

## 📝 Configuration Summary

| Item | Value |
|------|-------|
| Domain | raajugarikossu.com |
| VPS IP | 91.108.110.72 |
| Port | 5000 |
| HTTPS URL | https://raajugarikossu.com:5000 |
| WebSocket URL | wss://raajugarikossu.com:5000/ws |
| Certificate | Let's Encrypt (auto-renewing) |

---

## ✅ Checklist

- [ ] DNS A record configured (`raajugarikossu.com` → `91.108.110.72`)
- [ ] DNS propagation verified (`dig raajugarikossu.com`)
- [ ] Certbot installed
- [ ] Certificate obtained (`/etc/letsencrypt/live/raajugarikossu.com/`)
- [ ] Certificates copied to app directory (`server.key`, `server.crt`)
- [ ] `.env` configured with HTTPS settings
- [ ] Application rebuilt (`npm run build`)
- [ ] PM2 restarted (`pm2 restart andar-bahar`)
- [ ] Firewall configured (ports 80, 5000 open)
- [ ] HTTPS accessible (`https://raajugarikossu.com:5000`)
- [ ] Auto-renewal configured
- [ ] Screen sharing tested and working

---

**Ready!** Your application is now accessible at `https://raajugarikossu.com:5000` with trusted SSL certificate! 🎉

---

## 🔗 Quick Reference Commands

```bash
# Check DNS
dig raajugarikossu.com +short

# Get certificate
sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com

# Copy certificates
sudo cp /etc/letsencrypt/live/raajugarikossu.com/privkey.pem ./server.key
sudo cp /etc/letsencrypt/live/raajugarikossu.com/fullchain.pem ./server.crt

# Restart app
pm2 restart andar-bahar

# Test HTTPS
curl -k https://raajugarikossu.com:5000/api/health
```

