# 🔧 Fix DNS: www CNAME + Root Domain Multiple IPs

## 📊 Current DNS Status

**Root domain (`raajugarikossu.com`):**
```
dig raajugarikossu.com +short
13.248.243.5      ← Wrong! Should be removed
76.223.105.230    ← Wrong! Should be removed
91.108.110.72     ← Correct! Should be only one
```

**www subdomain (`www.raajugarikossu.com`):**
```
dig www.raajugarikossu.com +short
raajugarikossu.com.   ← CNAME pointing to root domain (OK)
91.108.110.72          ← Correct IP
```

---

## ✅ Good News: www Subdomain is Working!

The `www` subdomain is resolving correctly to `91.108.110.72`. The CNAME record (`raajugarikossu.com.`) is fine - it just points `www` to the root domain.

**However**, we still need to fix the root domain to have ONLY `91.108.110.72`.

---

## 🔍 Root Domain Issue: Multiple IPs Still Showing

The root domain (`raajugarikossu.com`) still has multiple A records. This could be:

1. **DNS propagation delay** (takes 15-30 minutes, sometimes up to 48 hours)
2. **DNS caching** on your server
3. **Records not fully deleted** in GoDaddy (need to double-check)
4. **TTL too high** (records cached for longer)

---

## 🔧 Fix Steps

### Step 1: Verify GoDaddy DNS Configuration

**Go back to GoDaddy and verify:**

1. **Log into GoDaddy** → My Products → Domains → raajugarikossu.com → DNS

2. **For Root Domain (`@`):**
   - Check ALL A records for `@` or blank name
   - You should have ONLY ONE A record:
     - **Type**: A
     - **Name**: `@` (or blank)
     - **Value**: `91.108.110.72`
   - **If you see multiple A records:**
     - ❌ Delete any A record pointing to `13.248.243.5`
     - ❌ Delete any A record pointing to `76.223.105.230`
     - ✅ Keep only the one pointing to `91.108.110.72`

3. **For www subdomain:**
   - You have TWO options:
   
   **Option A: Keep CNAME (Current Setup - Fine)**
   - **Type**: CNAME
   - **Name**: `www`
   - **Value**: `raajugarikossu.com.`
   - This is fine! It works as shown.

   **Option B: Change to A Record (Recommended)**
   - **Type**: A
   - **Name**: `www`
   - **Value**: `91.108.110.72`
   - This is more direct and easier for SSL certificates.

**Recommendation:** Keep CNAME for www (it's working), but make sure root domain has ONLY ONE A record.

---

### Step 2: Clear DNS Cache on Server

**Clear cached DNS on your server:**

```bash
# Clear systemd-resolved cache
sudo systemd-resolve --flush-caches

# OR if that doesn't work:
sudo resolvectl flush-caches

# OR restart resolver:
sudo systemctl restart systemd-resolved

# Also clear nscd if installed:
sudo systemctl restart nscd
```

---

### Step 3: Wait for DNS Propagation

**DNS changes take time:**

- **Minimum**: 5-10 minutes
- **Typical**: 15-30 minutes
- **Maximum**: 48 hours (rare)
- **Your case**: Since you just deleted records, wait at least 15-30 minutes

**After waiting, check again:**
```bash
dig raajugarikossu.com +short
```

---

### Step 4: Check DNS from Multiple Sources

**DNS propagation happens at different times in different locations:**

```bash
# Check from Google DNS
dig raajugarikossu.com +short @8.8.8.8

# Check from Cloudflare DNS
dig raajugarikossu.com +short @1.1.1.1

# Check from your default DNS
dig raajugarikossu.com +short
```

**Or check online:**
1. Go to **https://dnschecker.org**
2. Enter: `raajugarikossu.com`
3. Click **Search**
4. See results from different global locations
5. Some locations might already show only `91.108.110.72`

---

### Step 5: Verify Root Domain is Fixed

**Once DNS propagates, you should see:**

```bash
dig raajugarikossu.com +short
91.108.110.72
```

**Only ONE IP address!** ✅

**www should still work:**
```bash
dig www.raajugarikossu.com +short
raajugarikossu.com.
91.108.110.72
```

---

### Step 6: Try Certbot Again

**Once root domain shows ONLY `91.108.110.72`:**

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

**This should work now!** ✅

---

## 🎯 Quick Action Items

### Right Now:

1. **Verify GoDaddy DNS:**
   - Go to DNS Management
   - Check root domain (`@`) has ONLY ONE A record → `91.108.110.72`
   - Delete any other A records for root domain

2. **Clear DNS cache:**
   ```bash
   sudo systemd-resolve --flush-caches
   sudo systemctl restart systemd-resolved
   ```

3. **Wait 15-30 minutes**

4. **Check DNS again:**
   ```bash
   dig raajugarikossu.com +short @8.8.8.8
   dig raajugarikossu.com +short
   ```

5. **Once it shows ONLY `91.108.110.72`, try certbot:**
   ```bash
   sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com
   ```

---

## ✅ Expected Result

**After waiting and clearing cache:**

```bash
# Root domain - should show ONLY:
dig raajugarikossu.com +short
91.108.110.72

# www subdomain - should work fine:
dig www.raajugarikossu.com +short
raajugarikossu.com.
91.108.110.72
```

---

## 🚨 If Still Not Working After 30 Minutes

**If you still see multiple IPs after 30 minutes:**

1. **Double-check GoDaddy:**
   - Make absolutely sure only ONE A record for `@` exists
   - Take a screenshot of DNS records page
   - Verify you saved changes

2. **Lower TTL:**
   - Edit A record in GoDaddy
   - Change TTL to `600` seconds (10 minutes)
   - Save changes
   - Wait another 10-15 minutes

3. **Check from multiple locations:**
   - Use https://dnschecker.org
   - See if different locations show different results
   - Some might already be updated

4. **Contact GoDaddy support** if DNS changes aren't taking effect

---

## 📋 Summary

- ✅ **www subdomain is working** (CNAME is fine)
- ❌ **Root domain has multiple IPs** (need to fix)
- 🔧 **Solution**: Delete extra A records in GoDaddy, wait for propagation
- ⏰ **Wait 15-30 minutes** after DNS changes
- 🔄 **Clear DNS cache** on server
- ✅ **Then try certbot again**

**Most likely it's just DNS propagation delay - just need to wait!** ⏰


l







