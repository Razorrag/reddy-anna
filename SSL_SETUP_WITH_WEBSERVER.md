# SSL Setup for OvenMediaEngine (With Existing Web Server)

## Current Status

✅ **Stream is working perfectly!**
```bash
curl http://localhost:8080/live/stream/llhls.m3u8
# Returns valid HLS playlist
```

✅ **Domain:** streaming.rajugarikossu.com

❌ **Problem:** Port 80 is already in use by your web server

---

## Solution: Use Webroot or DNS Challenge

Since port 80 is used by your existing web server, we'll use the **webroot** method.

### Option 1: Webroot Method (Recommended)

This works with your existing web server (Nginx/Apache).

#### Step 1: Cancel Current Certbot Attempt
Press `C` to cancel the current certbot command.

#### Step 2: Get Certificate Using Webroot

```bash
# Find your web server's document root
# Common locations:
# - Nginx: /var/www/html or /usr/share/nginx/html
# - Apache: /var/www/html

# Get certificate (replace /var/www/html with your actual webroot)
certbot certonly --webroot \
  -w /var/www/html \
  -d streaming.rajugarikossu.com \
  --email your@email.com \
  --agree-tos \
  --non-interactive
```

**What this does:**
- Places verification file in your web server's root
- Let's Encrypt accesses it via HTTP
- No need to stop web server
- Certificate issued automatically

#### Step 3: Verify Certificate Created

```bash
ls -la /etc/letsencrypt/live/streaming.rajugarikossu.com/
```

Should show:
```
fullchain.pem -> certificate with chain
privkey.pem -> private key
```

---

### Option 2: DNS Challenge (Alternative)

If webroot doesn't work, use DNS challenge:

```bash
certbot certonly --manual \
  --preferred-challenges dns \
  -d streaming.rajugarikossu.com
```

**Steps:**
1. Certbot will ask you to create a TXT record
2. Add the TXT record to your DNS
3. Wait 2-3 minutes for propagation
4. Press Enter in certbot
5. Certificate issued

---

### Option 3: Temporarily Stop Web Server

```bash
# Stop web server temporarily
systemctl stop nginx
# or
systemctl stop apache2

# Get certificate
certbot certonly --standalone -d streaming.rajugarikossu.com

# Start web server again
systemctl start nginx
# or
systemctl start apache2
```

---

## After Getting Certificate

### Step 1: Copy Certificates to OME Directory

```bash
# Create cert directory for OME
mkdir -p /opt/ovenmediaengine/cert

# Copy certificates
cp /etc/letsencrypt/live/streaming.rajugarikossu.com/fullchain.pem \
   /opt/ovenmediaengine/cert/server.crt

cp /etc/letsencrypt/live/streaming.rajugarikossu.com/privkey.pem \
   /opt/ovenmediaengine/cert/server.key

# Set permissions
chmod 644 /opt/ovenmediaengine/cert/server.crt
chmod 600 /opt/ovenmediaengine/cert/server.key
```

### Step 2: Update docker-compose.yml

Edit `/opt/ovenmediaengine/docker-compose.yml`:

```yaml
version: '3'
services:
  ovenmediaengine:
    image: airensoft/ovenmediaengine:latest
    container_name: ovenmediaengine
    ports:
      - "1935:1935"    # RTMP
      - "9999:9999"    # API
      - "3333:3333"    # WebRTC signaling
      - "3478:3478/udp" # WebRTC TURN
      - "10000-10010:10000-10010/udp" # WebRTC
      - "8080:8080"    # LL-HLS HTTP
      - "8443:8443"    # LL-HLS HTTPS (NEW LINE)
    volumes:
      - ./conf:/opt/ovenmediaengine/bin/origin_conf
      - ./logs:/var/log/ovenmediaengine
      - ./cert:/opt/ovenmediaengine/cert  # NEW LINE: Mount certificates
    restart: unless-stopped
```

### Step 3: Update Server.xml

Edit `/opt/ovenmediaengine/conf/Server.xml`:

**Find the `<Bind>` section and update it:**

```xml
<Bind>
    <Providers>
        <RTMP>
            <Port>1935</Port>
        </RTMP>
    </Providers>
    <Publishers>
        <LLHLS>
            <Port>8080</Port>
            <TLSPort>8443</TLSPort>  <!-- ADD THIS LINE -->
        </LLHLS>
    </Publishers>
</Bind>
```

**Add `<TLS>` section after `</Bind>` (before `<VirtualHosts>`):**

```xml
</Bind>

<!-- ADD THIS ENTIRE SECTION -->
<TLS>
    <CertPath>/opt/ovenmediaengine/cert/server.crt</CertPath>
    <KeyPath>/opt/ovenmediaengine/cert/server.key</KeyPath>
</TLS>

<VirtualHosts>
```

### Step 4: Restart Container

```bash
cd /opt/ovenmediaengine
docker-compose down
docker-compose up -d
```

### Step 5: Verify HTTPS Works

```bash
# Test HTTPS endpoint
curl https://streaming.rajugarikossu.com:8443/live/stream/llhls.m3u8

# Should return HLS playlist (not 404 or SSL error)
```

### Step 6: Update Admin Panel

Change stream URL from:
```
http://72.61.170.227:8080/live/stream/llhls.m3u8
```

To:
```
https://streaming.rajugarikossu.com:8443/live/stream/llhls.m3u8
```

### Step 7: Refresh Frontend

Hard refresh (Ctrl+F5) and stream should display with no mixed content errors!

---

## Firewall Configuration

Open port 8443 for HTTPS:

```bash
# UFW
ufw allow 8443/tcp

# iptables
iptables -A INPUT -p tcp --dport 8443 -j ACCEPT
iptables-save > /etc/iptables/rules.v4
```

---

## DNS Configuration

Ensure DNS points to your server:

```bash
# Check DNS
dig streaming.rajugarikossu.com

# Should show:
# streaming.rajugarikossu.com.  300  IN  A  72.61.170.227
```

If not configured:
1. Go to your domain registrar's DNS settings
2. Add A record: `streaming` → `72.61.170.227`
3. Wait 5-15 minutes for propagation

---

## Certificate Auto-Renewal

Let's Encrypt certificates expire in 90 days. Set up auto-renewal:

```bash
# Test renewal
certbot renew --dry-run

# If test passes, renewal will happen automatically via cron/systemd timer
```

**After renewal, copy new certificates:**

Create script `/opt/ovenmediaengine/renew-cert.sh`:

```bash
#!/bin/bash
# Copy renewed certificates to OME
cp /etc/letsencrypt/live/streaming.rajugarikossu.com/fullchain.pem \
   /opt/ovenmediaengine/cert/server.crt

cp /etc/letsencrypt/live/streaming.rajugarikossu.com/privkey.pem \
   /opt/ovenmediaengine/cert/server.key

# Restart OME container to use new certificates
cd /opt/ovenmediaengine
docker-compose restart
```

Make executable:
```bash
chmod +x /opt/ovenmediaengine/renew-cert.sh
```

Add to certbot renewal hook:
```bash
# Create renewal hook
cat > /etc/letsencrypt/renewal-hooks/deploy/ome-renew.sh << 'EOF'
#!/bin/bash
/opt/ovenmediaengine/renew-cert.sh
EOF

chmod +x /etc/letsencrypt/renewal-hooks/deploy/ome-renew.sh
```

---

## Verification Checklist

After setup, verify:

- [ ] Certificate files exist in `/opt/ovenmediaengine/cert/`
- [ ] Port 8443 added to docker-compose.yml
- [ ] TLSPort configured in Server.xml
- [ ] TLS section added to Server.xml
- [ ] Container restarted successfully
- [ ] Port 8443 open in firewall
- [ ] HTTPS endpoint responds: `curl https://streaming.rajugarikossu.com:8443/live/stream/llhls.m3u8`
- [ ] Admin panel updated with HTTPS URL
- [ ] Frontend loads stream without mixed content errors

---

## Quick Commands Summary

```bash
# 1. Get certificate (webroot method)
certbot certonly --webroot -w /var/www/html -d streaming.rajugarikossu.com

# 2. Copy certificates
mkdir -p /opt/ovenmediaengine/cert
cp /etc/letsencrypt/live/streaming.rajugarikossu.com/fullchain.pem \
   /opt/ovenmediaengine/cert/server.crt
cp /etc/letsencrypt/live/streaming.rajugarikossu.com/privkey.pem \
   /opt/ovenmediaengine/cert/server.key
chmod 644 /opt/ovenmediaengine/cert/server.crt
chmod 600 /opt/ovenmediaengine/cert/server.key

# 3. Update docker-compose.yml (add port 8443 and cert volume)
nano /opt/ovenmediaengine/docker-compose.yml

# 4. Update Server.xml (add TLSPort and TLS section)
nano /opt/ovenmediaengine/conf/Server.xml

# 5. Restart container
cd /opt/ovenmediaengine
docker-compose down
docker-compose up -d

# 6. Open firewall
ufw allow 8443/tcp

# 7. Test HTTPS
curl https://streaming.rajugarikossu.com:8443/live/stream/llhls.m3u8

# 8. Update admin panel with HTTPS URL
# 9. Refresh frontend (Ctrl+F5)
```

---

## Troubleshooting

### Certificate Not Found
```bash
# Check if certificate exists
ls -la /etc/letsencrypt/live/streaming.rajugarikossu.com/

# If not, re-run certbot command
```

### Container Won't Start
```bash
# Check logs
docker logs ovenmediaengine

# Look for SSL/TLS errors
# Verify certificate paths in Server.xml are correct
```

### HTTPS Connection Refused
```bash
# Check if port 8443 is listening
netstat -tulpn | grep 8443

# Check firewall
ufw status
```

### Mixed Content Still Blocked
- Ensure stream URL is HTTPS (not HTTP)
- Ensure domain name matches certificate (streaming.rajugarikossu.com)
- Check browser console for specific errors

---

## Summary

**Quick Fix (5 minutes):**
1. Press `C` to cancel certbot
2. Run: `certbot certonly --webroot -w /var/www/html -d streaming.rajugarikossu.com`
3. Copy certificates to `/opt/ovenmediaengine/cert/`
4. Update docker-compose.yml and Server.xml
5. Restart container
6. Update stream URL to HTTPS
7. Stream displays without mixed content errors!

Your stream is working perfectly - just needs SSL to match HTTPS frontend!