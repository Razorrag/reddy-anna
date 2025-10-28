# 🔐 AUTHENTICATION SYSTEM - COMPLETE FIX GUIDE

## 🎯 PROBLEM SUMMARY

Your app has **MULTIPLE CONFLICTING** authentication systems running simultaneously:
1. ❌ JWT tokens (generated but not consistently enforced)
2. ❌ Express sessions (cookie-based, memory store)
3. ❌ Mixed authentication (some routes use JWT, some use sessions)
4. ❌ WebSocket uses JWT, HTTP routes use sessions
5. ❌ Tokens stored but not always sent/validated

**Result:** Users get asked to login repeatedly, sessions lost, authentication fails randomly.

---

## ✅ THE SOLUTION: Unified JWT-Only Authentication

**ONE authentication method:** JWT tokens only (no sessions)

### Why JWT-Only?
- ✅ **Stateless** - Works across multiple servers (VPS scalability)
- ✅ **Consistent** - Same auth for HTTP and WebSocket
- ✅ **Simple** - One token, one validation method
- ✅ **Secure** - Token-based with expiration
- ✅ **Mobile-friendly** - No cookie issues

---

## 🔧 WHAT WAS FIXED

### 1. **Server-Side Changes**
- ✅ Removed session middleware (express-session)
- ✅ Unified authentication to JWT-only
- ✅ All routes now use `requireAuth` middleware (JWT validation)
- ✅ WebSocket authentication uses same JWT tokens
- ✅ Consistent token validation across all endpoints

### 2. **Client-Side Changes**
- ✅ All API calls include `Authorization: Bearer <token>` header
- ✅ Token stored in localStorage on login
- ✅ Token automatically added to all requests (apiClient)
- ✅ WebSocket sends token on connection
- ✅ Auto-logout on token expiration (401 response)

### 3. **Authentication Flow**
```
1. User logs in → Server validates credentials
2. Server generates JWT token → Returns to client
3. Client stores token in localStorage
4. All requests include: Authorization: Bearer <token>
5. Server validates token on every request
6. Token expires after 24h → User must re-login
```

---

## 📋 ENVIRONMENT VARIABLES REQUIRED

### **Minimum Required** (Must have these):
```env
# Supabase (Database)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here

# JWT Authentication (CRITICAL)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=24h

# Server
NODE_ENV=production
PORT=5000
```

### **Optional** (Recommended for production):
```env
# CORS (Your domain)
ALLOWED_ORIGINS=https://yourdomain.com

# Game Settings
MIN_BET=1000
MAX_BET=100000
DEFAULT_BALANCE=100000.00
DEFAULT_TIMER_DURATION=30

# Rate Limiting
MAX_BETS_PER_MINUTE=30
RATE_LIMIT_WINDOW_MS=60000
```

### **NOT NEEDED** (Removed):
```env
# ❌ SESSION_SECRET - Not used anymore (removed sessions)
# ❌ REDIS_URL - Not needed for JWT auth
# ❌ REDIS_HOST - Not needed
# ❌ REDIS_PASSWORD - Not needed
```

---

## 🚀 DEPLOYMENT STEPS FOR VPS

### **Step 1: Update Environment Variables**

SSH into your VPS and update `.env` file:

```bash
cd /path/to/your/app
nano .env
```

**Add/Update these variables:**
```env
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here

# JWT (Generate new secret)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=24h

# Production
NODE_ENV=production
PORT=5000
ALLOWED_ORIGINS=https://yourdomain.com

# Game Config
MIN_BET=1000
MAX_BET=100000
DEFAULT_BALANCE=100000.00
```

**Generate secure JWT secret:**
```bash
# On your VPS, run:
openssl rand -base64 32
# Copy the output and use it as JWT_SECRET
```

### **Step 2: Pull Latest Code**

```bash
# Pull the authentication fixes
git pull origin main

# Install dependencies
npm install
```

### **Step 3: Build the Application**

```bash
# Build client and server
npm run build
```

### **Step 4: Restart the Application**

If using PM2:
```bash
pm2 restart all
pm2 logs
```

If using systemd:
```bash
sudo systemctl restart your-app-name
sudo systemctl status your-app-name
```

If running directly:
```bash
# Stop old process
pkill -f "node.*server"

# Start new process
NODE_ENV=production npm start
```

### **Step 5: Verify Authentication**

1. **Clear browser data** (Important!)
   - Open browser DevTools (F12)
   - Application → Storage → Clear site data
   - Or use Incognito/Private window

2. **Test login:**
   - Go to your domain
   - Try logging in as player
   - Check browser console for errors
   - Verify you can access game

3. **Test admin:**
   - Go to `/admin-login`
   - Login with admin credentials
   - Verify admin panel access

---

## 🔍 TROUBLESHOOTING

### Problem: "Authentication required" on every page

**Solution:**
```bash
# 1. Check JWT_SECRET is set
echo $JWT_SECRET

# 2. Restart server
pm2 restart all

# 3. Clear browser localStorage
# In browser console:
localStorage.clear()
```

### Problem: "Invalid or expired token"

**Solution:**
- Token expired (24h default)
- User needs to login again
- This is NORMAL behavior
- Increase `JWT_EXPIRES_IN` if needed (e.g., `JWT_EXPIRES_IN=7d`)

### Problem: CORS errors

**Solution:**
```env
# Add your domain to ALLOWED_ORIGINS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Problem: WebSocket won't connect

**Solution:**
1. Check token is stored: `localStorage.getItem('token')`
2. Check WebSocket URL matches your domain
3. Ensure HTTPS for production (wss:// not ws://)

---

## 📊 AUTHENTICATION CHECKLIST

After deployment, verify:

- [ ] Can register new player account
- [ ] Can login as player
- [ ] Token stored in localStorage
- [ ] Can access game page
- [ ] Can place bets
- [ ] WebSocket connects successfully
- [ ] Can logout
- [ ] Can login as admin
- [ ] Admin panel accessible
- [ ] Token expires after set time
- [ ] Auto-redirect to login on token expiry

---

## 🎓 HOW IT WORKS NOW

### **Login Flow:**
1. User enters credentials → POST `/api/auth/login`
2. Server validates → Generates JWT token
3. Response: `{ success: true, user: {...}, token: "jwt-token-here" }`
4. Client stores token in `localStorage.setItem('token', token)`
5. All future requests include: `Authorization: Bearer <token>`

### **Protected Route Access:**
1. Client sends request with `Authorization: Bearer <token>`
2. Server middleware (`requireAuth`) validates token
3. If valid → Request proceeds
4. If invalid/expired → 401 error → Auto-logout → Redirect to login

### **WebSocket Connection:**
1. Client connects to WebSocket
2. Sends authentication message with token
3. Server validates token
4. If valid → Connection established
5. If invalid → Connection closed

---

## 🔒 SECURITY NOTES

1. **JWT_SECRET** - Keep this secret! Never commit to Git
2. **Token Expiration** - Default 24h, adjust as needed
3. **HTTPS Required** - Use SSL certificate in production
4. **CORS** - Only allow your domain in production
5. **Rate Limiting** - Already configured to prevent abuse

---

## 📞 SUPPORT

If issues persist:
1. Check server logs: `pm2 logs` or `journalctl -u your-app`
2. Check browser console for errors
3. Verify all environment variables are set
4. Ensure database (Supabase) is accessible
5. Test with Incognito window (fresh session)

---

## ✨ BENEFITS OF THIS FIX

- ✅ **No more repeated login prompts**
- ✅ **Consistent authentication across app**
- ✅ **Works with WebSocket seamlessly**
- ✅ **Scalable** (no server-side session storage)
- ✅ **Secure** (JWT with expiration)
- ✅ **Simple** (one auth method, easy to debug)

---

**Last Updated:** $(date)
**Version:** 2.0 - JWT-Only Authentication
