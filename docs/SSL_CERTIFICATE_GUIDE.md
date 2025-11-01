# 🔒 SSL Certificate Guide - How to Get Certificates

## Three Options for SSL Certificates

### Option 1: Self-Signed Certificate (Testing/Development) ⚡ Quick & Free

**Best for:** Testing, development, internal use  
**Cost:** Free  
**Trust:** Browser will show security warning (can be accepted)

#### Generate Self-Signed Certificate

```bash
# On your VPS server, run:
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout server.key \
  -out server.crt \
  -days 365 \
  -subj "/CN=your-vps-ip"

# Replace 'your-vps-ip' with:
# - Your actual VPS IP address (e.g., 192.168.1.100)
# - Or your domain name if you have one (e.g., example.com)
```

**Example for IP address (91.108.110.72):**
```bash
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout server.key \
  -out server.crt \
  -days 365 \
  -subj "/CN=91.108.110.72"
```

**Example for domain:**
```bash
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout server.key \
  -out server.crt \
  -days 365 \
  -subj "/CN=example.com"
```

**Files created:**
- `server.key` - Private key (keep secret!)
- `server.crt` - Certificate file

**Set permissions:**
```bash
chmod 600 server.key  # Private key - owner only
chmod 644 server.crt  # Certificate - readable
```

**Configure in .env:**
```bash
HTTPS_ENABLED=true
SSL_KEY_PATH=./server.key
SSL_CERT_PATH=./server.crt
```

**⚠️ Note:** Browsers will show "Your connection is not private" warning. Click "Advanced" → "Proceed to site" to continue.

---

### Option 2: Let's Encrypt (Production) 🌟 Recommended for Production

**Best for:** Production, public websites  
**Cost:** Free  
**Trust:** Trusted by all browsers (no warnings)  
**Requires:** Domain name (not IP address)

#### Step 1: Install Certbot

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot -y

# CentOS/RHEL
sudo yum install certbot -y

# Or using snap
sudo snap install --classic certbot
```

#### Step 2: Get Certificate

**Method A: Standalone (if nothing is using port 80)**

```bash
# Stop your application temporarily
pm2 stop andar-bahar

# Get certificate (replace example.com with your domain)
sudo certbot certonly --standalone -d example.com -d www.example.com

# Start application again
pm2 start andar-bahar
```

**Method B: Webroot (if Nginx/Apache is running)**

```bash
sudo certbot certonly --webroot -w /var/www/html -d example.com
```

#### Step 3: Certificate Location

Let's Encrypt certificates are stored at:
```
/etc/letsencrypt/live/yourdomain.com/
```

**Files:**
- `privkey.pem` - Private key
- `fullchain.pem` - Certificate + chain (USE THIS!)
- `cert.pem` - Certificate only (don't use this alone)
- `chain.pem` - Chain only

#### Step 4: Configure in .env

```bash
HTTPS_ENABLED=true
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
HTTPS_PORT=443
```

**⚠️ Important:** Use `fullchain.pem`, not `cert.pem`!

#### Step 5: Set Permissions

```bash
# Certbot files are readable by root, but your app might run as different user
# Option 1: Run PM2 as root (not recommended for production)
sudo pm2 start ecosystem.config.js

# Option 2: Copy certificates to app directory (better)
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./server.key
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./server.crt
sudo chown $USER:$USER server.key server.crt
chmod 600 server.key
chmod 644 server.crt

# Then in .env use:
SSL_KEY_PATH=./server.key
SSL_CERT_PATH=./server.crt
```

#### Step 6: Auto-Renewal (Certificates expire every 90 days)

```bash
# Test renewal
sudo certbot renew --dry-run

# Set up auto-renewal (runs twice daily)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Or add to crontab
sudo crontab -e
# Add this line:
0 0 * * * certbot renew --quiet && pm2 restart andar-bahar
```

---

### Option 3: Commercial Certificate (Production)

**Best for:** Enterprise, specific requirements  
**Cost:** $50-$1000+ per year  
**Trust:** Trusted by all browsers

#### Popular Providers:
- **DigiCert** - https://www.digicert.com/
- **GlobalSign** - https://www.globalsign.com/
- **Sectigo (formerly Comodo)** - https://sectigo.com/
- **GoDaddy** - https://www.godaddy.com/ssl

#### Process:
1. Purchase certificate from provider
2. Generate CSR (Certificate Signing Request)
3. Submit CSR to provider
4. Download certificate files
5. Configure in .env

#### Generate CSR:

```bash
openssl req -new -newkey rsa:2048 -nodes \
  -keyout server.key \
  -out server.csr \
  -subj "/CN=yourdomain.com"
```

Send `server.csr` to certificate provider, they'll give you certificate files.

---

## Quick Setup Guide

### For Testing (Self-Signed):

```bash
# 1. Generate certificate for IP 91.108.110.72
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout server.key -out server.crt -days 365 \
  -subj "/CN=91.108.110.72"

# 2. Set permissions
chmod 600 server.key
chmod 644 server.crt

# 3. Configure .env
HTTPS_ENABLED=true
SSL_KEY_PATH=./server.key
SSL_CERT_PATH=./server.crt
PORT=5000

# 4. Restart
pm2 restart andar-bahar
```

### For Production (Let's Encrypt):

```bash
# 1. Install certbot
sudo apt install certbot -y

# 2. Stop app temporarily
pm2 stop andar-bahar

# 3. Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# 4. Copy certificates to app directory
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./server.key
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./server.crt
sudo chown $USER:$USER server.key server.crt
chmod 600 server.key
chmod 644 server.crt

# 5. Configure .env
HTTPS_ENABLED=true
SSL_KEY_PATH=./server.key
SSL_CERT_PATH=./server.crt
PORT=5000

# 6. Start app
pm2 start andar-bahar

# 7. Set up auto-renewal
sudo certbot renew --dry-run
```

---

## Troubleshooting

### "Certificate file not readable"

```bash
# Check file exists
ls -la server.key server.crt

# Check permissions
ls -l server.key server.crt
# Should be: -rw------- (600) for key, -rw-r--r-- (644) for cert

# Fix permissions
chmod 600 server.key
chmod 644 server.crt

# Check owner
ls -l server.key
# If owned by root, change owner:
sudo chown $USER:$USER server.key server.crt
```

### "Certificate expired"

Let's Encrypt certificates expire every 90 days. Renew them:

```bash
# Renew manually
sudo certbot renew

# Copy new certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./server.key
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./server.crt

# Restart app
pm2 restart andar-bahar
```

### "Port 80/443 already in use"

For Let's Encrypt standalone mode, port 80 must be free:

```bash
# Check what's using port 80
sudo lsof -i :80

# Stop conflicting service (e.g., Nginx)
sudo systemctl stop nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Start service again
sudo systemctl start nginx
```

### Domain Verification Failed

Let's Encrypt needs to verify you own the domain:

1. **DNS must point to your VPS IP:**
   ```bash
   # Check DNS
   dig yourdomain.com
   nslookup yourdomain.com
   ```

2. **Port 80 must be accessible** (for standalone method)

3. **Firewall must allow port 80:**
   ```bash
   sudo ufw allow 80/tcp
   ```

---

## Certificate File Formats

### PEM Format (Most Common)
- Extension: `.pem`, `.crt`, `.key`
- Text-based, readable
- Used by Node.js/Express

### DER Format (Binary)
- Extension: `.der`, `.cer`
- Binary format
- Needs conversion for Node.js

### Convert DER to PEM:
```bash
openssl x509 -inform DER -in certificate.der -out certificate.pem
```

---

## Security Best Practices

1. **Never commit certificates to git:**
   ```bash
   # Add to .gitignore
   echo "server.key" >> .gitignore
   echo "server.crt" >> .gitignore
   ```

2. **Use strong key size:**
   - RSA 2048 bits (minimum)
   - RSA 4096 bits (recommended)

3. **Restrict file permissions:**
   ```bash
   chmod 600 server.key  # Only owner can read/write
   chmod 644 server.crt  # Readable, but not writable
   ```

4. **Rotate certificates regularly:**
   - Self-signed: Renew annually
   - Let's Encrypt: Auto-renew every 90 days

5. **Use full chain (for Let's Encrypt):**
   - Always use `fullchain.pem`
   - Not just `cert.pem`

---

## Summary

| Type | Cost | Trust | Setup Time | Best For |
|------|------|-------|-------------|----------|
| Self-Signed | Free | Warning | 1 minute | Testing/Dev |
| Let's Encrypt | Free | Trusted | 10 minutes | Production |
| Commercial | $50+ | Trusted | 1-2 hours | Enterprise |

**Recommendation:**
- **Testing:** Use self-signed certificate
- **Production:** Use Let's Encrypt (free and trusted)

---

## Next Steps

1. Choose certificate type based on your needs
2. Generate/obtain certificate using instructions above
3. Configure `.env` with certificate paths
4. Restart your application: `pm2 restart andar-bahar`
5. Test HTTPS: `https://91.108.110.72:5000`

**After setup, verify:**
```bash
# Check certificate
openssl x509 -in server.crt -text -noout | grep -A 2 "Validity"

# Test HTTPS
curl -k https://localhost:3000

# Check in browser
https://91.108.110.72:5000
```

---

**Need help?** Check server logs:
```bash
pm2 logs andar-bahar --lines 50
```

Look for messages like:
- `✅ SSL key loaded from: ...`
- `✅ SSL certificate loaded from: ...`
- `✅ HTTPS server serving on https://...`

