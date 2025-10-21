# Render Environment Variables Setup Guide

This guide lists all the environment variables you need to set in Render for your Reddy Anna Andar Bahar application.

## 🚀 Critical Environment Variables (Must Set)

### 1. Application Configuration
```
NODE_ENV=production
PORT=10000
```

### 2. CORS Configuration
```
CORS_ORIGIN=https://your-app-name.onrender.com
```
**Note**: Replace `your-app-name` with your actual Render service name.

### 3. Session Security
```
SESSION_SECRET=your-very-secure-session-secret-at-least-32-characters-long
```
**Important**: Generate a unique, strong secret for production!

### 4. JWT Authentication
```
JWT_SECRET=your-very-secure-jwt-secret-key-at-least-32-characters-long-for-production
JWT_EXPIRES_IN=1h
JWT_ISSUER=AndarBaharApp
JWT_AUDIENCE=users
```

### 5. Supabase Configuration
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 6. RTMP Server Configuration
```
RTMP_SERVER_PORT=1935
RTMP_HTTP_PORT=8000
RTMP_APP_NAME=live
```

### 7. Client Configuration
```
VITE_API_BASE_URL=/api
VITE_WEBSOCKET_URL=wss://your-app-name.onrender.com/ws
```
**Note**: Use `wss://` for secure WebSocket in production.

## 🔧 Optional Environment Variables

### Database (if using external PostgreSQL)
```
DATABASE_URL=postgresql://username:password@host:port/database
```

## 📋 Step-by-Step Render Setup

### 1. Go to your Render Dashboard
- Navigate to your service
- Click on "Environment" tab

### 2. Add Environment Variables
Add each of the variables above in the following format:

**Critical Variables to Add First:**
1. `NODE_ENV` = `production`
2. `PORT` = `10000` (Render's default)
3. `CORS_ORIGIN` = `https://your-app-name.onrender.com`
4. `SESSION_SECRET` = `[generate strong secret]`
5. `JWT_SECRET` = `[generate strong jwt secret]`

### 3. Supabase Setup
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the following:
   - Project URL (for SUPABASE_URL and VITE_SUPABASE_URL)
   - Service Role Key (for SUPABASE_SERVICE_KEY)
   - Anonymous Key (for VITE_SUPABASE_ANON_KEY)

### 4. Generate Secure Secrets
Use these commands to generate secure secrets:

```bash
# Generate Session Secret
openssl rand -base64 32

# Generate JWT Secret
openssl rand -base64 64
```

## ⚠️ Important Notes

### Security
- **NEVER** commit secrets to git
- Use different secrets for development and production
- Make secrets at least 32 characters long
- Use a combination of letters, numbers, and symbols

### CORS Configuration
- Make sure `CORS_ORIGIN` matches your exact Render URL
- Include the protocol (`https://`)
- Don't include trailing slash

### WebSocket Configuration
- Use `wss://` (secure) for production WebSocket URLs
- Use `ws://` only for development

### Supabase Keys
- Use **Service Role Key** for server-side operations
- Use **Anonymous Key** for client-side operations
- **NEVER** expose Service Role Key on the client side

## 🧪 Testing Your Setup

After setting up environment variables:

1. **Redeploy your service** in Render
2. **Check the logs** for any startup errors
3. **Test the application** by visiting your URL
4. **Verify CORS** by checking browser console for errors
5. **Test WebSocket** connection in the game

## 🚨 Common Issues & Solutions

### Issue: "Not allowed by CORS" error
**Solution**: Check that `CORS_ORIGIN` exactly matches your Render URL

### Issue: "Missing required environment variables"
**Solution**: Ensure all critical variables are set in Render dashboard

### Issue: WebSocket connection fails
**Solution**: Verify `VITE_WEBSOCKET_URL` uses `wss://` and correct domain

### Issue: Authentication fails
**Solution**: Check that `JWT_SECRET` and `SESSION_SECRET` are set correctly

## 📝 Environment Variable Checklist

Copy and paste this checklist to track your setup:

```
[ ] NODE_ENV=production
[ ] PORT=10000
[ ] CORS_ORIGIN=https://your-app-name.onrender.com
[ ] SESSION_SECRET=[generated-secret]
[ ] JWT_SECRET=[generated-jwt-secret]
[ ] JWT_EXPIRES_IN=1h
[ ] JWT_ISSUER=AndarBaharApp
[ ] JWT_AUDIENCE=users
[ ] SUPABASE_URL=https://your-project-id.supabase.co
[ ] SUPABASE_SERVICE_KEY=[service-key]
[ ] VITE_SUPABASE_URL=https://your-project-id.supabase.co
[ ] VITE_SUPABASE_ANON_KEY=[anon-key]
[ ] RTMP_SERVER_PORT=1935
[ ] RTMP_HTTP_PORT=8000
[ ] RTMP_APP_NAME=live
[ ] VITE_API_BASE_URL=/api
[ ] VITE_WEBSOCKET_URL=wss://your-app-name.onrender.com/ws
```

## 🔗 Helpful Links

- [Render Environment Variables Docs](https://render.com/docs/environment-variables)
- [Supabase API Keys](https://supabase.com/docs/guides/api/api-keys)
- [Generate Secure Secrets](https://www.random.org/strings/)

---

**After setting up all environment variables, redeploy your service and the application should work correctly without CORS or configuration errors!**
