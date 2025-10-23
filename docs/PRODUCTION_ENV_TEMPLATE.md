# 🌍 Production Environment Configuration

## 📋 **Copy This to Your .env File**

Replace your current `.env` file content with this production-ready configuration.

---

## 🔧 **Production .env Template**

```env
# 🔐 SUPABASE CONFIGURATION (KEEP YOUR EXISTING VALUES)
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SUPABASE_SERVICE_KEY_HERE

# 🎯 JWT CONFIGURATION (GENERATE NEW SECRETS FOR PRODUCTION)
# Use: openssl rand -base64 32
JWT_SECRET=your-new-secure-jwt-secret-key-min-32-characters-long
JWT_EXPIRES_IN=24h
JWT_ISSUER=AndarBaharApp
JWT_AUDIENCE=users

# 🖥️ SERVER CONFIGURATION (PRODUCTION SETTINGS)
NODE_ENV=production
PORT=5000
WEBSOCKET_URL=wss://yourdomain.com

# 🌐 CORS CONFIGURATION (PRODUCTION DOMAIN)
CORS_ORIGIN=https://yourdomain.com

# 📡 RTMP SERVER CONFIGURATION (KEEP IF NEEDED)
RTMP_SERVER_PORT=1936
RTMP_HTTP_PORT=8001
RTMP_APP_NAME=live

# 🗄️ DATABASE CONFIGURATION (KEEP IF NEEDED)
DATABASE_URL=postgresql://username:password@localhost:5432/andar_bahar

# 🌍 CLIENT-SIDE API CONFIGURATION (PRODUCTION DOMAIN)
VITE_API_BASE_URL=yourdomain.com

# 🔒 SESSION CONFIGURATION (GENERATE NEW SECRET)
SESSION_SECRET=your-new-secure-session-secret-change-in-production-min-32-chars

# 📊 ADDITIONAL CONFIGURATION (KEEP YOUR VALUES)
MIN_BET_AMOUNT=1000
MAX_BET_AMOUNT=50000
DEFAULT_BALANCE=10000
HOUSE_COMMISSION=0.05

# 🚀 PRODUCTION SPECIFIC SETTINGS
# These are already set correctly for production
# NODE_ENV=production (already set above)
# CORS_ORIGIN=https://yourdomain.com (already set above)
# VITE_API_BASE_URL=yourdomain.com (already set above)
# WEBSOCKET_URL=wss://yourdomain.com (already set above)
```

---

## 🔄 **Changes You Need to Make**

### **1. Replace Your Domain:**
```bash
# Replace "yourdomain.com" with your actual domain
# Example: CORS_ORIGIN=https://andarbaharlive.com
```

### **2. Generate New Secrets:**
```bash
# Generate JWT Secret
openssl rand -base64 32
# Result: something like: abc123def456ghi789jkl012mno345pqr

# Generate Session Secret  
openssl rand -base64 32
# Result: something like: xyz789uvw456rst123stu789vwx012yz
```

### **3. Keep Your Existing Values:**
- `SUPABASE_URL` - Keep your current Supabase URL
- `SUPABASE_SERVICE_KEY` - Keep your current Supabase key
- `VITE_SUPABASE_URL` - Keep your current Supabase URL
- `VITE_SUPABASE_ANON_KEY` - Keep your current Supabase anon key

---

## 📝 **Step-by-Step Update Process**

### **Step 1: SSH into Your VPS:**
```bash
ssh root@91.108.110.72
```

### **Step 2: Go to App Directory:**
```bash
cd /root/your-app-folder
```

### **Step 3: Backup Current .env:**
```bash
cp .env .env.backup
```

### **Step 4: Edit .env File:**
```bash
nano .env
```

### **Step 5: Replace Content:**
1. **Delete all current content**
2. **Copy-paste the template above**
3. **Replace `yourdomain.com`** with your actual domain
4. **Replace the secrets** with newly generated ones
5. **Keep your Supabase values** unchanged

### **Step 6: Save and Exit:**
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

---

## 🎯 **Critical Changes Explained**

### **NODE_ENV=production**
- Enables production optimizations
- Disables development features
- Improves performance

### **CORS_ORIGIN=https://yourdomain.com**
- Allows requests from your domain only
- Fixes CORS issues in production
- Replaces `http://localhost:3000`

### **WEBSOCKET_URL=wss://yourdomain.com**
- Uses secure WebSocket (WSS)
- Replaces `ws://localhost:5000`
- Fixes WebSocket security issues

### **VITE_API_BASE_URL=yourdomain.com**
- Removes protocol for flexibility
- Works with both HTTP and HTTPS
- Replaces `localhost:5000`

### **New Secrets**
- `SESSION_SECRET` - Prevents session hijacking
- `JWT_SECRET` - Secures JWT tokens
- Both must be different from development

---

## ✅ **Verification Checklist**

After updating your `.env` file, verify:

- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGIN=https://yourdomain.com` (your actual domain)
- [ ] `WEBSOCKET_URL=wss://yourdomain.com` (your actual domain)
- [ ] `VITE_API_BASE_URL=yourdomain.com` (your actual domain)
- [ ] `SESSION_SECRET` is new and 32+ characters
- [ ] `JWT_SECRET` is new and 32+ characters
- [ ] Supabase values are unchanged
- [ ] No localhost URLs remain

---

## 🚨 **Common Mistakes to Avoid**

### **❌ Don't Do This:**
```env
# Wrong - still using localhost
CORS_ORIGIN=http://localhost:3000

# Wrong - still using HTTP
WEBSOCKET_URL=ws://yourdomain.com

# Wrong - weak secrets
SESSION_SECRET=weakpassword

# Wrong - includes protocol
VITE_API_BASE_URL=https://yourdomain.com
```

### **✅ Do This Instead:**
```env
# Correct - using production domain
CORS_ORIGIN=https://yourdomain.com

# Correct - using secure WebSocket
WEBSOCKET_URL=wss://yourdomain.com

# Correct - strong secrets
SESSION_SECRET=generated-32-character-secret

# Correct - no protocol
VITE_API_BASE_URL=yourdomain.com
```

---

## 🔄 **After Updating .env**

### **Restart Your Application:**
```bash
# If using PM2
pm2 restart all

# If running directly
pkill -f "node dist/index.js"
NODE_ENV=production node dist/index.js
```

### **Test Configuration:**
```bash
# Check if environment variables loaded
grep NODE_ENV .env
# Should show: NODE_ENV=production

# Check if app started correctly
pm2 status
# Should show: online
```

---

## 🎉 **Ready for Production!**

After following this guide:
- ✅ **Environment configured for production**
- ✅ **Security headers will work**
- ✅ **HTTPS will function properly**
- ✅ **WebSocket will connect securely**
- ✅ **Restream.io will embed correctly**

**Your app is now configured for production deployment!** 🚀
