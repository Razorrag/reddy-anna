# 🔒 HTTPS Port Configuration Guide

## Port Configuration for HTTPS

### Default Behavior

By default, the server configuration works as follows:

- **PORT**: Used for HTTP server (default: 5000)
- **HTTPS_PORT**: Used for HTTPS server (default: 443)

### Using HTTPS on the Same Port as HTTP

If you want HTTPS to run on the same port as your PORT variable (e.g., port 5000), **don't set HTTPS_PORT**. The server will automatically use the same port for HTTPS.

**Configuration:**
```bash
# In .env file
PORT=5000
HTTPS_ENABLED=true
SSL_KEY_PATH=./server.key
SSL_CERT_PATH=./server.crt
# Don't set HTTPS_PORT - it will use PORT (5000) for HTTPS
```

**Result:** HTTPS will run on port 5000, and HTTP server won't start (HTTPS handles everything).

---

### Using Different Ports for HTTP and HTTPS

If you want separate ports:

**Configuration:**
```bash
# In .env file
PORT=5000          # HTTP server port
HTTPS_PORT=443     # HTTPS server port
HTTPS_ENABLED=true
SSL_KEY_PATH=./server.key
SSL_CERT_PATH=./server.crt
HTTP_TO_HTTPS_REDIRECT=true  # Optional: redirect HTTP to HTTPS
```

**Result:** 
- HTTP server on port 5000
- HTTPS server on port 443
- HTTP redirects to HTTPS (if enabled)

---

## Common Configurations

### Scenario 1: HTTPS on Port 5000 (Single Port)

```bash
PORT=5000
HTTPS_ENABLED=true
SSL_KEY_PATH=./server.key
SSL_CERT_PATH=./server.crt
# HTTPS_PORT not set - will use PORT (5000)
```

Access via: `https://91.108.110.72:5000`

---

### Scenario 2: HTTPS on Port 443, HTTP on Port 5000 (Standard)

```bash
PORT=5000
HTTPS_PORT=443
HTTPS_ENABLED=true
SSL_KEY_PATH=./server.key
SSL_CERT_PATH=./server.crt
HTTP_TO_HTTPS_REDIRECT=true
```

Access via: `https://91.108.110.72:443` or `https://91.108.110.72` (default 443)

---

### Scenario 3: HTTPS on Custom Port (e.g., 8443)

```bash
PORT=5000
HTTPS_PORT=8443
HTTPS_ENABLED=true
SSL_KEY_PATH=./server.key
SSL_CERT_PATH=./server.crt
```

Access via: `https://91.108.110.72:8443`

---

## PM2 Configuration

Update your `ecosystem.config.js` or `.env` file with the correct ports:

```javascript
env_production: {
  NODE_ENV: 'production',
  PORT: 5000,  // Default port
  HTTPS_ENABLED: 'true',
  HTTPS_PORT: '5000',  // Set if different from PORT, or omit to use PORT
  SSL_KEY_PATH: './server.key',
  SSL_CERT_PATH: './server.crt'
}
```

---

## Troubleshooting

### "Port already in use" Error

If you get this error:
1. **Check what's using the port:**
   ```bash
   sudo lsof -i :3000
   # Or
   sudo netstat -tuln | grep :3000
   ```

2. **Stop conflicting service or use different port**

3. **If using port 443, you might need sudo:**
   ```bash
   # Ports < 1024 require root privileges
   sudo pm2 start ecosystem.config.js --env production
   ```

### "Still seeing HTTP on port 5000"

Check:
1. **HTTPS_ENABLED=true** in `.env`
2. **SSL certificates exist** (server.key and server.crt)
3. **Restart PM2** after changes:
   ```bash
   pm2 restart andar-bahar
   pm2 logs andar-bahar
   ```

4. **Check logs** for HTTPS startup:
   ```
   ✅ HTTPS server serving on https://0.0.0.0:3000
   ```

### Verify HTTPS is Running

```bash
# Check if HTTPS is listening
sudo netstat -tuln | grep :3000
# Should show: tcp 0.0.0.0:3000 LISTEN

# Test HTTPS connection
curl -k https://localhost:3000
# Should return HTML/JSON response

# From browser
https://your-vps-ip:3000
# Should show padlock icon (or accept self-signed cert)
```

---

## Quick Setup for Port 5000 HTTPS

```bash
# 1. Set PORT in .env (5000 is default)
echo "PORT=5000" >> .env
echo "HTTPS_ENABLED=true" >> .env
echo "SSL_KEY_PATH=./server.key" >> .env
echo "SSL_CERT_PATH=./server.crt" >> .env

# 2. Generate certificate (if not exists)
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout server.key -out server.crt -days 365 \
  -subj "/CN=91.108.110.72"

# 3. Rebuild and restart
npm run build
pm2 restart andar-bahar

# 4. Access
https://91.108.110.72:5000
```

---

## Summary

- **HTTPS_PORT not set**: HTTPS uses PORT (same port)
- **HTTPS_PORT set**: HTTPS uses HTTPS_PORT (different port)
- **For screen sharing**: MUST use HTTPS on the port you access
- **Check logs**: Look for "✅ HTTPS server serving on https://..." message

---

**After configuration, restart PM2:**
```bash
pm2 restart andar-bahar
pm2 logs andar-bahar --lines 50
```

