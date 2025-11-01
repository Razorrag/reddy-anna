# 🧹 Clean Start: Domain Setup for raajugarikossu.com

## Your Info
- **Domain**: raajugarikossu.com
- **VPS IP**: 91.108.110.72
- **App Port**: 5000

---

## 🧹 PART 1: CLEANUP (Do This First!)

### Step 1: Find Your App Directory

```bash
# Find where your app is located
# Usually it's something like: /home/username/andar-bahar/app
# OR: /var/www/andar-bahar/app
# OR: ~/andar-bahar/app

# Check if PM2 knows:
pm2 info andar-bahar | grep "script path"
```

**Note down your app path:** `/path/to/your/andar-bahar/app`

---

### Step 2: Remove Old Certificate Files from App Directory

```bash
# Replace /path/to/your/andar-bahar/app with your actual path
cd /path/to/your/andar-bahar/app

# Remove old certificate files if they exist
rm -f server.key
rm -f server.crt
rm -f cert.key
rm -f cert.crt
rm -f ssl.key
rm -f ssl.crt

# Verify they're gone
ls -la *.key *.crt 2>/dev/null || echo "✅ All certificate files removed"
```

---

### Step 3: Disable HTTPS in .env File

```bash
# Edit .env file
nano .env
```

**Find these lines and REMOVE or COMMENT them out:**
```
HTTPS_ENABLED=true
SSL_KEY_PATH=./server.key
SSL_CERT_PATH=./server.crt
```

**Make sure you have:**
```
PORT=5000
# HTTPS_ENABLED=false  (or just remove HTTPS lines)
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

---

### Step 4: Delete Let's Encrypt Certificates

```bash
# Delete all Let's Encrypt certificates for this domain
sudo certbot delete --cert-name raajugarikossu.com

# If that doesn't work, manually remove:
sudo rm -rf /etc/letsencrypt/live/raajugarikossu.com
sudo rm -rf /etc/letsencrypt/archive/raajugarikossu.com
sudo rm -rf /etc/letsencrypt/renewal/raajugarikossu.com.conf

# Remove renewal hooks if they exist
sudo rm -f /etc/letsencrypt/renewal-hooks/deploy/restart-raajugarikossu.sh

# Verify they're gone
ls -la /etc/letsencrypt/live/raajugarikossu.com 2>/dev/null || echo "✅ Certificates removed"
```

---

### Step 5: Restart App (Running Without HTTPS)

```bash
# Restart your app so it runs without HTTPS
pm2 restart andar-bahar

# Check logs - should NOT mention SSL/HTTPS
pm2 logs andar-bahar --lines 20
```

**You should see something like:**
```
✅ Server running on http://0.0.0.0:5000
```
**(NOT HTTPS - just HTTP)**

---

### ✅ Cleanup Complete!

Your app should now be running on **HTTP only** (no certificates). This is a clean slate.

---

## 🚀 PART 2: FRESH SETUP (Step by Step)

### STEP 1: Configure DNS (Very Important!)

**Before we can get certificates, DNS MUST point to your VPS IP.**

#### If Using Cloudflare:

1. Go to https://dash.cloudflare.com
2. Select domain: **raajugarikossu.com**
3. Click **DNS** on left sidebar
4. Find the **A record** for `raajugarikossu.com`
5. **Click the ORANGE cloud icon** → It turns **GRAY** (this disables proxy)
6. Make sure **IP address** is: `91.108.110.72`
7. Click **Save**

#### If NOT Using Cloudflare:

1. Go to your domain registrar (where you bought the domain)
2. Find **DNS Management** or **DNS Settings**
3. Add/Edit **A Record**:
   - **Type**: A
   - **Name/Host**: `@` (or leave blank, or `raajugarikossu.com`)
   - **Value/Target/IP**: `91.108.110.72`
   - **TTL**: 3600 (or default)

---

### STEP 2: Wait and Verify DNS

**DNS changes take 5-10 minutes (sometimes up to 48 hours)**

```bash
# Wait 5-10 minutes, then check:
dig raajugarikossu.com +short

# MUST return: 91.108.110.72
# If you see Cloudflare IPs (like 3.33.130.190), proxy is still ON!
```

**Keep checking until you see `91.108.110.72`**

---

### STEP 3: Install Certbot

```bash
sudo apt update
sudo apt install certbot -y

# Verify
certbot --version
```

---

### STEP 4: Stop Everything Using Port 80

**Certbot needs port 80 free to verify your domain.**

```bash
# Check what's using port 80
sudo lsof -i :80
# OR
sudo netstat -tuln | grep :80

# Stop Nginx if running:
sudo systemctl stop nginx

# Stop Apache if running:
sudo systemctl stop apache2

# Stop your app temporarily:
pm2 stop andar-bahar

# If something else is using port 80, kill it:
# sudo lsof -i :80  # Find the PID
# sudo kill -9 <PID>  # Replace <PID> with actual number

# Verify port 80 is FREE (should return nothing):
sudo lsof -i :80
```

---

### STEP 5: Get Certificate

```bash
# Get certificate
sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com
```

**Follow the prompts:**
1. **Email**: Enter your email (for renewal notifications)
2. **Terms**: Type `A` and press Enter (to agree)
3. **Share email**: Type `Y` or `N` (your choice)

**Wait for it to complete...**

**If it says "Congratulations!" = Success ✅**
**If it errors = Check DNS is pointing to 91.108.110.72**

---

### STEP 6: Copy Certificates to App Directory

```bash
# Go to your app directory (replace with your actual path)
cd /path/to/your/andar-bahar/app

# Copy certificates
sudo cp /etc/letsencrypt/live/raajugarikossu.com/privkey.pem ./server.key
sudo cp /etc/letsencrypt/live/raajugarikossu.com/fullchain.pem ./server.crt

# Set correct ownership (replace 'your-username' with your actual username)
sudo chown $USER:$USER server.key server.crt

# Set correct permissions
chmod 600 server.key
chmod 644 server.crt

# Verify files exist
ls -la server.key server.crt
```

---

### STEP 7: Update .env File

```bash
# Edit .env file
nano .env
```

**Add/Update these lines:**
```
PORT=5000
HTTPS_ENABLED=true
SSL_KEY_PATH=./server.key
SSL_CERT_PATH=./server.crt
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

---

### STEP 8: Restart Your App

```bash
# Rebuild (if needed)
npm run build

# Restart app
pm2 restart andar-bahar

# Check logs
pm2 logs andar-bahar --lines 50
```

**Look for these messages:**
```
✅ SSL key loaded from: ./server.key
✅ SSL certificate loaded from: ./server.crt
✅ HTTPS server serving on https://0.0.0.0:5000
```

**If you see errors, check:**
- Certificate files exist: `ls -la server.key server.crt`
- File permissions: `chmod 600 server.key && chmod 644 server.crt`
- .env has correct paths

---

### STEP 9: Restart Services You Stopped

```bash
# Restart Nginx (if you stopped it):
sudo systemctl start nginx

# Restart Apache (if you stopped it):
sudo systemctl start apache2
```

---

### STEP 10: Test HTTPS

**Open in browser:**
```
https://raajugarikossu.com:5000
```

**✅ Should see green padlock! No security warnings!**

---

## ✅ Verify Everything Works

### Test 1: Check Certificate
```bash
cd /path/to/your/andar-bahar/app
openssl x509 -in server.crt -text -noout | grep "Subject:"
# Should show: CN = raajugarikossu.com
```

### Test 2: Test HTTPS from Server
```bash
curl -k https://raajugarikossu.com:5000/api/health
```

### Test 3: Test in Browser
- Open: `https://raajugarikossu.com:5000`
- Should see **green padlock** 🔒
- No "Not Secure" warning

---

## 🔄 Auto-Renewal Setup (Important!)

**Certificates expire in 90 days. Set up auto-renewal:**

```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# Enable auto-renewal timer
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Check status
sudo systemctl status certbot.timer
```

**✅ Auto-renewal is now set up!**

---

## 🔥 Firewall (If Not Already Done)

```bash
# Open required ports
sudo ufw allow 80/tcp      # HTTP (for Let's Encrypt)
sudo ufw allow 5000/tcp    # HTTPS (your app)
sudo ufw allow 443/tcp     # HTTPS (standard)

# Check status
sudo ufw status
```

---

## 🆘 Common Problems

### Problem: "DNS not pointing to 91.108.110.72"
**Solution:**
- Check Cloudflare: Make sure cloud is GRAY (not orange)
- Wait longer for DNS propagation
- Check: `dig raajugarikossu.com +short`

### Problem: "Port 80 already in use"
**Solution:**
```bash
sudo lsof -i :80  # Find what's using it
# Stop that service, then try certbot again
```

### Problem: "Certificate files not found"
**Solution:**
```bash
# Check if certificates exist:
ls -la /etc/letsencrypt/live/raajugarikossu.com/

# Make sure you copied them:
cd /path/to/your/app
ls -la server.key server.crt
```

### Problem: "App still running HTTP"
**Solution:**
- Check .env has `HTTPS_ENABLED=true`
- Check certificate files exist: `ls -la server.key server.crt`
- Check logs: `pm2 logs andar-bahar`
- Restart: `pm2 restart andar-bahar`

---

## 📋 Quick Checklist

- [ ] **Part 1: Cleanup done** (old certificates removed)
- [ ] **DNS configured** (pointing to 91.108.110.72)
- [ ] **DNS verified** (`dig raajugarikossu.com +short` = 91.108.110.72)
- [ ] **Certbot installed**
- [ ] **Port 80 free** (stopped nginx/apache/app)
- [ ] **Certificate obtained** (certbot success)
- [ ] **Certificates copied** to app directory
- [ ] **.env updated** (HTTPS_ENABLED=true)
- [ ] **App restarted** (pm2 restart)
- [ ] **HTTPS working** (green padlock in browser)
- [ ] **Auto-renewal enabled**

---

## 🎉 Done!

Your app is now accessible at:
- **https://raajugarikossu.com:5000** ✅

**With trusted SSL certificate and green padlock!**

---

## 📞 Quick Reference Commands

```bash
# Check DNS
dig raajugarikossu.com +short

# Get certificate
sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com

# Copy certificates (replace path)
cd /path/to/your/andar-bahar/app
sudo cp /etc/letsencrypt/live/raajugarikossu.com/privkey.pem ./server.key
sudo cp /etc/letsencrypt/live/raajugarikossu.com/fullchain.pem ./server.crt

# Restart app
pm2 restart andar-bahar

# Check logs
pm2 logs andar-bahar --lines 50
```










