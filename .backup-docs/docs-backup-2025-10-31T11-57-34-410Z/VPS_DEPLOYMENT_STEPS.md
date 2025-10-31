# 🚀 VPS DEPLOYMENT - Step by Step Guide

## 📋 PRE-DEPLOYMENT CHECKLIST

Before you start, make sure you have:
- [ ] SSH access to your VPS
- [ ] Supabase project URL and Service Key
- [ ] Your domain name (if using custom domain)
- [ ] Git repository access
- [ ] Node.js installed on VPS (v18+ recommended)

---

## 🔧 STEP 1: PREPARE YOUR VPS

### **1.1 SSH into your VPS**
```bash
ssh your-username@your-vps-ip
```

### **1.2 Navigate to your app directory**
```bash
cd /path/to/your/andar-bahar-app
# Example: cd /var/www/andar-bahar
```

### **1.3 Backup current .env (if exists)**
```bash
cp .env .env.backup.$(date +%Y%m%d)
```

---

## 📥 STEP 2: PULL LATEST CODE

### **2.1 Stash any local changes**
```bash
git stash
```

### **2.2 Pull authentication fixes**
```bash
git pull origin main
```

### **2.3 Verify files are updated**
```bash
# Check if new files exist
ls -la | grep -E "(AUTHENTICATION_FIX_GUIDE|QUICK_START|setup-env)"
```

---

## 🔐 STEP 3: SETUP ENVIRONMENT VARIABLES

### **Option A: Use Automated Setup Script**
```bash
bash setup-env.sh
```
Follow the prompts to enter your configuration.

### **Option B: Manual Setup**

**3.1 Create/Edit .env file**
```bash
nano .env
```

**3.2 Add REQUIRED variables:**
```env
# Database (Get from Supabase Dashboard)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here

# Authentication (Generate new secret)
JWT_SECRET=your-generated-secret-here
JWT_EXPIRES_IN=24h

# Server
NODE_ENV=production
PORT=5000

# CORS (Your domain)
ALLOWED_ORIGINS=https://yourdomain.com
```

**3.3 Generate JWT_SECRET**
```bash
# Generate secure secret
openssl rand -base64 32

# Copy the output and paste it as JWT_SECRET in .env
```

**3.4 Save and exit**
```
Press: Ctrl+X
Then: Y
Then: Enter
```

---

## 📦 STEP 4: INSTALL DEPENDENCIES

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Verify installation
npm list --depth=0
```

---

## 🔨 STEP 5: BUILD APPLICATION

```bash
# Build both client and server
npm run build

# Check build output
ls -la dist/
```

---

## 🔄 STEP 6: RESTART APPLICATION

### **If using PM2:**
```bash
# Restart all processes
pm2 restart all

# Check status
pm2 status

# View logs
pm2 logs --lines 50
```

### **If using systemd:**
```bash
# Restart service
sudo systemctl restart andar-bahar

# Check status
sudo systemctl status andar-bahar

# View logs
sudo journalctl -u andar-bahar -f
```

### **If running directly:**
```bash
# Kill old process
pkill -f "node.*server"

# Start new process
NODE_ENV=production nohup npm start > app.log 2>&1 &

# Check if running
ps aux | grep node
```

---

## ✅ STEP 7: VERIFY DEPLOYMENT

### **7.1 Check Server Logs**
```bash
# PM2
pm2 logs --lines 100

# Look for these success messages:
# ✅ JWT Authentication enabled
# ✅ All required environment variables are set
# ✅ JWT-only authentication configured
```

### **7.2 Test Server Endpoint**
```bash
# Test health check
curl http://localhost:5000/api/health

# Test login endpoint (replace with real credentials)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"1234567890","password":"testpassword"}'

# Should return: {"success":true,"user":{...},"token":"..."}
```

### **7.3 Test from Browser**

1. **Clear browser data:**
   - Open your site
   - Press F12 (DevTools)
   - Application → Storage → Clear site data
   - Or use Incognito window

2. **Test player login:**
   - Go to your domain
   - Try logging in
   - Should redirect to game
   - Check console for: "✅ Token stored successfully"

3. **Test admin login:**
   - Go to `/admin-login`
   - Login with admin credentials
   - Should access admin panel

4. **Test WebSocket:**
   - Open browser console
   - Should see: "✅ WebSocket connected successfully"
   - Should see: "✅ WebSocket authenticated"

---

## 🔍 STEP 8: TROUBLESHOOTING

### **Problem: Server won't start**

**Check logs:**
```bash
pm2 logs
# OR
sudo journalctl -u andar-bahar -f
```

**Common causes:**
- Missing JWT_SECRET → Add to .env
- Missing SUPABASE credentials → Add to .env
- Port already in use → Change PORT in .env or kill process
- Build failed → Run `npm run build` again

### **Problem: "Authentication required" errors**

**Solution:**
```bash
# 1. Verify JWT_SECRET is set
cat .env | grep JWT_SECRET

# 2. Restart server
pm2 restart all

# 3. Clear browser localStorage
# In browser console: localStorage.clear()

# 4. Try login again
```

### **Problem: CORS errors**

**Solution:**
```bash
# Edit .env
nano .env

# Add your domain
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Restart
pm2 restart all
```

### **Problem: WebSocket won't connect**

**Check:**
1. HTTPS enabled? (wss:// requires HTTPS)
2. Token stored? Check: `localStorage.getItem('token')`
3. Firewall blocking WebSocket? Check VPS firewall rules
4. Nginx/Apache proxy configured for WebSocket?

**Nginx WebSocket config:**
```nginx
location /ws {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

---

## 🔒 STEP 9: SECURITY CHECKLIST

After deployment, verify:

- [ ] JWT_SECRET is strong (32+ characters)
- [ ] SUPABASE_SERVICE_KEY is not exposed
- [ ] .env file is not in Git (check .gitignore)
- [ ] HTTPS enabled (SSL certificate)
- [ ] CORS only allows your domain
- [ ] Firewall configured (only ports 80, 443, 22)
- [ ] Regular backups enabled

---

## 📊 STEP 10: MONITORING

### **Setup monitoring:**

```bash
# PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Monitor in real-time
pm2 monit
```

### **Check application health:**

```bash
# CPU and memory usage
pm2 status

# Application logs
pm2 logs --lines 100

# Error logs only
pm2 logs --err --lines 50
```

---

## 🎉 SUCCESS!

If you see all these, deployment is successful:

**Server Logs:**
```
✅ JWT Authentication enabled
✅ All required environment variables are set
✅ serving on http://0.0.0.0:5000
```

**Browser Console:**
```
✅ Token stored successfully
✅ WebSocket connected successfully
✅ WebSocket authenticated
```

**User Experience:**
- ✅ Can register new account
- ✅ Can login (player and admin)
- ✅ Stay logged in (no repeated prompts)
- ✅ Can place bets
- ✅ Game works smoothly

---

## 📞 SUPPORT

If you encounter issues:

1. **Check logs:** `pm2 logs` or `journalctl -u your-app`
2. **Review guide:** See `AUTHENTICATION_FIX_GUIDE.md`
3. **Quick reference:** See `QUICK_START.md`
4. **Test endpoints:** Use curl commands above
5. **Verify .env:** Ensure all required variables are set

---

## 🔄 ROLLBACK (If Needed)

If something goes wrong:

```bash
# Restore old .env
cp .env.backup.YYYYMMDD .env

# Revert code
git reset --hard HEAD~1

# Rebuild
npm install
npm run build

# Restart
pm2 restart all
```

---

**Deployment Guide Version:** 1.0
**Last Updated:** $(date)
