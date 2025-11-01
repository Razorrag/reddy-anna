# 🌐 Domain Setup Guide for 91.108.110.72

## Using a Domain Name Instead of IP Address

If you have a domain name, you can:
- ✅ Use **Let's Encrypt** for free trusted certificates (no browser warnings!)
- ✅ Better security and user experience
- ✅ Professional setup

---

## 📋 Prerequisites

1. **Domain name**: `raajugarikossu.com` (or `raajugarikossu` - add .com, .net, etc. as needed)
2. **DNS configured** to point to your VPS IP:
   - `A record`: `raajugarikossu.com` → `91.108.110.72`
   - `A record`: `www.raajugarikossu.com` → `91.108.110.72` (optional)

### Check DNS Configuration

```bash
# Verify DNS is pointing to your VPS
dig raajugarikossu.com
nslookup raajugarikossu.com

# Should return: 91.108.110.72
```

---

## 🚀 Quick Setup Steps

### Step 1: Install Certbot

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot -y

# CentOS/RHEL
sudo yum install certbot -y

# Verify installation
certbot --version
```

---

### Step 2: Stop Application Temporarily

```bash
# Stop PM2 application (Let's Encrypt needs port 80)
pm2 stop andar-bahar
```

---

### Step 3: Get Let's Encrypt Certificate

**Your domain: `raajugarikossu.com`**

```bash
# Get certificate for raajugarikossu.com
sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com

# Follow prompts:
# - Enter email address (for renewal notifications)
# - Agree to terms
# - Choose whether to share email with EFF
```

**Certificate files will be created at:**
```
/etc/letsencrypt/live/raajugarikossu.com/
├── privkey.pem      # Private key
├── fullchain.pem    # Certificate + chain (USE THIS!)
├── cert.pem         # Certificate only
└── chain.pem        # Chain only
```

---

### Step 4: Copy Certificates to App Directory

```bash
# Copy certificates to your app directory
sudo cp /etc/letsencrypt/live/raajugarikossu.com/privkey.pem ./server.key
sudo cp /etc/letsencrypt/live/raajugarikossu.com/fullchain.pem ./server.crt

# Set ownership and permissions
sudo chown $USER:$USER server.key server.crt
chmod 600 server.key
chmod 644 server.crt
```

---

### Step 5: Configure .env File

```bash
# Add to your .env file
PORT=5000
HTTPS_ENABLED=true
SSL_KEY_PATH=./server.key
SSL_CERT_PATH=./server.crt
# Don't set HTTPS_PORT - it will use PORT (5000) for HTTPS
```

**OR use Let's Encrypt paths directly (requires root):**
```bash
HTTPS_ENABLED=true
SSL_KEY_PATH=/etc/letsencrypt/live/raajugarikossu.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/raajugarikossu.com/fullchain.pem
```

---

### Step 6: Start Application

```bash
# Rebuild if needed
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save

# Check logs
pm2 logs andar-bahar --lines 50
```

---

### Step 7: Access via Domain

**HTTPS URL:**
```
https://raajugarikossu.com:5000
```

**Or if using port 443:**
```
https://raajugarikossu.com
```

---

## 🔄 Auto-Renewal Setup

Let's Encrypt certificates expire every 90 days. Set up auto-renewal:

```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# Enable auto-renewal timer (systemd)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Check timer status
sudo systemctl status certbot.timer
```

### Renewal Script (Restart App After Renewal)

```bash
# Create renewal hook script
sudo nano /etc/letsencrypt/renewal-hooks/deploy/restart-app.sh
```

Add this content:
```bash
#!/bin/bash
# Copy renewed certificates for raajugarikossu.com
cp /etc/letsencrypt/live/raajugarikossu.com/privkey.pem /path/to/your/app/server.key
cp /etc/letsencrypt/live/raajugarikossu.com/fullchain.pem /path/to/your/app/server.crt
chown your-user:your-user /path/to/your/app/server.key /path/to/your/app/server.crt
chmod 600 /path/to/your/app/server.key
chmod 644 /path/to/your/app/server.crt

# Restart PM2 application
pm2 restart andar-bahar
```

Make executable:
```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/restart-app.sh
```

---

## 🌍 DNS Configuration Examples

### Using Cloudflare (Recommended)

1. Add domain to Cloudflare
2. Add A record:
   - **Type**: A
   - **Name**: `@` or `raajugarikossu.com`
   - **IPv4 address**: `91.108.110.72`
   - **Proxy**: Off (gray cloud) - for Let's Encrypt
3. Add www record (optional):
   - **Type**: A
   - **Name**: `www`
   - **IPv4 address**: `91.108.110.72`

### Using Other DNS Providers

Same A record configuration:
- **Name**: `@` or `raajugarikossu.com` (or leave blank)
- **Type**: A
- **Value**: `91.108.110.72`
- **TTL**: 3600 (or default)

---

## 🔧 Using Port 443 (Standard HTTPS)

For standard HTTPS (no port in URL), use port 443:

```bash
# In .env
PORT=5000
HTTPS_PORT=443
HTTPS_ENABLED=true
SSL_KEY_PATH=./server.key
SSL_CERT_PATH=./server.crt
HTTP_TO_HTTPS_REDIRECT=true
```

**Access via:** `https://raajugarikossu.com` (no port needed!)

**Note:** Port 443 requires root privileges. Run PM2 with sudo:
```bash
sudo pm2 start ecosystem.config.js --env production
```

---

## ✅ Verification

### Test Certificate

```bash
# Check certificate details
openssl x509 -in server.crt -text -noout | grep -A 2 "Subject:"

# Should show: CN = raajugarikossu.com
```

### Test HTTPS

```bash
# Test from server
curl -k https://raajugarikossu.com:5000/api/health

# Test from browser
https://raajugarikossu.com:5000
```

### Test WebSocket

```javascript
// In browser console
const ws = new WebSocket('wss://raajugarikossu.com:5000/ws');
ws.onopen = () => console.log('✅ WebSocket connected');
ws.onerror = (e) => console.error('❌ WebSocket error:', e);
```

---

## 🔐 Security Best Practices

1. **Use fullchain.pem** - Always use `fullchain.pem`, not just `cert.pem`
2. **Auto-renewal** - Set up automatic certificate renewal
3. **Keep certificates secure** - Don't commit to git
4. **Monitor expiration** - Check certificate expiration regularly

---

## 🐛 Troubleshooting

### DNS Not Propagated

```bash
# Check if DNS is pointing to your VPS
dig raajugarikossu.com +short
# Should return: 91.108.110.72

# Wait for DNS propagation (can take up to 48 hours)
```

### Certificate Generation Failed

**Error: "Failed to verify domain"**
- Check DNS is pointing to `91.108.110.72`
- Ensure port 80 is open: `sudo ufw allow 80/tcp`
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

## 📝 Summary

**With Domain:**
- ✅ Free trusted certificates (Let's Encrypt)
- ✅ No browser warnings
- ✅ Professional setup
- ✅ Better user experience

**Configuration:**
```bash
PORT=5000
HTTPS_ENABLED=true
SSL_KEY_PATH=./server.key
SSL_CERT_PATH=./server.crt
```

**Access:**
- `https://raajugarikossu.com:5000`
- Or `https://raajugarikossu.com` (if using port 443)

---

**Ready to set up? Share your domain name and I'll provide specific commands!** 🚀

