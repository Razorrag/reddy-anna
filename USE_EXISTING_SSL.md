# Use Existing SSL Certificate from rajugarikossu.com

## Perfect Solution

Your app is already running on `https://rajugarikossu.com` with SSL certificate. We'll use the **same certificate** for OvenMediaEngine!

---

## Quick Setup (2 Minutes)

### Step 1: Copy Existing Certificates to OME

```bash
# Create cert directory
mkdir -p /opt/ovenmediaengine/cert

# Copy your existing SSL certificates
cp /etc/letsencrypt/live/rajugarikossu.com/fullchain.pem \
   /opt/ovenmediaengine/cert/server.crt

cp /etc/letsencrypt/live/rajugarikossu.com/privkey.pem \
   /opt/ovenmediaengine/cert/server.key

# Set permissions
chmod 644 /opt/ovenmediaengine/cert/server.crt
chmod 600 /opt/ovenmediaengine/cert/server.key

# Verify files exist
ls -la /opt/ovenmediaengine/cert/
```

### Step 2: Update docker-compose.yml

Edit `/opt/ovenmediaengine/docker-compose.yml`:

**Add these two lines:**

```yaml
version: '3'
services:
  ovenmediaengine:
    image: airensoft/ovenmediaengine:latest
    container_name: ovenmediaengine
    ports:
      - "1935:1935"
      - "9999:9999"
      - "3333:3333"
      - "3478:3478/udp"
      - "10000-10010:10000-10010/udp"
      - "8080:8080"
      - "8443:8443"                     # ADD THIS LINE
    volumes:
      - ./conf:/opt/ovenmediaengine/bin/origin_conf
      - ./logs:/var/log/ovenmediaengine
      - ./cert:/opt/ovenmediaengine/cert    # ADD THIS LINE
    restart: unless-stopped
```

### Step 3: Update Server.xml

Edit `/opt/ovenmediaengine/conf/Server.xml`:

**Find and modify `<Bind>` section:**

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
            <TLSPort>8443</TLSPort>    <!-- ADD THIS LINE -->
        </LLHLS>
    </Publishers>
</Bind>
```

**Add `<TLS>` section after `</Bind>`:**

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

# Wait for startup
sleep 5

# Check logs
docker logs ovenmediaengine --tail 20
```

### Step 5: Open Firewall

```bash
ufw allow 8443/tcp
```

### Step 6: Test HTTPS Endpoint

```bash
# Test with your domain
curl https://rajugarikossu.com:8443/live/stream/llhls.m3u8

# Should return HLS playlist (no certificate errors!)
```

---

## Update Admin Panel Stream URL

Change from:
```
http://72.61.170.227:8080/live/stream/llhls.m3u8
```

To:
```
https://rajugarikossu.com:8443/live/stream/llhls.m3u8
```

---

## Refresh Frontend

Hard refresh your game page:
- **Windows/Linux:** Ctrl + F5
- **Mac:** Cmd + Shift + R

**Stream should display immediately with no warnings!** ✅

---

## Why This Works Perfectly

✅ **Same certificate** - Both frontend and stream use rajugarikossu.com certificate
✅ **No mixed content** - Both HTTPS (https://rajugarikossu.com)
✅ **No browser warnings** - Valid Let's Encrypt certificate
✅ **Professional setup** - Production-ready
✅ **No DNS changes needed** - Already configured

---

## Auto-Renewal Setup

Since you're using the main domain's certificate, set up auto-copy on renewal:

### Create Renewal Hook Script

```bash
# Create script
cat > /opt/ovenmediaengine/copy-cert.sh << 'EOF'
#!/bin/bash
# Copy renewed certificate to OvenMediaEngine
cp /etc/letsencrypt/live/rajugarikossu.com/fullchain.pem \
   /opt/ovenmediaengine/cert/server.crt

cp /etc/letsencrypt/live/rajugarikossu.com/privkey.pem \
   /opt/ovenmediaengine/cert/server.key

# Restart OME container
cd /opt/ovenmediaengine
docker-compose restart

echo "OvenMediaEngine certificate updated and restarted"
EOF

# Make executable
chmod +x /opt/ovenmediaengine/copy-cert.sh
```

### Add to Certbot Renewal Hook

```bash
# Create renewal hook
cat > /etc/letsencrypt/renewal-hooks/deploy/ome-cert.sh << 'EOF'
#!/bin/bash
/opt/ovenmediaengine/copy-cert.sh
EOF

# Make executable
chmod +x /etc/letsencrypt/renewal-hooks/deploy/ome-cert.sh
```

Now when your certificate renews (every 90 days), it will automatically copy to OME and restart the container!

---

## Complete Command Sequence

Copy and paste these commands:

```bash
# 1. Copy existing certificates
mkdir -p /opt/ovenmediaengine/cert
cp /etc/letsencrypt/live/rajugarikossu.com/fullchain.pem \
   /opt/ovenmediaengine/cert/server.crt
cp /etc/letsencrypt/live/rajugarikossu.com/privkey.pem \
   /opt/ovenmediaengine/cert/server.key
chmod 644 /opt/ovenmediaengine/cert/server.crt
chmod 600 /opt/ovenmediaengine/cert/server.key

# 2. Edit docker-compose.yml
nano /opt/ovenmediaengine/docker-compose.yml
# Add port 8443 and cert volume (see above)

# 3. Edit Server.xml
nano /opt/ovenmediaengine/conf/Server.xml
# Add TLSPort and TLS section (see above)

# 4. Restart container
cd /opt/ovenmediaengine
docker-compose down
docker-compose up -d

# 5. Open firewall
ufw allow 8443/tcp

# 6. Test HTTPS
curl https://rajugarikossu.com:8443/live/stream/llhls.m3u8

# 7. Update admin panel stream URL to:
# https://rajugarikossu.com:8443/live/stream/llhls.m3u8

# 8. Refresh frontend (Ctrl+F5)
# Stream displays perfectly! 🎉
```

---

## Verification Checklist

- [ ] Certificates copied to `/opt/ovenmediaengine/cert/`
- [ ] Port 8443 added to docker-compose.yml
- [ ] Cert volume mounted in docker-compose.yml
- [ ] TLSPort added to Server.xml
- [ ] TLS section added to Server.xml
- [ ] Container restarted successfully
- [ ] Port 8443 open in firewall
- [ ] HTTPS works: `curl https://rajugarikossu.com:8443/live/stream/llhls.m3u8`
- [ ] Admin panel updated with HTTPS URL
- [ ] Frontend refreshed (Ctrl+F5)
- [ ] Stream displays with no warnings
- [ ] LIVE badge visible
- [ ] Viewer count showing

---

## Alternative: Nginx Reverse Proxy

If you want to hide port 8443 from the URL, use Nginx reverse proxy:

### Nginx Configuration

Add to your existing Nginx config for rajugarikossu.com:

```nginx
server {
    listen 443 ssl;
    server_name rajugarikossu.com;

    ssl_certificate /etc/letsencrypt/live/rajugarikossu.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rajugarikossu.com/privkey.pem;

    # Your existing app config
    location / {
        # Your existing configuration
    }

    # NEW: Add this for stream
    location /stream/ {
        proxy_pass http://localhost:8080/live/;
        proxy_http_version 1.1;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Range' always;
        
        # No caching for live stream
        proxy_cache_bypass $http_pragma $http_authorization;
        proxy_no_cache $http_pragma $http_authorization;
    }
}
```

Restart Nginx:
```bash
nginx -t
systemctl reload nginx
```

Stream URL becomes cleaner:
```
https://rajugarikossu.com/stream/stream/llhls.m3u8
```

No port number needed!

---

## Expected Result

After setup:

1. ✅ **Stream URL:** `https://rajugarikossu.com:8443/live/stream/llhls.m3u8`
2. ✅ **Frontend URL:** `https://rajugarikossu.com`
3. ✅ **Both HTTPS** - No mixed content
4. ✅ **Same certificate** - No warnings
5. ✅ **Production ready** - Valid SSL
6. ✅ **Stream displays** - LIVE badge + viewer count
7. ✅ **Auto-renewal** - Certificate updates automatically

---

## Summary

**Perfect Solution:**
- Use your existing `rajugarikossu.com` SSL certificate
- Copy it to OvenMediaEngine
- Configure HTTPS on port 8443
- Update admin panel URL
- Stream displays perfectly with no warnings!

**Timeline:**
- Copy certificates: 30 seconds
- Edit configs: 2 minutes
- Restart & test: 30 seconds
- **Total: ~3 minutes to working HTTPS stream!**

Your stream is already working perfectly - just needs your existing SSL certificate!