# 🚀 Quick Start Guide for 91.108.110.72

## Your VPS IP: 91.108.110.72

This guide provides ready-to-use commands for your specific VPS IP address.

---

## 📝 Step 1: Generate Self-Signed Certificate

```bash
# Generate certificate for your VPS IP
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout server.key \
  -out server.crt \
  -days 365 \
  -subj "/CN=91.108.110.72"

# Set permissions
chmod 600 server.key
chmod 644 server.crt
```

---

## ⚙️ Step 2: Configure .env File

```bash
# Add to your .env file
PORT=5000
HTTPS_ENABLED=true
SSL_KEY_PATH=./server.key
SSL_CERT_PATH=./server.crt
# Don't set HTTPS_PORT - it will use PORT (5000) for HTTPS
```

---

## 🔧 Step 3: Build and Start

```bash
# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Check logs
pm2 logs andar-bahar --lines 50
```

Look for:
```
✅ HTTPS server serving on https://0.0.0.0:5000
✅ HTTPS is using the same port as PORT (5000) - HTTP server not started
```

---

## 🌐 Step 4: Access Your Application

**HTTPS URL:**
```
https://91.108.110.72:5000
```

**Note:** Browser will show security warning for self-signed certificate. Click:
1. "Advanced" or "Details"
2. "Proceed to 91.108.110.72 (unsafe)" or "Accept the Risk and Continue"

---

## ✅ Verify Setup

### Test HTTPS Connection:
```bash
curl -k https://91.108.110.72:5000/api/health
```

### Test WebSocket:
```javascript
// In browser console
const ws = new WebSocket('wss://91.108.110.72:5000/ws');
ws.onopen = () => console.log('✅ WebSocket connected');
ws.onerror = (e) => console.error('❌ WebSocket error:', e);
```

### Test Screen Sharing:
1. Open: `https://91.108.110.72:5000`
2. Login as admin
3. Go to Admin Panel → Stream Control
4. Click "Start Screen Share"
5. Should work without "getDisplayMedia" errors!

---

## 🔥 Firewall Configuration

```bash
# Open required ports
sudo ufw allow 5000/tcp    # HTTPS (default port)
sudo ufw allow 443/tcp     # HTTPS (if using standard port)
sudo ufw allow 80/tcp      # HTTP (if redirecting)

# WebRTC ports (for screen sharing)
sudo ufw allow 3478/udp    # STUN/TURN
sudo ufw allow 49152:65535/udp  # RTP/RTCP ports

# Enable firewall
sudo ufw enable
sudo ufw status
```

---

## 📊 PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs andar-bahar

# Restart
pm2 restart andar-bahar

# Stop
pm2 stop andar-bahar

# Monitor
pm2 monit
```

---

## 🐛 Troubleshooting

### Certificate Not Found
```bash
# Check if files exist
ls -la server.key server.crt

# Regenerate if missing
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout server.key -out server.crt -days 365 \
  -subj "/CN=91.108.110.72"
```

### Port Already in Use
```bash
# Check what's using port 5000
sudo lsof -i :5000
sudo netstat -tuln | grep :5000

# Stop conflicting service or change PORT in .env
```

### HTTPS Not Starting
```bash
# Check PM2 logs
pm2 logs andar-bahar --err --lines 100

# Verify .env configuration
cat .env | grep HTTPS
```

---

## 🔐 Using Different Ports

If you want HTTPS on port 443 and HTTP on port 5000:

```bash
# In .env
PORT=5000
HTTPS_PORT=443
HTTPS_ENABLED=true
SSL_KEY_PATH=./server.key
SSL_CERT_PATH=./server.crt
HTTP_TO_HTTPS_REDIRECT=true
```

Then access via: `https://91.108.110.72:443` or `https://91.108.110.72`

---

## 📞 Quick Reference

| Item | Value |
|------|-------|
| VPS IP | 91.108.110.72 |
| HTTPS Port | 5000 (default with PORT=5000) |
| Access URL | https://91.108.110.72:5000 |
| WebSocket URL | wss://91.108.110.72:5000/ws |
| Certificate CN | 91.108.110.72 |

---

## ✅ Checklist

- [ ] Certificate generated (`server.key` and `server.crt` exist)
- [ ] `.env` file configured with HTTPS settings
- [ ] Application built (`npm run build`)
- [ ] PM2 started (`pm2 start ecosystem.config.js`)
- [ ] Firewall configured (port 5000 open)
- [ ] HTTPS accessible (`https://91.108.110.72:5000`)
- [ ] Screen sharing works (no errors)

---

**Ready!** Your application should now be accessible at `https://91.108.110.72:5000` with HTTPS enabled for screen sharing! 🎉

---

## 🌐 Using a Domain Name?

If you have a domain name, you can use **Let's Encrypt** for free trusted certificates (no browser warnings)!

**See:** `docs/DOMAIN_SETUP_GUIDE.md` for detailed instructions.

**Quick steps:**
1. Point DNS to `91.108.110.72`
2. Install certbot: `sudo apt install certbot -y`
3. Get certificate: `sudo certbot certonly --standalone -d yourdomain.com`
4. Update `.env` with certificate paths
5. Access via: `https://yourdomain.com:5000`

**Domain: raajugarikossu.com** - See `DOMAIN_SETUP_raajugarikossu.md` for complete setup instructions!

