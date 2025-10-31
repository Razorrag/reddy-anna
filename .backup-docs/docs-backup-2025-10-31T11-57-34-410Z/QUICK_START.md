# 🚀 QUICK START - Authentication Fix Deployment

## ⚡ FASTEST WAY TO DEPLOY (VPS)

### **Option 1: Automated Setup (Recommended)**

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Navigate to your app directory
cd /path/to/andar-bahar

# Pull latest code
git pull origin main

# Run setup script (creates .env with prompts)
bash setup-env.sh

# Deploy the fix
bash deploy-auth-fix.sh
```

### **Option 2: Manual Setup**

```bash
# 1. SSH into VPS
ssh user@your-vps-ip
cd /path/to/andar-bahar

# 2. Pull latest code
git pull origin main

# 3. Create .env file
nano .env
```

**Paste this and fill in YOUR values:**
```env
# REQUIRED - Get from Supabase Dashboard
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here

# REQUIRED - Generate with: openssl rand -base64 32
JWT_SECRET=paste-generated-secret-here
JWT_EXPIRES_IN=24h

# REQUIRED - Production settings
NODE_ENV=production
PORT=5000
ALLOWED_ORIGINS=https://yourdomain.com

# OPTIONAL - Game settings
MIN_BET=1000
MAX_BET=100000
DEFAULT_BALANCE=100000
```

```bash
# 4. Generate JWT secret
openssl rand -base64 32
# Copy output and paste as JWT_SECRET in .env

# 5. Save .env file (Ctrl+X, Y, Enter)

# 6. Install and build
npm install
npm run build

# 7. Restart application
pm2 restart all
# OR
sudo systemctl restart your-app-name
```

---

## 🧪 TESTING AFTER DEPLOYMENT

### **1. Clear Browser Data (IMPORTANT!)**
```
Open your site → F12 (DevTools) → Application → Storage → Clear site data
OR use Incognito/Private window
```

### **2. Test Player Login**
1. Go to your domain
2. Click "Sign Up" or "Login"
3. Enter credentials
4. Should redirect to game
5. Check browser console - should see "✅ Token stored"

### **3. Test Admin Login**
1. Go to `/admin-login`
2. Enter admin credentials
3. Should redirect to admin panel
4. Verify game controls work

### **4. Verify WebSocket**
1. Open browser console (F12)
2. Should see: "✅ WebSocket connected"
3. Should see: "✅ WebSocket authenticated"

---

## 🔍 QUICK TROUBLESHOOTING

### **"Authentication required" on every page**
```bash
# Check JWT_SECRET is set
cat .env | grep JWT_SECRET

# Restart server
pm2 restart all

# Clear browser localStorage
# In browser console: localStorage.clear()
```

### **"Invalid or expired token"**
- Token expired (normal after 24h)
- User needs to login again
- To extend: Set `JWT_EXPIRES_IN=7d` in .env

### **"CORS error"**
```bash
# Add your domain to .env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### **Server won't start**
```bash
# Check logs
pm2 logs
# OR
journalctl -u your-app-name -f

# Common issues:
# - Missing JWT_SECRET
# - Missing SUPABASE credentials
# - Port already in use
```

---

## 📋 ENVIRONMENT VARIABLES CHECKLIST

**REQUIRED (Must have):**
- [x] `SUPABASE_URL`
- [x] `SUPABASE_SERVICE_KEY`
- [x] `JWT_SECRET` (min 32 chars)
- [x] `NODE_ENV=production`
- [x] `PORT=5000`

**RECOMMENDED:**
- [x] `ALLOWED_ORIGINS` (your domain)
- [x] `JWT_EXPIRES_IN=24h`
- [x] `MIN_BET`, `MAX_BET`, `DEFAULT_BALANCE`

**NOT NEEDED (Removed):**
- ❌ `SESSION_SECRET` (not used anymore)
- ❌ `REDIS_URL` (JWT is stateless)

---

## 🎯 WHAT CHANGED?

### **Before (Broken):**
- ❌ Mixed authentication (sessions + JWT)
- ❌ Inconsistent token usage
- ❌ Users asked to login repeatedly
- ❌ WebSocket auth different from HTTP

### **After (Fixed):**
- ✅ JWT-only authentication
- ✅ Consistent across all endpoints
- ✅ Single login stays logged in
- ✅ WebSocket uses same JWT tokens
- ✅ Stateless (works across servers)

---

## 📞 NEED HELP?

1. **Check logs first:**
   ```bash
   pm2 logs
   # Look for errors with ❌ symbol
   ```

2. **Verify environment:**
   ```bash
   cat .env
   # Ensure JWT_SECRET and SUPABASE credentials are set
   ```

3. **Test with curl:**
   ```bash
   # Test login endpoint
   curl -X POST https://yourdomain.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"phone":"1234567890","password":"yourpassword"}'
   
   # Should return: {"success":true,"user":{...},"token":"..."}
   ```

4. **Check detailed guide:**
   - See `AUTHENTICATION_FIX_GUIDE.md` for comprehensive troubleshooting

---

## ✅ SUCCESS INDICATORS

After deployment, you should see:

**In Server Logs:**
```
✅ JWT Authentication enabled
✅ All required environment variables are set
✅ JWT-only authentication configured (sessions disabled)
```

**In Browser Console (after login):**
```
✅ Token stored successfully
✅ WebSocket connected successfully
✅ WebSocket authenticated
```

**User Experience:**
- Login once → Stay logged in
- No repeated login prompts
- Game loads immediately
- Bets work without issues

---

**Last Updated:** $(date)
**Quick Start Version:** 1.0
