# 🚨 FIX DNS: Multiple IPs Problem

## ❌ Problem Identified

Your DNS has **multiple IP addresses**, and Let's Encrypt is checking the wrong one!

**Error from certbot:**
```
Detail: 13.248.243.5: Invalid response from https://raajugarikossu.com/.well-known/acme-challenge/...
```

**DNS output shows:**
```
dig raajugarikossu.com +short
76.223.105.230      ← Wrong IP (remove this!)
13.248.243.5       ← Wrong IP (remove this!)
91.108.110.72      ← Correct IP (keep this!)
```

**Solution:** Remove ALL extra A records in GoDaddy. Keep ONLY `91.108.110.72`!

---

## 🔧 FIX STEPS: Clean Up DNS in GoDaddy

### Step 1: Log into GoDaddy

1. Go to **https://www.godaddy.com**
2. Click **Sign In** (top right)
3. Enter your GoDaddy account credentials

---

### Step 2: Access DNS Management

1. Click **My Products** (top menu)
2. Scroll to **Domains** section
3. Find your domain: **raajugarikossu.com**
4. Click **DNS** button (or ⋮ menu → **DNS**)

---

### Step 3: Find ALL A Records

Look for **ALL** A records in your DNS Records section. You probably have:

| Type | Name | Value | Action |
|------|------|-------|--------|
| A | @ | 76.223.105.230 | ❌ **DELETE THIS** |
| A | @ | 13.248.243.5 | ❌ **DELETE THIS** |
| A | @ | 91.108.110.72 | ✅ **KEEP THIS** (or create if missing) |

**OR** you might have:
- Multiple A records with the same name but different IPs
- Old A records pointing to different services
- Default GoDaddy A records that need to be changed

---

### Step 4: Delete ALL Wrong A Records

1. For **EACH** A record that points to an IP other than `91.108.110.72`:
   - Click the **⋮** (three dots) next to it
   - Click **Delete**
   - Confirm deletion

2. **Delete these specific IPs:**
   - ❌ Delete A record pointing to `76.223.105.230`
   - ❌ Delete A record pointing to `13.248.243.5`
   - ❌ Delete ANY A record NOT pointing to `91.108.110.72`

---

### Step 5: Keep/Update Correct A Record

**For `@` (root domain):**
1. Find the A record pointing to `91.108.110.72`
   - If it exists: Click **⋮** → **Edit** → Verify IP is `91.108.110.72` → **Save**
   - If it doesn't exist: Click **Add** → **A** → Create it:
     - **Type**: A
     - **Name**: `@` (or leave blank)
     - **Value**: `91.108.110.72`
     - **TTL**: 600 (or default)
     - **Save**

**For `www` subdomain:**
1. Find/create A record for `www`:
   - **Type**: A
   - **Name**: `www`
   - **Value**: `91.108.110.72`
   - **TTL**: 600 (or default)
   - **Save**

---

### Step 6: Verify DNS Records

**Your DNS should look like this:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 91.108.110.72 | 600 |
| A | www | 91.108.110.72 | 600 |

**That's it! Only TWO A records, both pointing to `91.108.110.72`.**

---

### Step 7: Wait for DNS Propagation

**DNS changes take 5-30 minutes to propagate**

Wait 5-10 minutes, then verify on your server:

```bash
# Check DNS - should ONLY show 91.108.110.72
dig raajugarikossu.com +short

# Expected output (should be ONLY this):
91.108.110.72

# Check www too
dig www.raajugarikossu.com +short

# Expected output:
91.108.110.72
```

**If you still see multiple IPs:**
- Wait another 10-15 minutes
- Clear DNS cache on your server: `sudo systemd-resolve --flush-caches` (or restart)
- Check from multiple locations: https://dnschecker.org

---

### Step 8: Try Certbot Again

**After DNS shows ONLY `91.108.110.72`:**

```bash
# Make sure port 80 is free
sudo lsof -i :80
# Should be empty

# Make sure services are stopped
sudo systemctl stop nginx
pm2 stop andar-bahar

# Get certificate
sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com
```

**This time it should work!** ✅

---

## 🎯 Quick Checklist

- [ ] Logged into GoDaddy
- [ ] Opened DNS Management for raajugarikossu.com
- [ ] Found ALL A records
- [ ] Deleted A record pointing to `76.223.105.230`
- [ ] Deleted A record pointing to `13.248.243.5`
- [ ] Kept/created A record for `@` pointing to `91.108.110.72`
- [ ] Kept/created A record for `www` pointing to `91.108.110.72`
- [ ] Waited 5-10 minutes
- [ ] Verified DNS: `dig raajugarikossu.com +short` shows ONLY `91.108.110.72`
- [ ] Ran certbot again successfully

---

## 🔍 How to Verify DNS is Fixed

### Method 1: Check from Server
```bash
dig raajugarikossu.com +short
# Should return ONLY: 91.108.110.72

dig www.raajugarikossu.com +short
# Should return ONLY: 91.108.110.72
```

### Method 2: Check from Browser
1. Go to https://dnschecker.org
2. Enter: `raajugarikossu.com`
3. Click **Search**
4. Check results - should show `91.108.110.72` in all/most locations

### Method 3: Check with nslookup
```bash
nslookup raajugarikossu.com
# Should show Address: 91.108.110.72
```

---

## 🚨 Common Mistakes to Avoid

1. **Don't keep multiple A records for the same name** - Only keep ONE pointing to `91.108.110.72`
2. **Don't confuse CNAME with A records** - Use A records for root domain (`@`)
3. **Don't forget the `www` subdomain** - Create A record for `www` too
4. **Don't rush** - Wait 10-15 minutes after DNS changes before testing

---

## ✅ After DNS is Fixed

Once DNS shows **ONLY** `91.108.110.72`:

1. **Get SSL Certificate:**
   ```bash
   sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com
   ```

2. **Copy certificates:**
   ```bash
   cd ~/reddy-anna
   sudo cp /etc/letsencrypt/live/raajugarikossu.com/privkey.pem ./server.key
   sudo cp /etc/letsencrypt/live/raajugarikossu.com/fullchain.pem ./server.crt
   sudo chown $USER:$USER server.key server.crt
   chmod 600 server.key
   chmod 644 server.crt
   ```

3. **Update .env:**
   ```
   PORT=5000
   HTTPS_ENABLED=true
   SSL_KEY_PATH=./server.key
   SSL_CERT_PATH=./server.crt
   ```

4. **Restart app:**
   ```bash
   pm2 restart andar-bahar --update-env
   ```

---

## 🎉 Success!

After fixing DNS and running certbot again, you should see:

```
Congratulations! Your certificate and chain have been saved at:
   /etc/letsencrypt/live/raajugarikossu.com/fullchain.pem
   /etc/letsencrypt/live/raajugarikossu.com/privkey.pem
```

**Your SSL certificate will be ready!** 🔒










