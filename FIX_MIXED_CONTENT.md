# Fix Mixed Content Issue - HTTPS Site with HTTP Stream

## The Problem

Your frontend is served over **HTTPS** but the stream URL is **HTTP**:
```
Frontend: https://yourdomain.com (HTTPS)
Stream:   http://72.61.170.227:8080/live/stream/llhls.m3u8 (HTTP)
```

**Modern browsers block this for security reasons** - called "Mixed Content Blocking".

Browser console likely shows error:
```
Mixed Content: The page at 'https://yourdomain.com' was loaded over HTTPS, 
but requested an insecure resource 'http://72.61.170.227:8080/...'. 
This request has been blocked; the content must be served over HTTPS.
```

---

## Solutions (3 Options)

### Option 1: Access Frontend via HTTP (Quick Test)

**Temporary solution for testing:**

Instead of:
```
https://yourdomain.com
```

Use:
```
http://yourdomain.com
```

This matches protocols (HTTP frontend + HTTP stream = no blocking).

**Pros:** Immediate, no configuration needed
**Cons:** Not secure, only for testing

---

### Option 2: Set Up SSL for OvenMediaEngine (Recommended)

Make the stream HTTPS so it matches your frontend.

#### Step 1: Get SSL Certificate

You need an SSL certificate for your domain or IP. Options:

**A. Let's Encrypt (Free, for domains):**
```bash
# Install certbot
apt install certbot

# Get certificate (replace with your domain)
certbot certonly --standalone -d streaming.yourdomain.com
```

**B. Self-Signed Certificate (for testing):**
```bash
# Generate self-signed cert
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/ovenmediaengine/cert/server.key \
  -out /opt/ovenmediaengine/cert/server.crt \
  -subj "/CN=72.61.170.227"
```

#### Step 2: Update docker-compose.yml

Add HTTPS port and certificate volume:

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
      - "8443:8443"    # LL-HLS HTTPS (NEW)
    volumes:
      - ./conf:/opt/ovenmediaengine/bin/origin_conf
      - ./logs:/var/log/ovenmediaengine
      - ./cert:/opt/ovenmediaengine/cert  # NEW: SSL certificates
    restart: unless-stopped
```

#### Step 3: Update Server.xml

Add HTTPS configuration for LL-HLS:

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
            <!-- Add HTTPS support -->
            <TLSPort>8443</TLSPort>
        </LLHLS>
    </Publishers>
</Bind>

<!-- Add TLS configuration -->
<TLS>
    <CertPath>/opt/ovenmediaengine/cert/server.crt</CertPath>
    <KeyPath>/opt/ovenmediaengine/cert/server.key</KeyPath>
</TLS>
```

#### Step 4: Restart Container

```bash
cd /opt/ovenmediaengine
docker-compose down
docker-compose up -d
```

#### Step 5: Update Stream URL in Admin Panel

Change from:
```
http://72.61.170.227:8080/live/stream/llhls.m3u8
```

To:
```
https://72.61.170.227:8443/live/stream/llhls.m3u8
```

Now both frontend and stream are HTTPS! ✅

---

### Option 3: Use Nginx Reverse Proxy (Advanced)

Put Nginx in front of OvenMediaEngine to handle SSL.

#### Nginx Configuration:

```nginx
server {
    listen 443 ssl;
    server_name streaming.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/streaming.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/streaming.yourdomain.com/privkey.pem;

    location /live/ {
        proxy_pass http://localhost:8080/live/;
        proxy_http_version 1.1;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Range' always;
        
        # Caching for HLS
        proxy_cache_bypass $http_pragma $http_authorization;
        proxy_no_cache $http_pragma $http_authorization;
    }
}
```

Stream URL becomes:
```
https://streaming.yourdomain.com/live/stream/llhls.m3u8
```

**Pros:** 
- Centralized SSL management
- Can add caching, load balancing
- Professional setup

**Cons:** 
- More complex
- Requires domain name

---

## Quick Fix for Testing (Right Now)

### Step 1: Check Current Frontend URL

Open your game page and check the address bar. If it shows:
```
https://yourdomain.com
```

### Step 2: Change to HTTP

Replace with:
```
http://yourdomain.com
```

**Important:** Make sure to use `http://` not `https://`

### Step 3: Refresh Page

Hard refresh (Ctrl+F5) and stream should display immediately!

---

## Verify Mixed Content is the Issue

### Check Browser Console (F12)

Look for errors like:
```
Mixed Content: The page at 'https://...' was loaded over HTTPS, 
but requested an insecure resource 'http://72.61.170.227:8080/...'. 
This request has been blocked.
```

Or:
```
This request has been blocked; the content must be served over HTTPS.
```

### Check Network Tab

Filter by "llhls" or "m3u8":
- If requests show "blocked:mixed-content" → Confirmed
- If requests show 200 OK → Not a mixed content issue

---

## Long-Term Solution Comparison

| Solution | Security | Complexity | Cost | Time |
|----------|----------|------------|------|------|
| HTTP Frontend | ⚠️ Low | Easy | Free | 1 min |
| HTTPS Stream | ✅ High | Medium | Free* | 30 min |
| Nginx Proxy | ✅ High | Hard | Free* | 1 hour |

*Free with Let's Encrypt

---

## Recommended Approach

### For Immediate Testing:
```bash
# Access via HTTP
http://yourdomain.com
```

### For Production:
1. Set up SSL for OvenMediaEngine (Option 2)
2. Use HTTPS stream URL
3. Keep frontend HTTPS
4. Everything encrypted end-to-end ✅

---

## Implementation Steps (Option 2 - SSL for OME)

### Quick Commands:

```bash
# 1. Create cert directory
mkdir -p /opt/ovenmediaengine/cert

# 2. Generate self-signed certificate (or use Let's Encrypt)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/ovenmediaengine/cert/server.key \
  -out /opt/ovenmediaengine/cert/server.crt \
  -subj "/CN=72.61.170.227"

# 3. Update docker-compose.yml (add port 8443 and cert volume)
nano /opt/ovenmediaengine/docker-compose.yml

# 4. Update Server.xml (add TLSPort and TLS section)
nano /opt/ovenmediaengine/conf/Server.xml

# 5. Restart container
cd /opt/ovenmediaengine
docker-compose down
docker-compose up -d

# 6. Test HTTPS endpoint
curl -k https://localhost:8443/live/stream/llhls.m3u8
```

### Update Admin Panel:

Change stream URL to:
```
https://72.61.170.227:8443/live/stream/llhls.m3u8
```

---

## Testing Checklist

After implementing SSL:

- [ ] Certificate files exist in `/opt/ovenmediaengine/cert/`
- [ ] docker-compose.yml has port 8443 mapped
- [ ] Server.xml has TLSPort and TLS configuration
- [ ] Container restarted successfully
- [ ] HTTPS endpoint responds: `curl -k https://localhost:8443/live/stream/llhls.m3u8`
- [ ] Admin panel updated with HTTPS URL
- [ ] Frontend loads stream without mixed content errors
- [ ] Browser console shows no SSL/security errors

---

## Summary

**Root Cause:** Mixed Content - HTTPS frontend loading HTTP stream

**Quick Fix:** Access frontend via HTTP (testing only)
```
http://yourdomain.com
```

**Proper Fix:** Enable HTTPS for OME on port 8443
```
https://72.61.170.227:8443/live/stream/llhls.m3u8
```

**Expected Result:** Stream displays with no security warnings or blocking!