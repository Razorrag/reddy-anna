# 🧪 Production Testing & Troubleshooting Checklist

## 🎯 **Complete Testing Guide**

Follow this checklist to verify your production deployment is working perfectly.

---

## 📋 **Phase 1: SSL & HTTPS Testing**

### **✅ SSL Certificate Verification:**
```bash
# Check SSL certificate status
certbot certificates

# Test SSL connection
openssl s_client -connect yourdomain.com:443

# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -text -noout | grep "Not After"
```

### **✅ Browser SSL Test:**
1. **Open**: `https://yourdomain.com`
2. **Check**: Padlock icon is green/secure
3. **Click**: Padlock → "Connection is secure"
4. **Verify**: Certificate is valid for your domain

### **❌ SSL Issues & Fixes:**
- **Error**: "Your connection is not private"
  - **Fix**: SSL certificate not installed correctly
  - **Solution**: Re-run `certbot --nginx -d yourdomain.com`

- **Error**: "ERR_SSL_PROTOCOL_ERROR"
  - **Fix**: Nginx SSL configuration issue
  - **Solution**: Check Nginx config with `nginx -t`

---

## 📋 **Phase 2: Security Headers Testing**

### **✅ CSP Headers Test:**
```bash
# Check Content Security Policy header
curl -I https://yourdomain.com | grep -i "content-security-policy"

# Should return something like:
# Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; frame-src 'self' https://player.restream.io; connect-src 'self' wss://yourdomain.com https://player.restream.io; media-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self';
```

### **✅ Security Headers Test:**
```bash
# Check all security headers
curl -I https://yourdomain.com

# Look for these headers:
# X-Frame-Options: ALLOW-FROM https://player.restream.io
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Cross-Origin-Opener-Policy: same-origin
```

### **❌ CSP Issues & Fixes:**
- **Error**: `Refused to load the stylesheet 'https://fonts.googleapis.com'`
  - **Fix**: CSP doesn't allow Google Fonts
  - **Solution**: Add `https://fonts.googleapis.com` to `style-src`

- **Error**: `Refused to frame 'https://player.restream.io'`
  - **Fix**: CSP doesn't allow Restream.io iframe
  - **Solution**: Add `https://player.restream.io` to `frame-src`

---

## 📋 **Phase 3: Application Functionality Testing**

### **✅ Basic Page Load Test:**
1. **Open**: `https://yourdomain.com`
2. **Check**: Page loads completely
3. **Verify**: No 404 errors
4. **Test**: All navigation works

### **✅ Console Errors Check:**
1. **Open**: Developer Tools (F12)
2. **Go**: Console tab
3. **Look**: Red error messages
4. **Should see**: ✅ WebSocket connected successfully

### **✅ Google Fonts Test:**
1. **Check**: Poppins font is loading
2. **Verify**: Text styling looks correct
3. **Test**: Different font weights work

### **✅ Restream.io Iframe Test:**
1. **Navigate**: To game page
2. **Check**: Restream.io iframe loads
3. **Verify**: No iframe blocking errors
4. **Test**: Stream plays if live

### **❌ Application Issues & Fixes:**
- **Error**: Page loads but styling is wrong
  - **Fix**: Google Fonts blocked by CSP
  - **Solution**: Update CSP to allow fonts.googleapis.com

- **Error**: Restream.io iframe is blank
  - **Fix**: CSP or X-Frame-Options blocking iframe
  - **Solution**: Update CSP and headers to allow player.restream.io

---

## 📋 **Phase 4: WebSocket Testing**

### **✅ WebSocket Connection Test:**
1. **Open**: Browser console (F12)
2. **Look for**: `🔌 Connecting to WebSocket: wss://yourdomain.com/ws`
3. **Verify**: `✅ WebSocket connected successfully to: wss://yourdomain.com/ws`
4. **Check**: No WebSocket errors

### **✅ WebSocket Security Test:**
```bash
# Test WebSocket connection
wscat -c wss://yourdomain.com/ws

# Should connect successfully (may get auth error, that's normal)
```

### **❌ WebSocket Issues & Fixes:**
- **Error**: `WebSocket connection failed`
  - **Fix**: WebSocket not proxied correctly
  - **Solution**: Check Nginx `/ws` location block

- **Error**: `wss:// connection refused`
  - **Fix**: SSL not working for WebSocket
  - **Solution**: Ensure SSL certificate covers WebSocket domain

---

## 📋 **Phase 5: API Testing**

### **✅ API Endpoints Test:**
```bash
# Test API is responding
curl https://yourdomain.com/api/health

# Test CORS headers
curl -H "Origin: https://yourdomain.com" -H "Access-Control-Request-Method: GET" -X OPTIONS https://yourdomain.com/api/some-endpoint
```

### **✅ Authentication Test:**
1. **Try**: Login functionality
2. **Check**: Session management works
3. **Verify**: No authentication errors

### **❌ API Issues & Fixes:**
- **Error**: CORS errors in console
  - **Fix**: CORS_ORIGIN not set correctly
  - **Solution**: Update .env with correct domain

- **Error**: API returns 404
  - **Fix**: Nginx proxy not working
  - **Solution**: Check proxy_pass configuration

---

## 📋 **Phase 6: Performance & Security Testing**

### **✅ Performance Test:**
1. **Check**: Page load speed
2. **Test**: Lighthouse score (Chrome DevTools)
3. **Verify**: No slow-loading resources

### **✅ Security Test:**
1. **Check**: No mixed content warnings
2. **Verify**: All resources load over HTTPS
3. **Test**: Security headers are present

### **❌ Performance Issues & Fixes:**
- **Error**: Slow page load
  - **Fix**: Large static files not cached
  - **Solution**: Add static file caching in Nginx

---

## 📋 **Phase 7: Mobile Testing**

### **✅ Mobile Responsiveness:**
1. **Test**: On mobile phone
2. **Check**: Responsive design works
3. **Verify**: Touch interactions work
4. **Test**: Stream plays on mobile

### **❌ Mobile Issues & Fixes:**
- **Error**: Stream doesn't play on mobile
  - **Fix**: Mobile browser restrictions
  - **Solution**: Ensure stream is mobile-compatible

---

## 🚨 **Troubleshooting Quick Reference**

### **🔥 Critical Issues (Fix First):**

#### **1. SSL Not Working:**
```bash
# Check SSL status
systemctl status certbot
certbot certificates

# Reinstall SSL if needed
certbot delete --cert-name yourdomain.com
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### **2. Nginx Configuration Errors:**
```bash
# Test Nginx config
nginx -t

# Check Nginx logs
tail -f /var/log/nginx/error.log

# Restart Nginx
systemctl restart nginx
```

#### **3. Application Not Starting:**
```bash
# Check if app is running
pm2 status

# Check app logs
pm2 logs andar-bahar

# Restart app
pm2 restart andar-bahar
```

### **⚠️ Common Issues:**

#### **1. CSP Blocking Resources:**
- **Symptom**: Fonts not loading, iframe blocked
- **Fix**: Update CSP in Nginx config
- **Command**: Edit `/etc/nginx/sites-available/yourdomain.com`

#### **2. WebSocket Connection Issues:**
- **Symptom**: Real-time features not working
- **Fix**: Check WebSocket proxy in Nginx
- **Command**: Verify `/ws` location block

#### **3. CORS Errors:**
- **Symptom**: API calls blocked
- **Fix**: Update CORS_ORIGIN in .env
- **Command**: Edit `.env` file

---

## 📊 **Success Criteria Checklist**

### **✅ Must Have (Critical):**
- [ ] HTTPS works with valid SSL certificate
- [ ] No browser console errors
- [ ] Google Fonts load properly
- [ ] Restream.io iframe loads and plays
- [ ] WebSocket connects over WSS
- [ ] All pages load without errors
- [ ] No mixed content warnings

### **✅ Should Have (Important):**
- [ ] Mobile responsive design works
- [ ] Page load speed is good (<3 seconds)
- [ ] All security headers present
- [ ] API endpoints respond correctly
- [ ] Authentication works
- [ ] No 404 errors on navigation

### **✅ Nice to Have (Bonus):**
- [ ] Lighthouse score >90
- [ ] Static file caching enabled
- [ ] Compression enabled
- [ ] Monitoring set up

---

## 🎯 **Final Verification Test**

### **Complete User Flow Test:**
1. **Open**: `https://yourdomain.com`
2. **Login**: With test account
3. **Navigate**: To game page
4. **Verify**: Restream.io stream plays
5. **Check**: Real-time updates work
6. **Test**: Mobile compatibility
7. **Confirm**: No errors anywhere

### **If Everything Works:**
🎉 **Congratulations! Your production deployment is complete!**

### **If Issues Remain:**
🔧 **Reference the troubleshooting section above**
📞 **Each issue has specific fixes documented**

---

## 📞 **Emergency Commands**

### **Quick Restart Everything:**
```bash
# Restart all services
systemctl restart nginx
pm2 restart all
systemctl restart certbot
```

### **Check All Logs:**
```bash
# Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# App logs
pm2 logs

# System logs
journalctl -u nginx -f
```

### **Quick Health Check:**
```bash
# Check if everything is running
systemctl status nginx
pm2 status
certbot certificates
curl -I https://yourdomain.com
```

---

## 🚀 **You're Ready!**

After completing this checklist:
- ✅ **Your app is production-ready**
- ✅ **All security issues are fixed**
- ✅ **Restream.io streaming works perfectly**
- ✅ **Users can access your app securely**

**Your Andar Bahar live streaming app is now live in production!** 🎉
