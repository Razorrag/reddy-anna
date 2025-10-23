# 🔒 SSL/HTTPS Setup Guide for Hostinger VPS

## 🚨 **CRITICAL: Fix All Production Errors**

This guide will fix ALL your production errors:
- ❌ Cross-Origin-Opener-Policy ignored
- ❌ Content Security Policy violations
- ❌ Google Fonts blocked
- ❌ Restream.io iframe blocked
- ❌ Mixed content issues

---

## 📋 **Step 1: Domain Setup (MUST DO FIRST)**

### **Why Domain is Required:**
- SSL certificates don't work with IP addresses
- Browsers require trusted origins for security features
- Your current IP `91.108.110.72` will never work with SSL

### **Actions:**
1. **Buy a domain** (if you don't have one)
2. **Point domain to Hostinger VPS**:
   ```
   A Record: @ → 91.108.110.72
   A Record: www → 91.108.110.72
   ```
3. **Wait for DNS propagation** (5-30 minutes)

### **Verify Domain:**
```bash
# Check if domain points to your VPS
ping yourdomain.com
# Should return: 91.108.110.72
```

---

## 📋 **Step 2: Install SSL Certificate**

### **Option A: Let's Encrypt (Free - Recommended)**

#### **Install Certbot on Hostinger VPS:**
```bash
# SSH into your Hostinger VPS
ssh root@91.108.110.72

# Update system
apt update && apt upgrade -y

# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### **Follow Certbot Prompts:**
1. Enter email address
2. Agree to terms (A)
3. Share email (N - optional)
4. Choose redirect option (2 - Redirect)

### **Option B: Hostinger SSL (Easy)**

1. **Log into Hostinger Control Panel**
2. **Go to SSL Manager**
3. **Select your domain**
4. **Install Free SSL**
5. **Wait for activation** (5-15 minutes)

---

## 📋 **Step 3: Nginx Configuration**

### **Create Nginx Config File:**
```bash
# Create new config
nano /etc/nginx/sites-available/yourdomain.com
```

### **Paste This Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security Headers (CRITICAL FOR YOUR ERRORS)
    add_header X-Frame-Options "ALLOW-FROM https://player.restream.io";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Content Security Policy (FIXES ALL YOUR CSP ERRORS)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; frame-src 'self' https://player.restream.io; connect-src 'self' wss://yourdomain.com https://player.restream.io; media-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self';" always;
    
    # Cross-Origin-Opener-Policy (FIXES YOUR HTTPS ERROR)
    add_header Cross-Origin-Opener-Policy "same-origin";
    add_header Cross-Origin-Embedder-Policy "require-corp";
    add_header Cross-Origin-Resource-Policy "cross-origin";

    # Reverse Proxy to Your App
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket Support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # WebSocket Endpoint
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static Files
    location /static/ {
        alias /root/your-app/client/dist/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### **Enable the Configuration:**
```bash
# Enable site
ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

# Restart Nginx
systemctl restart nginx
```

---

## 📋 **Step 4: Update Environment Variables**

### **Edit Your .env File:**
```bash
# Go to your app directory
cd /root/your-app

# Edit .env file
nano .env
```

### **Update These Values:**
```env
# Change from development to production
NODE_ENV=production

# Update CORS origin to your domain
CORS_ORIGIN=https://yourdomain.com

# Update WebSocket URL to HTTPS/WSS
WEBSOCKET_URL=wss://yourdomain.com

# Update API base URL
VITE_API_BASE_URL=yourdomain.com

# Update port (Nginx handles external, app stays on 5000)
PORT=5000

# Generate new secure secrets
SESSION_SECRET=your-new-secure-secret-here-min-32-chars
JWT_SECRET=your-new-jwt-secret-here-min-32-chars

# Keep other settings the same
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-key
```

---

## 📋 **Step 5: Restart Your Application**

### **Using PM2 (Recommended):**
```bash
# Stop current app
pm2 stop all

# Start with new environment
pm2 start dist/index.js --name "andar-bahar" --env production

# Save PM2 config
pm2 save

# Setup PM2 startup
pm2 startup
```

### **Or Direct Start:**
```bash
# Stop current process
pkill -f "node dist/index.js"

# Start in production mode
NODE_ENV=production node dist/index.js
```

---

## 📋 **Step 6: Test Everything**

### **SSL Certificate Test:**
```bash
# Check SSL certificate
certbot certificates

# Test SSL configuration
openssl s_client -connect yourdomain.com:443
```

### **Browser Test:**
1. **Open**: `https://yourdomain.com`
2. **Check**: Padlock icon (should be secure)
3. **Test**: All pages load without errors
4. **Verify**: Restream.io iframe works
5. **Check**: Google Fonts load

### **WebSocket Test:**
1. **Open browser console**
2. **Look for**: `✅ WebSocket connected successfully to: wss://yourdomain.com/ws`
3. **No errors**: Should be clean

---

## 🚨 **Expected Results**

### **✅ All Errors Fixed:**
- ❌ ~~Cross-Origin-Opener-Policy ignored~~ → ✅ **Fixed with HTTPS**
- ❌ ~~Content Security Policy violations~~ → ✅ **Fixed with proper CSP**
- ❌ ~~Google Fonts blocked~~ → ✅ **Fixed with font-src in CSP**
- ❌ ~~Restream.io iframe blocked~~ → ✅ **Fixed with frame-src in CSP**
- ❌ ~~Mixed content issues~~ → ✅ **Fixed with HTTPS everywhere**

### **✅ Working Features:**
- 🎥 **Restream.io live streaming**
- 🎨 **Google Fonts loading**
- 🔒 **Secure HTTPS connection**
- 📡 **WebSocket over WSS**
- 🌐 **Proper CORS handling**

---

## 🛠️ **Troubleshooting**

### **If SSL Doesn't Work:**
```bash
# Check DNS propagation
nslookup yourdomain.com

# Check Nginx logs
tail -f /var/log/nginx/error.log

# Restart services
systemctl restart nginx
systemctl restart certbot
```

### **If CSP Still Blocks:**
```bash
# Test CSP headers
curl -I https://yourdomain.com

# Look for Content-Security-Policy header
```

### **If WebSocket Fails:**
```bash
# Check if app is running on port 5000
netstat -tlnp | grep :5000

# Check Nginx proxy logs
tail -f /var/log/nginx/access.log
```

---

## 🎯 **Final Verification Checklist**

- [ ] Domain points to VPS IP
- [ ] SSL certificate installed and active
- [ ] Nginx configuration loaded
- [ ] Environment variables updated
- [ ] Application restarted
- [ ] HTTPS works in browser
- [ ] No console errors
- [ ] Restream.io iframe loads
- [ ] Google Fonts display
- [ ] WebSocket connects over WSS

---

## 🚀 **You're Done!**

After completing these steps, your production app will:
- ✅ **Load securely over HTTPS**
- ✅ **Display all fonts properly**
- ✅ **Stream Restream.io perfectly**
- ✅ **Handle WebSocket connections**
- ✅ **Pass all browser security checks**

**Your Andar Bahar live streaming app is now production-ready!** 🎉
