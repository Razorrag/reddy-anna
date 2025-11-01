# 🚀 GoDaddy DNS Setup Guide for raajugarikossu.com

## Your Configuration
- **Domain**: raajugarikossu.com
- **VPS IP**: 91.108.110.72
- **App Port**: 5000

---

## 📋 STEP-BY-STEP: Configure DNS in GoDaddy

### Step 1: Log into GoDaddy

1. Go to **https://www.godaddy.com**
2. Click **Sign In** (top right)
3. Enter your GoDaddy account credentials

---

### Step 2: Access DNS Management

1. After logging in, click **My Products** (top menu or dashboard)
2. Scroll down to **Domains** section
3. Find your domain: **raajugarikossu.com**
4. Click the **DNS** button (or click the **⋮** (three dots) menu → **DNS**)

---

### Step 3: Configure A Record for Root Domain

1. In the **DNS Records** section, look for existing **A records**
2. Find the A record for `@` or `raajugarikossu.com` (root domain)
3. Click the **⋮** (three dots) next to it → **Edit**
   - **OR** if it doesn't exist, click **Add** → **A**

4. **Configure the A record:**
   - **Type**: A (should already be selected)
   - **Name/Host**: `@` (or leave blank, or `raajugarikossu.com`)
     - `@` represents the root domain (raajugarikossu.com)
   - **Value/Points to**: `91.108.110.72` (your VPS IP)
   - **TTL**: `600` seconds (or default, 3600 is fine)
   
5. Click **Save**

---

### Step 4: Configure A Record for WWW Subdomain (Optional but Recommended)

1. Look for existing **A record** for `www`
2. Click the **⋮** (three dots) → **Edit**
   - **OR** click **Add** → **A**

3. **Configure the A record:**
   - **Type**: A
   - **Name/Host**: `www`
   - **Value/Points to**: `91.108.110.72` (same VPS IP)
   - **TTL**: `600` seconds (or default)

4. Click **Save**

---

### Step 5: Remove/Update Conflicting Records (Important!)

1. **Check for CNAME records** that might conflict:
   - Look for any **CNAME** records pointing to `@` or `www`
   - **CNAME** records CANNOT coexist with **A** records for the same name
   - If you see CNAME for `@` or `www`, **delete it** or change it

2. **Check for other A records**:
   - Make sure there are no other A records pointing to different IPs
   - Update or remove any conflicting records

---

## ✅ Step 6: Verify DNS Configuration

### Wait 5-10 Minutes

**DNS changes can take 5-10 minutes to propagate** (sometimes up to 48 hours, but usually much faster)

### Verify DNS is Working

Run these commands on your server or locally:

```bash
# Check if DNS points to your VPS IP
dig raajugarikossu.com +short

# Should return: 91.108.110.72

# Check www subdomain too
dig www.raajugarikossu.com +short

# Should also return: 91.108.110.72
```

**OR** use online tools:
- Go to **https://dnschecker.org**
- Enter: `raajugarikossu.com`
- Check if it shows: `91.108.110.72`

**Keep checking until you see `91.108.110.72`**

---

## 🔍 What Your DNS Records Should Look Like

### In GoDaddy DNS Manager, you should have:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 91.108.110.72 | 600 |
| A | www | 91.108.110.72 | 600 |

### You might also have (these are fine to keep):
- **NS** records (name servers) - Don't change these
- **SOA** record - Don't change this
- **MX** records (for email) - Keep if you need email
- **TXT** records (for verification/SPF) - Keep if needed

---

## 🚨 Common Issues & Solutions

### Issue 1: "I can't find the DNS button"

**Solution:**
- Go to **My Products** → **Domains**
- Click **Manage** next to your domain
- Look for **DNS** in the left sidebar or top menu

### Issue 2: "I see multiple A records"

**Solution:**
- You should only have **ONE** A record for `@` pointing to `91.108.110.72`
- Delete or edit any other A records pointing to different IPs
- Keep only the one pointing to your VPS: `91.108.110.72`

### Issue 3: "DNS still not working after 10 minutes"

**Solution:**
- DNS propagation can take longer
- Clear your browser cache: `Ctrl+Shift+Delete` → Clear cache
- Try accessing via IP: `http://91.108.110.72:5000` (should work immediately)
- Check DNS from multiple locations: https://dnschecker.org
- Wait up to 48 hours (but usually works within 1 hour)

### Issue 4: "I see CNAME records"

**Solution:**
- **CNAME** and **A** records cannot coexist for the same name
- If you have CNAME for `@`, delete it and use A record instead
- If you have CNAME for `www`, you can keep it OR change to A record

### Issue 5: "GoDaddy says 'Invalid IP address'"

**Solution:**
- Make sure you entered: `91.108.110.72` (no spaces, no typos)
- Don't include `http://` or `https://`
- Just the IP address: `91.108.110.72`

---

## 🎯 After DNS is Configured

Once DNS is pointing to `91.108.110.72`, continue with the **SSL Certificate Setup**:

### Continue with SSL Setup (from DOMAIN_SETUP_CLEAN_START.md):

1. **Install Certbot** (on your VPS):
   ```bash
   sudo apt update
   sudo apt install certbot -y
   ```

2. **Stop services using port 80**:
   ```bash
   sudo systemctl stop nginx
   sudo systemctl stop apache2
   pm2 stop andar-bahar
   ```

3. **Get SSL Certificate**:
   ```bash
   sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com
   ```

4. **Copy certificates** to your app directory:
   ```bash
   cd /path/to/your/andar-bahar/app
   sudo cp /etc/letsencrypt/live/raajugarikossu.com/privkey.pem ./server.key
   sudo cp /etc/letsencrypt/live/raajugarikossu.com/fullchain.pem ./server.crt
   sudo chown $USER:$USER server.key server.crt
   chmod 600 server.key
   chmod 644 server.crt
   ```

5. **Update .env file**:
   ```
   PORT=5000
   HTTPS_ENABLED=true
   SSL_KEY_PATH=./server.key
   SSL_CERT_PATH=./server.crt
   ```

6. **Restart your app**:
   ```bash
   pm2 restart andar-bahar
   ```

---

## 📱 Quick Verification Checklist

- [ ] Logged into GoDaddy
- [ ] Opened DNS Management for raajugarikossu.com
- [ ] A record for `@` points to `91.108.110.72`
- [ ] A record for `www` points to `91.108.110.72`
- [ ] Removed conflicting CNAME records
- [ ] Saved all changes
- [ ] Waited 5-10 minutes
- [ ] Verified DNS: `dig raajugarikossu.com +short` = `91.108.110.72`
- [ ] Can access app via IP: `http://91.108.110.72:5000`

---

## 🎉 Success!

Once DNS is configured and verified, your domain will route to:
- **http://raajugarikossu.com:5000**
- **https://raajugarikossu.com:5000** (after SSL setup)

**Your GoDaddy domain is now routing to your VPS!**

---

## 📞 Need Help?

If you're stuck:
1. Screenshot your GoDaddy DNS records page
2. Share the output of: `dig raajugarikossu.com +short`
3. Check if you can access via IP: `http://91.108.110.72:5000`










