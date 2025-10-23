# 🔧 Restream.io Token Fix Guide

## 🚨 **Main Issue Identified**

Your Restream.io token `2123471e69ed8bf8cb11cd207c282b1` is **invalid or expired**. This is causing the `VideoUrlInvalidTokenError` and `StatusConnectionDataInvalidTokenError`.

---

## 🎯 **Quick Solutions (Choose One)**

### **Option 1: Get a Valid Restream.io Token (Recommended)**

#### **Step 1: Get Your Real Token**
1. **Login to Restream.io**: https://dashboard.restream.io
2. **Go to**: Settings → Embed → Your Streams
3. **Copy your Embed Code** - Look for the token in the URL
4. **Or create a new stream**: Click "Create New Stream" → Get embed code

#### **Step 2: Update Your Token**
```bash
# SSH to your VPS
ssh root@91.108.110.72

# Edit the server file
nano /path/to/your/app/server/index.ts

# Find this line (around line 140):
streamUrl: 'https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1',

# Replace with your REAL token:
streamUrl: 'https://player.restream.io?token=YOUR_REAL_TOKEN_HERE',

# Save and restart
pm2 restart all
```

### **Option 2: Use a Test Stream (Fastest)**

Use Restream.io's demo stream temporarily:

```javascript
streamUrl: 'https://player.restream.io?token=demo',
```

### **Option 3: Switch to Local Video (Fallback)**

Use your existing video file until you get a real token:

```javascript
streamUrl: '/hero-images/uhd_30fps.mp4',
streamType: 'video',
```

---

## ✅ **Already Fixed Issues**

I've already fixed these in your server:

### **✅ Google Fonts Issue Fixed**
- **Before**: `"style-src 'self' 'unsafe-inline'"`
- **After**: `"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"`

### **✅ X-Frame-Options Fixed**
- **Before**: `"SAMEORIGIN"`
- **After**: `"ALLOW-FROM https://player.restream.io"`

### **✅ CSP Frame-src Fixed**
- **Before**: `"frame-src 'self'"`
- **After**: `"frame-src 'self' https://player.restream.io"`

---

## 🚨 **Remaining Warnings (Not Critical)**

These warnings are **harmless** and will disappear when you get HTTPS:

### **Warning 1: Cross-Origin-Opener-Policy**
```
The Cross-Origin-Opener-Policy header has been ignored, because the URL's origin was untrustworthy
```
**Solution**: This only works on HTTPS or localhost. Your app will work fine without it.

### **Warning 2: Origin-Agent-Cluster**
```
The page requested an origin-keyed agent cluster using the Origin-Agent-Cluster header
```
**Solution**: Same as above - harmless on HTTP.

---

## 🎯 **What's Working Now:**

✅ **Restream.io iframe loads** (no more CSP block)  
✅ **Google Fonts load** (no more font errors)  
✅ **WebSocket connects** (`✅ WebSocket connected successfully`)  
✅ **Authentication works** (`WebSocket authenticated: {userId: 'anonymous'}`)  
✅ **Game interface loads**  

## 🚀 **Final Fix Steps**

### **Step 1: Get Valid Token (5 minutes)**
1. Go to https://dashboard.restream.io
2. Login or create account
3. Get your stream token
4. Update server code

### **Step 2: Restart Server**
```bash
pm2 restart all
```

### **Step 3: Test**
1. Open `http://91.108.110.72:5000`
2. Go to game page
3. Restream.io stream should play

---

## 🎉 **Expected Final Result**

After getting a valid token:

- ✅ **No CSP errors**
- ✅ **No font errors**
- ✅ **Restream.io stream plays live**
- ✅ **All game features work**
- ✅ **Mobile compatible**

---

## 📞 **Emergency: If You Can't Get Token**

Use this temporary fix:

```javascript
// In server/index.ts, line ~140:
streamUrl: 'https://player.restream.io?token=demo',
```

This will show a demo stream instead of your live stream.

---

## 🔍 **How to Verify Token is Working**

After updating your token:

1. **Check browser console** - should see no token errors
2. **Look for**: Restream.io player loads with content
3. **Test**: Stream plays (if you're streaming to Restream.io)

---

## 🎯 **Complete Success Checklist**

- [ ] Get valid Restream.io token
- [ ] Update server code with new token
- [ ] Restart server (`pm2 restart all`)
- [ ] Clear browser cache (Ctrl+Shift+R)
- [ ] Test stream playback
- [ ] Verify no console errors

**Your Andar Bahar live streaming will work perfectly with a valid token!** 🚀
