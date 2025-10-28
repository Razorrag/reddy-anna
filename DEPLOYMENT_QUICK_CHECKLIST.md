# ✅ DEPLOYMENT QUICK CHECKLIST
## Use this for rapid deployment verification

---

## 🎯 BEFORE STARTING

- [ ] I have SSH access to VPS
- [ ] I have Supabase credentials ready
- [ ] I have backed up current .env
- [ ] I have created database backup
- [ ] I have 30+ minutes for deployment

---

## 📦 STEP 1: BACKUP (5 min)

```bash
# Backup .env
cp .env ~/backups/.env.backup.$(date +%Y%m%d)

# Backup app (optional)
cd .. && tar -czf ~/backups/app-$(date +%Y%m%d).tar.gz andar-bahar/
```

- [ ] .env backed up
- [ ] Supabase backup verified

---

## 🗄️ STEP 2: DATABASE (10 min)

```bash
# Go to Supabase SQL Editor
# Copy: server/schemas/comprehensive_db_schema.sql
# Paste and Run
```

- [ ] Schema executed successfully
- [ ] New tables created
- [ ] Functions created
- [ ] Admin user exists

**Verify:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
```

---

## 🔄 STEP 3: STOP APP (2 min)

```bash
pm2 stop all
# OR
sudo systemctl stop your-app-name
```

- [ ] Application stopped
- [ ] No node processes running

---

## 📥 STEP 4: PULL CODE (3 min)

```bash
git stash
git pull origin main
rm -rf node_modules package-lock.json
npm install
```

- [ ] Code pulled
- [ ] Dependencies installed
- [ ] No errors

---

## 🔐 STEP 5: CONFIGURE ENV (5 min)

```bash
nano .env
```

**Required variables:**
```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SERVICE_KEY
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=24h
NODE_ENV=production
PORT=5000
ALLOWED_ORIGINS=https://yourdomain.com
VITE_API_BASE_URL=yourdomain.com
VITE_WS_URL=wss://yourdomain.com/ws
```

- [ ] All variables set
- [ ] JWT_SECRET generated
- [ ] No "YOUR_" placeholders
- [ ] Domain names correct

---

## 🔨 STEP 6: BUILD (5 min)

```bash
npm run build
ls -la dist/
```

- [ ] Build completed
- [ ] dist/ directory exists
- [ ] No build errors

---

## 🚀 STEP 7: START APP (2 min)

```bash
pm2 start dist/index.js --name andar-bahar
pm2 save
# OR
sudo systemctl start your-app-name
```

- [ ] App started
- [ ] No immediate crashes

---

## ✅ STEP 8: VERIFY (8 min)

### **Check Logs:**
```bash
pm2 logs andar-bahar --lines 50
```

**Must see:**
- [ ] ✅ JWT Authentication enabled
- [ ] ✅ All required environment variables are set
- [ ] ✅ Database connected successfully
- [ ] ✅ Server running on port 5000

### **Test API:**
```bash
curl http://localhost:5000/api/health
```
- [ ] Returns `{"status":"ok"}`

### **Test Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"test","password":"test"}'
```
- [ ] Returns token

### **Test in Browser:**

**Clear cache first!**
- [ ] F12 → Application → Clear site data

**Player Test:**
- [ ] Can access site
- [ ] Can login
- [ ] Token stored: `localStorage.getItem('token')`
- [ ] WebSocket connected
- [ ] Console shows: ✅ WebSocket authenticated

**Admin Test:**
- [ ] Can access /admin-login
- [ ] Can login (admin / Admin@123)
- [ ] Admin panel loads
- [ ] Can start game

---

## 🎉 SUCCESS CRITERIA

All must be ✅:

- [ ] Server running without errors
- [ ] API endpoints responding
- [ ] Users can login
- [ ] WebSocket connected
- [ ] Admin panel works
- [ ] Game functions properly
- [ ] No authentication loops
- [ ] Balance updates correctly

---

## 🚨 IF SOMETHING FAILS

### **Server won't start:**
```bash
pm2 logs andar-bahar --err
cat .env | grep JWT_SECRET
```

### **Auth errors:**
```bash
pm2 restart andar-bahar
# In browser: localStorage.clear()
```

### **CORS errors:**
```bash
nano .env
# Fix ALLOWED_ORIGINS
pm2 restart andar-bahar
```

### **WebSocket fails:**
```bash
# Check token in browser console
localStorage.getItem('token')
# Check Nginx config for WebSocket proxy
```

### **Need to rollback:**
```bash
pm2 stop andar-bahar
cp ~/backups/.env.backup.YYYYMMDD .env
git reset --hard HEAD~1
npm install && npm run build
pm2 start andar-bahar
```

---

## 📊 MONITORING

```bash
# Real-time monitoring
pm2 monit

# Check logs
pm2 logs andar-bahar

# Check status
pm2 status
```

---

## 🔒 SECURITY CHECK

- [ ] JWT_SECRET is 32+ characters
- [ ] SUPABASE_SERVICE_KEY not exposed
- [ ] .env not in Git
- [ ] HTTPS enabled
- [ ] CORS restricted to domain
- [ ] Firewall configured

---

## 📝 TOTAL TIME: ~40 minutes

- Backup: 5 min
- Database: 10 min
- Stop/Pull/Install: 5 min
- Configure: 5 min
- Build: 5 min
- Start: 2 min
- Verify: 8 min

---

## 📞 NEED HELP?

See: `COMPLETE_VPS_DEPLOYMENT_GUIDE.md` for detailed instructions

**Quick commands:**
```bash
# View full logs
pm2 logs andar-bahar --lines 200

# Check environment
cat .env | grep -E "(JWT_SECRET|SUPABASE_URL|NODE_ENV)"

# Test health
curl http://localhost:5000/api/health

# Restart
pm2 restart andar-bahar
```

---

**Checklist Version:** 1.0  
**For:** Complete VPS Deployment  
**Updated:** October 28, 2025
