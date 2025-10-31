# ✅ DEPLOYMENT CHECKLIST

## 🎯 BEFORE YOU START

- [ ] I have SSH access to my VPS
- [ ] I have my Supabase URL and Service Key
- [ ] I have Node.js installed on VPS (v18+)
- [ ] I have backed up my current .env file
- [ ] I understand this will remove session-based auth

---

## 📥 STEP 1: GET THE CODE

```bash
# SSH into VPS
ssh user@your-vps-ip

# Navigate to app
cd /path/to/andar-bahar

# Pull latest code
git pull origin main
```

- [ ] Successfully pulled latest code
- [ ] New files visible (AUTH_FIX_README.md, etc.)

---

## 🔐 STEP 2: SETUP ENVIRONMENT

### **Option A: Automated**
```bash
bash setup-env.sh
```

### **Option B: Manual**
```bash
nano .env
```

**Add these REQUIRED variables:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-generated-secret
NODE_ENV=production
PORT=5000
ALLOWED_ORIGINS=https://yourdomain.com
```

**Generate JWT_SECRET:**
```bash
openssl rand -base64 32
```

- [ ] .env file created/updated
- [ ] JWT_SECRET generated and added
- [ ] SUPABASE credentials added
- [ ] All required variables present

---

## 📦 STEP 3: BUILD

```bash
npm install
npm run build
```

- [ ] Dependencies installed
- [ ] Build completed successfully
- [ ] No errors in build output

---

## 🔄 STEP 4: RESTART

### **PM2:**
```bash
pm2 restart all
pm2 logs
```

### **Systemd:**
```bash
sudo systemctl restart your-app
sudo systemctl status your-app
```

- [ ] Application restarted
- [ ] No errors in logs
- [ ] Server is running

---

## ✅ STEP 5: VERIFY

### **Check Server Logs:**
```bash
pm2 logs --lines 50
```

**Look for:**
- [ ] ✅ JWT Authentication enabled
- [ ] ✅ All required environment variables are set
- [ ] ✅ JWT-only authentication configured
- [ ] ✅ serving on http://0.0.0.0:5000

### **Test in Browser:**

**Clear browser data first!**
- [ ] Opened DevTools (F12)
- [ ] Application → Storage → Clear site data
- [ ] OR using Incognito window

**Test Player Login:**
- [ ] Can access login page
- [ ] Can login with credentials
- [ ] Redirected to game page
- [ ] Console shows: "✅ Token stored successfully"
- [ ] Console shows: "✅ WebSocket connected"

**Test Admin Login:**
- [ ] Can access /admin-login
- [ ] Can login with admin credentials
- [ ] Redirected to admin panel
- [ ] Admin controls work

**Test Gameplay:**
- [ ] Can place bets
- [ ] WebSocket connected
- [ ] Game functions normally
- [ ] No repeated login prompts

---

## 🔍 TROUBLESHOOTING

### **If server won't start:**
```bash
# Check JWT_SECRET
cat .env | grep JWT_SECRET

# Check logs
pm2 logs

# Common fixes:
# - Add JWT_SECRET to .env
# - Verify SUPABASE credentials
# - Check port not in use
```

- [ ] Checked logs
- [ ] Verified environment variables
- [ ] Issue resolved

### **If "Authentication required" errors:**
```bash
# Restart server
pm2 restart all

# Clear browser localStorage
# In browser console: localStorage.clear()
```

- [ ] Server restarted
- [ ] Browser data cleared
- [ ] Issue resolved

### **If CORS errors:**
```bash
# Edit .env
nano .env

# Add domain
ALLOWED_ORIGINS=https://yourdomain.com

# Restart
pm2 restart all
```

- [ ] Domain added to ALLOWED_ORIGINS
- [ ] Server restarted
- [ ] Issue resolved

---

## 🎉 SUCCESS CRITERIA

**All of these should be true:**

### **Server:**
- [ ] Server starts without errors
- [ ] Logs show JWT authentication enabled
- [ ] No session-related messages
- [ ] Port 5000 listening

### **Client:**
- [ ] Can register new account
- [ ] Can login (player and admin)
- [ ] Token stored in localStorage
- [ ] WebSocket connects
- [ ] No repeated login prompts
- [ ] Game works normally

### **Browser Console:**
- [ ] No red errors
- [ ] "✅ Token stored successfully"
- [ ] "✅ WebSocket connected successfully"
- [ ] "✅ WebSocket authenticated"

---

## 📊 FINAL VERIFICATION

**Test these scenarios:**

1. **New User Registration:**
   - [ ] Can register
   - [ ] Redirected to game
   - [ ] Token stored
   - [ ] Can play immediately

2. **Existing User Login:**
   - [ ] Can login
   - [ ] Stays logged in
   - [ ] No repeated prompts
   - [ ] Balance shows correctly

3. **Admin Access:**
   - [ ] Can login as admin
   - [ ] Admin panel accessible
   - [ ] Game controls work
   - [ ] Can manage users

4. **Session Persistence:**
   - [ ] Login once
   - [ ] Refresh page → Still logged in
   - [ ] Close tab → Reopen → Still logged in
   - [ ] After 24h → Must login again (expected)

5. **WebSocket:**
   - [ ] Connects automatically
   - [ ] Stays connected
   - [ ] Real-time updates work
   - [ ] No disconnections

---

## 🔒 SECURITY CHECKLIST

- [ ] JWT_SECRET is strong (32+ characters)
- [ ] SUPABASE_SERVICE_KEY not exposed
- [ ] .env not in Git repository
- [ ] HTTPS enabled (SSL certificate)
- [ ] CORS only allows your domain
- [ ] Firewall configured properly

---

## 📝 POST-DEPLOYMENT

**After successful deployment:**

1. **Monitor for 24 hours:**
   ```bash
   pm2 logs
   ```
   - [ ] No authentication errors
   - [ ] No crashes
   - [ ] Users can login/play

2. **Backup .env:**
   ```bash
   cp .env .env.production.backup
   ```
   - [ ] .env backed up safely

3. **Document credentials:**
   - [ ] JWT_SECRET stored securely
   - [ ] Admin credentials documented
   - [ ] Supabase credentials saved

4. **Update team:**
   - [ ] Notify users of any changes
   - [ ] Share admin credentials (if needed)
   - [ ] Document any issues

---

## 📞 NEED HELP?

**If stuck, check:**

1. [ ] Server logs: `pm2 logs`
2. [ ] Environment: `cat .env`
3. [ ] Quick Start: `QUICK_START.md`
4. [ ] Full Guide: `AUTHENTICATION_FIX_GUIDE.md`
5. [ ] Detailed Steps: `VPS_DEPLOYMENT_STEPS.md`

**Test with curl:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"test","password":"test"}'
```

---

## ✨ COMPLETION

**When all checkboxes are checked, deployment is complete!**

- [ ] All steps completed
- [ ] All verifications passed
- [ ] All tests successful
- [ ] No errors in logs
- [ ] Users can access app
- [ ] Authentication works perfectly

**🎉 CONGRATULATIONS! Authentication is now fixed!**

---

**Checklist Version:** 1.0
**Last Updated:** December 2024
