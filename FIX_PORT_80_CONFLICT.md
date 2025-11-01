# 🔧 Fix Port 80 Conflict for Let's Encrypt

## Problem: Port 80 Already in Use

When running certbot, you're getting:
```
Could not bind TCP port 80 because it is already in use by another process
```

---

## ✅ Solution: Find and Stop the Service Using Port 80

### Step 1: Find What's Using Port 80

```bash
# Check what's using port 80
sudo lsof -i :80

# OR
sudo netstat -tuln | grep :80

# OR
sudo ss -tuln | grep :80
```

**Common services using port 80:**
- Nginx (`nginx`)
- Apache (`apache2` or `httpd`)
- PM2 application (if using HTTP)
- Other web servers

---

### Step 2: Stop the Service Temporarily

**If it's Nginx:**
```bash
# Stop Nginx
sudo systemctl stop nginx

# Verify it's stopped
sudo systemctl status nginx
```

**If it's Apache:**
```bash
# Stop Apache
sudo systemctl stop apache2
# OR
sudo systemctl stop httpd

# Verify it's stopped
sudo systemctl status apache2
```

**If it's PM2:**
```bash
# Stop PM2 application
pm2 stop andar-bahar

# Or stop all PM2 apps
pm2 stop all
```

**If it's another process:**
```bash
# Find the process ID
sudo lsof -i :80

# Kill the process (replace PID with actual process ID)
sudo kill -9 PID

# OR kill by name
sudo pkill -f process-name
```

---

### Step 3: Verify Port 80 is Free

```bash
# Check port 80 is free
sudo lsof -i :80

# Should return nothing (port is free)
```

---

### Step 4: Get Let's Encrypt Certificate

```bash
# Now get certificate for raajugarikossu.com
sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com

# Follow prompts:
# - Email: Enter your email
# - Terms: Type 'A' to agree
# - Share email: Your choice
```

---

### Step 5: Restart the Service (If Needed)

**If you stopped Nginx:**
```bash
sudo systemctl start nginx
sudo systemctl status nginx
```

**If you stopped Apache:**
```bash
sudo systemctl start apache2
sudo systemctl status apache2
```

**If you stopped PM2:**
```bash
# After getting certificate, start PM2 again
pm2 start andar-bahar
pm2 status
```

---

## 🚀 Complete Workflow for raajugarikossu.com

```bash
# 1. Find what's using port 80
sudo lsof -i :80

# 2. Stop the service (example: Nginx)
sudo systemctl stop nginx

# 3. Verify port 80 is free
sudo lsof -i :80

# 4. Get certificate
sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com

# 5. Copy certificates to app directory
sudo cp /etc/letsencrypt/live/raajugarikossu.com/privkey.pem ./server.key
sudo cp /etc/letsencrypt/live/raajugarikossu.com/fullchain.pem ./server.crt
sudo chown $USER:$USER server.key server.crt
chmod 600 server.key
chmod 644 server.crt

# 6. Restart the service you stopped (if needed)
sudo systemctl start nginx

# 7. Start/restart your app
pm2 restart andar-bahar
```

---

## 💡 Alternative: Use Nginx as Reverse Proxy

If you're using Nginx, you can configure it to work with Let's Encrypt without stopping it:

```bash
# Use webroot method instead of standalone
sudo certbot certonly --webroot -w /var/www/html -d raajugarikossu.com
```

This doesn't require stopping Nginx.

---

## ⚠️ Important Notes

1. **Temporary stop**: You only need to stop the service temporarily (few seconds) while getting the certificate
2. **Auto-renewal**: After initial setup, renewals won't need port 80 if you use webroot method
3. **PM2**: If PM2 is using port 5000 (not 80), you don't need to stop it
4. **Check logs**: If something fails, check certbot logs: `sudo tail -f /var/log/letsencrypt/letsencrypt.log`

---

## 🐛 Troubleshooting

### Still Can't Bind Port 80

```bash
# Double-check nothing is using it
sudo fuser 80/tcp

# List all processes on port 80
sudo lsof -i :80 -P

# Kill all processes on port 80 (use with caution!)
sudo fuser -k 80/tcp
```

### Certificate Generation Still Fails

```bash
# Check certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Try again with verbose output
sudo certbot certonly --standalone -d raajugarikossu.com --verbose
```

---

## ✅ After Certificate is Obtained

1. **Copy certificates** to app directory
2. **Update .env** with certificate paths
3. **Restart your application**
4. **Access via**: `https://raajugarikossu.com:5000`

---

**Quick Command Sequence:**

```bash
# Find and stop service
sudo systemctl stop nginx  # or apache2, or pm2 stop all

# Get certificate
sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com

# Restart service
sudo systemctl start nginx  # or apache2
```











