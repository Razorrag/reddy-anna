# 🔒 SSL Protocol Error Fix Guide

## Common SSL Protocol Errors and Solutions

### Error Types

1. **"SSL protocol error"** - Certificate format or chain issues
2. **"ERR_SSL_PROTOCOL_ERROR"** - Certificate not properly loaded
3. **"CERT_UNTRUSTED"** - Self-signed certificate warnings
4. **"EADDRINUSE"** - Port already in use
5. **"EACCES"** - Permission denied on port 443

---

## ✅ Solution 1: Fix Certificate File Paths

### For Self-Signed Certificate

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout server.key \
  -out server.crt \
  -days 365 \
  -subj "/CN=your-vps-ip-or-domain"
```

**Ensure in .env:**
```bash
HTTPS_ENABLED=true
SSL_KEY_PATH=./server.key
SSL_CERT_PATH=./server.crt
HTTPS_PORT=443
```

### For Let's Encrypt Certificate

**Use `fullchain.pem` instead of `cert.pem`** - This includes the certificate chain.

```bash
# Let's Encrypt paths
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
```

**Important:** Always use `fullchain.pem`, not `cert.pem` for Let's Encrypt!

**In .env:**
```bash
HTTPS_ENABLED=true
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
HTTPS_PORT=443
```

---

## ✅ Solution 2: Fix File Permissions

SSL certificate files need proper permissions:

```bash
# Set correct permissions
sudo chmod 600 server.key          # Private key - owner read/write only
sudo chmod 644 server.crt          # Certificate - readable by all
sudo chmod 644 fullchain.pem       # Full chain - readable by all

# For Let's Encrypt
sudo chmod 600 /etc/letsencrypt/live/yourdomain.com/privkey.pem
sudo chmod 644 /etc/letsencrypt/live/yourdomain.com/fullchain.pem

# Ensure Node.js can read them (check process owner)
sudo chown $USER:$USER server.key server.crt
# OR run Node.js with appropriate permissions
```

---

## ✅ Solution 3: Fix Port Issues

### Port 443 Already in Use

If port 443 is in use (by Nginx, Apache, or another service):

**Option A: Use a different port**
```bash
HTTPS_PORT=8443
```

Then access via: `https://91.108.110.72:8443`

**Option B: Stop conflicting service**
```bash
# Check what's using port 443
sudo lsof -i :443
sudo netstat -tuln | grep :443

# Stop Nginx (if using reverse proxy differently)
sudo systemctl stop nginx

# Or stop Apache
sudo systemctl stop apache2
```

---

## ✅ Solution 4: Fix Certificate Chain Issues

If using Let's Encrypt, ensure you're using `fullchain.pem` which includes the intermediate certificates.

**Check certificate:**
```bash
# View certificate details
openssl x509 -in server.crt -text -noout

# For Let's Encrypt, verify fullchain
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -text -noout
```

**If certificate chain is missing**, the server code now automatically handles it, but you can also manually add:

```javascript
// In server/index.ts (already implemented)
httpsOptions.ca = fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/chain.pem');
```

---

## ✅ Solution 5: Verify Certificate Format

Ensure certificates are in PEM format (not DER or other formats):

```bash
# Check if file is PEM format (should start with -----BEGIN)
head -1 server.key
# Should show: -----BEGIN PRIVATE KEY----- or -----BEGIN RSA PRIVATE KEY-----

head -1 server.crt
# Should show: -----BEGIN CERTIFICATE-----

# If not PEM, convert:
openssl x509 -inform DER -in certificate.der -out certificate.pem
```

---

## ✅ Solution 6: Browser-Specific Fixes

### Self-Signed Certificate Warning

For self-signed certificates, browsers will show a security warning. You can:

1. **Accept the warning** - Click "Advanced" → "Proceed to site"
2. **Use Let's Encrypt** - Free, trusted certificates
3. **Add exception in browser** - Not recommended for production

### Chrome "Your connection is not private"

1. Click "Advanced"
2. Click "Proceed to your-vps-ip (unsafe)"
3. This is normal for self-signed certificates

---

## 🔧 Troubleshooting Steps

### Step 1: Check Server Logs

```bash
# View PM2 logs
pm2 logs andar-bahar --lines 50

# Look for SSL errors:
# - "Failed to read SSL certificate"
# - "SSL key file not readable"
# - "HTTPS server error"
```

### Step 2: Test Certificate

```bash
# Test certificate locally
openssl s_client -connect localhost:443 -showcerts

# Test from remote
openssl s_client -connect your-vps-ip:443 -showcerts
```

### Step 3: Verify File Paths

```bash
# Check if files exist
ls -la server.key server.crt

# For Let's Encrypt
ls -la /etc/letsencrypt/live/yourdomain.com/
```

### Step 4: Check File Permissions

```bash
# Check permissions
ls -l server.key server.crt

# Should be:
# -rw------- server.key  (600 - owner read/write)
# -rw-r--r-- server.crt (644 - owner read/write, others read)
```

### Step 5: Verify Port Access

```bash
# Check if port is listening
sudo netstat -tuln | grep :443
# Should show: tcp 0.0.0.0:443 LISTEN

# Or using ss
sudo ss -tuln | grep :443
```

---

## 📝 Quick Fix Checklist

- [ ] Certificate files exist and are readable
- [ ] Using `fullchain.pem` for Let's Encrypt (not `cert.pem`)
- [ ] File permissions are correct (600 for key, 644 for cert)
- [ ] Port 443 is not in use by another service
- [ ] HTTPS_ENABLED=true in .env
- [ ] SSL_KEY_PATH and SSL_CERT_PATH are correct
- [ ] Certificates are in PEM format
- [ ] Server has permission to read certificate files
- [ ] Firewall allows port 443
- [ ] PM2 is running with correct permissions

---

## 🚀 Quick Commands

### Generate Self-Signed Certificate
```bash
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout server.key -out server.crt -days 365 \
  -subj "/CN=91.108.110.72"
```

### Get Let's Encrypt Certificate
```bash
sudo certbot certonly --standalone -d yourdomain.com
```

### Check Certificate Validity
```bash
openssl x509 -in server.crt -text -noout | grep -A 2 "Validity"
```

### Restart After Fix
```bash
pm2 restart andar-bahar
pm2 logs andar-bahar
```

---

## ⚠️ Common Mistakes

1. **Using `cert.pem` instead of `fullchain.pem`** - Causes chain errors
2. **Wrong file permissions** - Node.js can't read certificates
3. **Port 443 in use** - Another service is using it
4. **Not using HTTPS in browser** - Accessing via `http://` instead of `https://`
5. **Certificate expired** - Check expiration date
6. **Wrong domain/IP in certificate** - Certificate doesn't match server

---

## ✅ After Fix: Verify

1. **Access via HTTPS:**
   ```
   https://91.108.110.72:443
   ```

2. **Check browser console:**
   - No SSL errors
   - Green padlock (or warning accepted for self-signed)

3. **Test WebSocket:**
   ```javascript
   // In browser console
   const ws = new WebSocket('wss://91.108.110.72:443/ws');
   ws.onopen = () => console.log('✅ WebSocket connected');
   ws.onerror = (e) => console.error('❌ WebSocket error:', e);
   ```

4. **Test Screen Share:**
   - Go to admin panel
   - Click "Start Screen Share"
   - Should NOT show SSL/protocol errors
   - Should prompt for screen selection

---

## 📞 Still Having Issues?

If you're still experiencing SSL protocol errors after trying all the above:

1. **Check PM2 logs:**
   ```bash
   pm2 logs andar-bahar --err --lines 100
   ```

2. **Test certificate manually:**
   ```bash
   openssl s_client -connect 91.108.110.72:443 -showcerts
   ```

3. **Verify certificate chain:**
   ```bash
   openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt server.crt
   ```

4. **Check system logs:**
   ```bash
   sudo journalctl -u your-service -n 50
   ```

---

**The code has been updated to handle certificate chains better and provide clearer error messages. Restart your server after making any certificate changes!**

