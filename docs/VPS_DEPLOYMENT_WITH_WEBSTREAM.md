# 🚀 VPS Deployment Guide with Webstream and PM2

## Overview

This guide covers deploying the Andar Bahar application on VPS with:
- ✅ Webstream/RTMP support (Restream.io)
- ✅ WebRTC screen sharing (requires HTTPS)
- ✅ PM2 process management
- ✅ Fixed getDisplayMedia error handling

---

## 📋 Prerequisites

- VPS server with Node.js 18+ installed
- PM2 installed globally: `npm install -g pm2`
- SSL certificate for HTTPS (required for screen sharing)
- Domain name (optional but recommended for HTTPS)

---

## 🔧 Step 1: Build Application

```bash
# Build both client and server
npm run build

# Verify build output
ls -la dist/
# Should see: index.js, public/, assets/, etc.
```

---

## 🔐 Step 2: Configure HTTPS (REQUIRED for Screen Sharing)

Screen sharing **REQUIRES HTTPS** on VPS. HTTP will NOT work.

### Option A: Self-Signed Certificate (Testing)

```bash
# Generate self-signed certificate for IP 91.108.110.72
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout server.key \
  -out server.crt \
  -days 365 \
  -subj "/CN=91.108.110.72"
```

### Option B: Let's Encrypt (Production - Recommended)

```bash
# Install certbot
sudo apt update
sudo apt install certbot -y

# Get certificate (if you have a domain)
sudo certbot certonly --standalone -d yourdomain.com

# Certificates will be in:
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
```

### Configure .env

Add to your `.env` file:

```bash
# HTTPS Configuration (REQUIRED for screen sharing on VPS)
HTTPS_ENABLED=true
HTTPS_PORT=443
SSL_KEY_PATH=./server.key
SSL_CERT_PATH=./server.crt
HTTP_TO_HTTPS_REDIRECT=true

# For Let's Encrypt, use:
# SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
# SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
```

---

## 📺 Step 3: Configure Webstream (Restream.io)

### Get Restream.io Credentials

1. Go to [Restream.io](https://restream.io)
2. Create an account and get your RTMP credentials:
   - RTMP Server URL: `rtmp://live.restream.io/live`
   - Stream Key: `re_XXXXXXXXXXXXXXXXXXXXXXXX`
   - Player URL: `https://player.restream.io?token=XXXXXXXXXXXXXXXXXXXXXXXX`

### Configure in Database

The stream configuration is stored in the `stream_config` table. You can update it via the admin panel or directly in the database:

```sql
-- Update RTMP configuration
UPDATE stream_config SET
  rtmp_server_url = 'rtmp://live.restream.io/live',
  rtmp_stream_key = 're_XXXXXXXXXXXXXXXXXXXXXXXX',
  rtmp_player_url = 'https://player.restream.io?token=XXXXXXXXXXXXXXXXXXXXXXXX',
  active_method = 'rtmp',
  updated_at = NOW()
WHERE id = (SELECT id FROM stream_config LIMIT 1);
```

Or use the API:

```bash
curl -X POST https://91.108.110.72/api/stream/rtmp/config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serverUrl": "rtmp://live.restream.io/live",
    "streamKey": "re_XXXXXXXXXXXXXXXXXXXXXXXX",
    "playerUrl": "https://player.restream.io?token=XXXXXXXXXXXXXXXXXXXXXXXX"
  }'
```

---

## 🔄 Step 4: Configure PM2

### Create Logs Directory

```bash
mkdir -p logs
```

### Start with PM2

```bash
# Start application using ecosystem config
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the command it outputs

# Check status
pm2 status
pm2 logs andar-bahar --lines 50
```

### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs andar-bahar

# Restart application
pm2 restart andar-bahar

# Stop application
pm2 stop andar-bahar

# Reload application (zero-downtime)
pm2 reload andar-bahar

# Monitor
pm2 monit

# Delete application
pm2 delete andar-bahar
```

---

## 🔥 Step 5: Configure Firewall

```bash
# Open required ports
sudo ufw allow 5000/tcp    # HTTP (if redirecting to HTTPS)
sudo ufw allow 443/tcp      # HTTPS
sudo ufw allow 80/tcp      # HTTP (for Let's Encrypt)

# WebRTC ports (for screen sharing)
sudo ufw allow 3478/udp    # STUN/TURN
sudo ufw allow 49152:65535/udp  # RTP/RTCP ports

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## ✅ Step 6: Verify Deployment

### 1. Check HTTPS

```bash
# Test HTTPS endpoint
curl -k https://91.108.110.72:443/api/health

# Should return JSON with status
```

### 2. Check Screen Sharing

1. Open browser: `https://91.108.110.72:443` (or `https://yourdomain.com`)
2. Login as admin
3. Go to Admin Panel → Stream Control
4. Click "Start Screen Share"
5. Should NOT show "get sidplay error" or "getDisplayMedia error"
6. Should prompt for screen/window selection

### 3. Check Webstream/RTMP

1. Go to Admin Panel → Stream Settings
2. Verify RTMP configuration is set
3. Stream from OBS to Restream.io
4. Stream should appear in the player

---

## 🐛 Troubleshooting

### Screen Sharing Error: "getDisplayMedia not available"

**Cause:** Not using HTTPS or browser doesn't support screen sharing

**Fix:**
1. Ensure you're using `https://` not `http://`
2. Use a modern browser (Chrome, Firefox, Edge)
3. Check browser console for detailed error messages

### Screen Sharing Error: "HTTPS required"

**Cause:** Application is running on HTTP

**Fix:**
1. Set `HTTPS_ENABLED=true` in `.env`
2. Ensure SSL certificates are in the correct location
3. Restart PM2: `pm2 restart andar-bahar`

### WebSocket Connection Failed

**Cause:** Firewall blocking WebSocket connections or wrong protocol

**Fix:**
1. Ensure using `wss://` for HTTPS connections
2. Check firewall allows port 443
3. Verify WebSocket server is running: `pm2 logs andar-bahar | grep WebSocket`

### PM2 Not Starting

**Cause:** Missing dependencies or incorrect path

**Fix:**
1. Check PM2 logs: `pm2 logs andar-bahar`
2. Verify build exists: `ls -la dist/index.js`
3. Check Node.js version: `node --version` (should be 18+)
4. Rebuild: `npm run build`

### Stream Not Appearing

**Cause:** RTMP configuration incorrect or stream not started

**Fix:**
1. Verify RTMP credentials in database
2. Check stream status: `curl https://91.108.110.72/api/stream/config`
3. Ensure OBS is streaming to Restream.io
4. Check Restream.io dashboard for stream status

---

## 📝 Environment Variables Summary

```bash
# Application
NODE_ENV=production
PORT=5000

# HTTPS (REQUIRED for screen sharing)
HTTPS_ENABLED=true
HTTPS_PORT=443
SSL_KEY_PATH=./server.key
SSL_CERT_PATH=./server.crt
HTTP_TO_HTTPS_REDIRECT=true

# Database
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# CORS (if needed)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## 🎯 Quick Start Commands

```bash
# Full deployment workflow
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # Follow instructions

# Monitor
pm2 status
pm2 logs andar-bahar

# Restart after changes
pm2 restart andar-bahar
```

---

## 📚 Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Let's Encrypt Guide](https://letsencrypt.org/getting-started/)
- [Restream.io Documentation](https://restream.io/blog/restream-io-obs-studio-setup-guide/)
- [WebRTC Screen Sharing Guide](./VPS_STREAMING_FIX_GUIDE.md)

---

## ✨ What's Fixed

1. ✅ **getDisplayMedia Error Handling** - All errors are now caught and handled gracefully
2. ✅ **HTTPS Support** - Automatic HTTPS configuration with self-signed or Let's Encrypt certificates
3. ✅ **Webstream Integration** - RTMP/Restream.io fully configured
4. ✅ **PM2 Configuration** - Production-ready process management
5. ✅ **Security Context Checks** - Prevents errors before attempting screen share

---

**Ready to deploy?** Follow the steps above and your application will be running on VPS with full streaming support! 🚀

