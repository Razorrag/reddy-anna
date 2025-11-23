# Quick SSL Fix - Self-Signed Certificate (Works Immediately)

## Problem

DNS for `streaming.rajugarikossu.com` doesn't exist yet:
```
DNS problem: NXDOMAIN looking up A for streaming.rajugarikossu.com
```

## Solution: Self-Signed Certificate (Testing)

This works immediately without DNS configuration. Browsers will show a warning, but you can click "Accept" and stream will work.

---

## Quick Commands (5 Minutes)

```bash
# 1. Create certificate directory
mkdir -p /opt/ovenmediaengine/cert

# 2. Generate self-signed certificate for IP address
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/ovenmediaengine/cert/server.key \
  -out /opt/ovenmediaengine/cert/server.crt \
  -subj "/CN=72.61.170.227" \
  -addext "subjectAltName=IP:72.61.170.227"

# 3. Set permissions
chmod 644 /opt/ovenmediaengine/cert/server.crt
chmod 600 /opt/ovenmediaengine/cert/server.key

# 4. Verify certificate created
ls -la /opt/ovenmediaengine/cert/
```

---

## Update docker-compose.yml

Edit `/opt/ovenmediaengine/docker-compose.yml`:

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
      - "8443:8443"      # ADD THIS LINE
    volumes:
      - ./conf:/opt/ovenmediaengine/bin/origin_conf
      - ./logs:/var/log/ovenmediaengine
      - ./cert:/opt/ovenmediaengine/cert    # ADD THIS LINE
    restart: unless-stopped
```

---

## Update Server.xml

Edit `/opt/ovenmediaengine/conf/Server.xml`:

### Find `<Bind>` section and modify:

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

### Add `<TLS>` section after `</Bind>`:

```xml
</Bind>

<!-- ADD THIS ENTIRE SECTION -->
<TLS>
    <CertPath>/opt/ovenmediaengine/cert/server.crt</CertPath>
    <KeyPath>/opt/ovenmediaengine/cert/server.key</KeyPath>
</TLS>

<VirtualHosts>
```

---

## Restart Container

```bash
cd /opt/ovenmediaengine
docker-compose down
docker-compose up -d

# Wait 5 seconds for startup
sleep 5

# Check logs
docker logs ovenmediaengine --tail 20
```

---

## Test HTTPS Endpoint

```bash
# Test HTTPS (with -k to ignore certificate warning)
curl -k https://localhost:8443/live/stream/llhls.m3u8

# Should return HLS playlist
```

---

## Open Firewall for Port 8443

```bash
# UFW
ufw allow 8443/tcp

# Or iptables
iptables -A INPUT -p tcp --dport 8443 -j ACCEPT
iptables-save > /etc/iptables/rules.v4
```

---

## Update Admin Panel

Change stream URL to HTTPS:

**From:**
```
http://72.61.170.227:8080/live/stream/llhls.m3u8
```

**To:**
```
https://72.61.170.227:8443/live/stream/llhls.m3u8
```

---

## Accept Certificate in Browser

1. **Open stream URL directly in browser:**
   ```
   https://72.61.170.227:8443/live/stream/llhls.m3u8
   ```

2. **Browser shows warning:**
   - "Your connection is not private"
   - "NET::ERR_CERT_AUTHORITY_INVALID"

3. **Click "Advanced"**

4. **Click "Proceed to 72.61.170.227 (unsafe)"**

5. **You'll see the HLS playlist** (text starting with #EXTM3U)

6. **Now refresh your game page** (Ctrl+F5)

7. **Stream should display!**

---

## Verification Checklist

- [ ] Certificates created in `/opt/ovenmediaengine/cert/`
- [ ] Port 8443 added to docker-compose.yml
- [ ] Cert volume mounted in docker-compose.yml  
- [ ] TLSPort added to Server.xml
- [ ] TLS section added to Server.xml
- [ ] Container restarted successfully
- [ ] Port 8443 open in firewall
- [ ] HTTPS endpoint returns playlist: `curl -k https://localhost:8443/live/stream/llhls.m3u8`
- [ ] Certificate accepted in browser
- [ ] Admin panel updated with HTTPS URL
- [ ] Frontend refreshed (Ctrl+F5)
- [ ] Stream displays without mixed content errors

---

## Why Self-Signed Certificate?

**Pros:**
- ✅ Works immediately (no DNS needed)
- ✅ Free
- ✅ Solves mixed content issue
- ✅ Can test right now

**Cons:**
- ⚠️ Browser shows warning (must click "Accept")
- ⚠️ Not ideal for production
- ⚠️ Each user must accept certificate once

**For Production:**
Later, you can:
1. Configure DNS for streaming.rajugarikossu.com
2. Get real Let's Encrypt certificate
3. Replace self-signed cert

---

## Alternative: Use Main Domain

If you already have SSL for your main domain (e.g., rajugarikossu.com), you can:

### Option A: Nginx Reverse Proxy

Put Nginx in front of OvenMediaEngine:

```nginx
# /etc/nginx/sites-available/streaming
server {
    listen 443 ssl;
    server_name rajugarikossu.com;

    ssl_certificate /etc/letsencrypt/live/rajugarikossu.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rajugarikossu.com/privkey.pem;

    location /stream/ {
        proxy_pass http://localhost:8080/live/;
        proxy_http_version 1.1;
        
        # CORS
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Range' always;
    }
}
```

Then stream URL becomes:
```
https://rajugarikossu.com/stream/stream/llhls.m3u8
```

No certificate warning!

---

## Recommended Immediate Steps

**For testing right now (5 minutes):**

1. Generate self-signed certificate (commands above)
2. Update docker-compose.yml and Server.xml
3. Restart container
4. Accept certificate in browser
5. Update admin panel with HTTPS URL
6. Stream works!

**For production later:**

1. Configure DNS: streaming.rajugarikossu.com → 72.61.170.227
2. Wait 15 minutes for DNS propagation
3. Get real certificate: `certbot certonly --webroot -w /var/www/html -d streaming.rajugarikossu.com`
4. Replace certificate files
5. Restart container
6. No more certificate warnings!

---

## Complete Command Sequence

Copy and paste these commands:

```bash
# 1. Create self-signed certificate
mkdir -p /opt/ovenmediaengine/cert
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/ovenmediaengine/cert/server.key \
  -out /opt/ovenmediaengine/cert/server.crt \
  -subj "/CN=72.61.170.227" \
  -addext "subjectAltName=IP:72.61.170.227"
chmod 644 /opt/ovenmediaengine/cert/server.crt
chmod 600 /opt/ovenmediaengine/cert/server.key

# 2. Edit docker-compose.yml (add port 8443 and cert volume)
nano /opt/ovenmediaengine/docker-compose.yml
# Add:
#   - "8443:8443"
#   - ./cert:/opt/ovenmediaengine/cert

# 3. Edit Server.xml (add TLSPort and TLS section)
nano /opt/ovenmediaengine/conf/Server.xml
# Add TLSPort: <TLSPort>8443</TLSPort>
# Add TLS section with cert paths

# 4. Restart container
cd /opt/ovenmediaengine
docker-compose down
docker-compose up -d

# 5. Open firewall
ufw allow 8443/tcp

# 6. Test HTTPS
curl -k https://localhost:8443/live/stream/llhls.m3u8

# 7. Accept certificate in browser
# Open: https://72.61.170.227:8443/live/stream/llhls.m3u8
# Click "Advanced" → "Proceed"

# 8. Update admin panel stream URL to:
# https://72.61.170.227:8443/live/stream/llhls.m3u8

# 9. Refresh frontend (Ctrl+F5)
# Stream displays! 🎉
```

---

## Summary

**DNS Issue:** streaming.rajugarikossu.com doesn't exist yet

**Quick Solution:** Self-signed certificate for IP address
- ✅ Works immediately
- ⚠️ Browser warning (click "Accept")
- ✅ Solves mixed content
- ✅ Stream displays

**Later:** Set up DNS and get real certificate (no warnings)

Your stream is working perfectly - just needs HTTPS to match frontend!