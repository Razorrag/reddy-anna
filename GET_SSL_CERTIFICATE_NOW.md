# 🔒 Get SSL Certificate - Step by Step

## Current Status
- ✅ DNS is configured (shows `91.108.110.72` in results)
- ✅ Certbot is installed
- ✅ Nginx is stopped
- ✅ App is stopped
- ❌ **Certificate NOT obtained yet** (that's why copy failed)

---

## 🚀 Step-by-Step: Get Your SSL Certificate

### Step 1: Verify Port 80 is Free

```bash
# Check what's using port 80 (should be empty)
sudo lsof -i :80

# If something is using it, you'll see output - stop that service
# If it's empty, you're good to proceed
```

**Expected output:** Nothing (empty) = Port 80 is free ✅

---

### Step 2: Get SSL Certificate with Certbot

**You're currently in: `~/reddy-anna`**

Run this command:

```bash
sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com
```

**Follow the prompts:**

1. **Enter email address**: Enter your email (for renewal notifications)
   - Press Enter

2. **Please read the Terms of Service**: 
   - Type `A` (to agree)
   - Press Enter

3. **Would you like to share your email address**: 
   - Type `Y` or `N` (your choice)
   - Press Enter

4. **Waiting for verification...** 
   - Certbot will try to verify your domain
   - This may take 30-60 seconds

---

### ✅ Success Output

If successful, you'll see:
```
Congratulations! Your certificate and chain have been saved at:
   /etc/letsencrypt/live/raajugarikossu.com/fullchain.pem
   /etc/letsencrypt/live/raajugarikossu.com/privkey.pem
```

---

### ❌ If You Get Errors

#### Error: "DNS problem: NXDOMAIN looking up A for raajugarikossu.com"
**Solution:** 
- Check DNS: `dig raajugarikossu.com +short`
- Make sure `91.108.110.72` is in the results
- Wait a few more minutes for DNS propagation

#### Error: "Detail: 13.248.243.5: Invalid response" or Multiple IPs in DNS
**Solution:** 
- **CRITICAL:** Your DNS has multiple A records pointing to different IPs!
- Check: `dig raajugarikossu.com +short` - if you see multiple IPs, that's the problem
- Go back to GoDaddy and **DELETE ALL A records** except the one pointing to `91.108.110.72`
- See `FIX_DNS_MULTIPLE_IPS.md` for detailed steps
- After fixing DNS, wait 10-15 minutes, then try certbot again

#### Error: "Connection refused" or "Port 80 is already in use"
**Solution:**
```bash
# Find what's using port 80
sudo lsof -i :80

# If nginx is running, stop it:
sudo systemctl stop nginx

# If something else, kill it:
sudo kill -9 <PID>
```

#### Error: "Failed to connect to raajugarikossu.com"
**Solution:**
- Make sure your VPS firewall allows port 80:
  ```bash
  sudo ufw allow 80/tcp
  ```
- Check if DNS fully propagated: Wait 10-15 minutes and try again

---

### Step 3: Verify Certificate Files Exist

After successful certificate generation:

```bash
# Check if certificate files exist
ls -la /etc/letsencrypt/live/raajugarikossu.com/

# You should see:
# - fullchain.pem
# - privkey.pem
# - cert.pem
# - chain.pem
```

---

### Step 4: Copy Certificates to Your App Directory

**You're in: `~/reddy-anna`** (this should be your app directory)

```bash
# Make sure you're in the right directory
pwd
# Should show: /root/reddy-anna

# Copy certificates
sudo cp /etc/letsencrypt/live/raajugarikossu.com/privkey.pem ./server.key
sudo cp /etc/letsencrypt/live/raajugarikossu.com/fullchain.pem ./server.crt

# Set ownership (you're root, so this should work)
sudo chown $USER:$USER server.key server.crt

# Set permissions
chmod 600 server.key
chmod 644 server.crt

# Verify files exist
ls -la server.key server.crt
```

**Expected output:**
```
-rw------- 1 root root 1704 Jan XX XX:XX server.key
-rw-r--r-- 1 root root 3584 Jan XX XX:XX server.crt
```

---

### Step 5: Update .env File

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

### Step 6: Restart Your App

```bash
# Start your app
pm2 start andar-bahar

# OR if it was already started
pm2 restart andar-bahar --update-env

# Check logs
pm2 logs andar-bahar --lines 50
```

**Look for these messages:**
```
✅ SSL key loaded from: ./server.key
✅ SSL certificate loaded from: ./server.crt
✅ HTTPS server serving on https://0.0.0.0:5000
```

---

### Step 7: Start Services You Stopped

```bash
# Start Nginx (if you stopped it and need it):
sudo systemctl start nginx

# Your app should already be running from Step 6
```

---

### Step 8: Test HTTPS

**Open in browser:**
```
https://raajugarikossu.com:5000
```

**✅ Should see green padlock! No security warnings!**

---

## 🔄 Quick Command Reference

```bash
# 1. Check port 80
sudo lsof -i :80

# 2. Get certificate
sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com

# 3. Verify certificate exists
ls -la /etc/letsencrypt/live/raajugarikossu.com/

# 4. Copy certificates (in your app directory ~/reddy-anna)
sudo cp /etc/letsencrypt/live/raajugarikossu.com/privkey.pem ./server.key
sudo cp /etc/letsencrypt/live/raajugarikossu.com/fullchain.pem ./server.crt
sudo chown $USER:$USER server.key server.crt
chmod 600 server.key
chmod 644 server.crt

# 5. Restart app
pm2 restart andar-bahar --update-env

# 6. Check logs
pm2 logs andar-bahar --lines 50
```

---

## 📋 Checklist

- [ ] Port 80 is free
- [ ] Ran `sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com`
- [ ] Certificate obtained successfully
- [ ] Copied certificates to `~/reddy-anna/`
- [ ] Updated `.env` file with SSL settings
- [ ] Restarted app with `pm2 restart andar-bahar --update-env`
- [ ] HTTPS working: `https://raajugarikossu.com:5000`

---

## 🎯 Next Step: Run Certbot NOW!

Since everything is already stopped and ready, just run:

```bash
sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com
```

Then follow Steps 3-8 above!

