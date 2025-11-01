# 🔍 Verify DNS Fix - Multiple IPs Still Showing

## ⚠️ Current Problem

Even after deleting extra A records in GoDaddy, you're still seeing:
```
dig raajugarikossu.com +short
13.248.243.5
76.223.105.230
91.108.110.72
```

**This could be:**
1. **DNS propagation delay** (most common - takes time)
2. **DNS caching** (your server is using cached DNS)
3. **Records not fully deleted** (check GoDaddy again)
4. **TTL too high** (records cached for longer)

---

## 🔍 Step 1: Double-Check GoDaddy DNS

### Verify in GoDaddy:

1. **Log into GoDaddy**
2. **Go to DNS Management** for raajugarikossu.com
3. **Look at ALL A records** - take a screenshot or count them

**You should see ONLY:**
- ONE A record for `@` → `91.108.110.72`
- ONE A record for `www` → `91.108.110.72`

**If you see more:**
- ❌ Delete any A record pointing to `13.248.243.5`
- ❌ Delete any A record pointing to `76.223.105.230`
- ✅ Keep only the ones pointing to `91.108.110.72`

**Check:**
- Are there multiple A records with the same name (`@`)?
- Did you save the changes after deleting?
- Did you refresh the DNS page in GoDaddy?

---

## ⏰ Step 2: Wait for DNS Propagation

**DNS changes take time to propagate globally:**

- **Minimum**: 5-10 minutes
- **Typical**: 15-30 minutes
- **Maximum**: 48 hours (rare)
- **Your TTL**: Check what TTL you set (lower TTL = faster propagation)

**If you just deleted records:**
- Wait at least **15-30 minutes**
- Check again periodically

---

## 🔄 Step 3: Clear DNS Cache on Server

**Clear cached DNS on your server:**

```bash
# Clear systemd-resolved cache (most common on Ubuntu/Debian)
sudo systemd-resolve --flush-caches

# OR if systemd-resolve doesn't exist:
sudo resolvectl flush-caches

# OR try restarting resolver:
sudo systemctl restart systemd-resolved

# Clear nscd cache (if installed):
sudo systemctl restart nscd

# Clear dnsmasq cache (if installed):
sudo systemctl restart dnsmasq
```

**Then check again:**
```bash
dig raajugarikossu.com +short
```

---

## 🌐 Step 4: Check DNS from Different Locations

**DNS propagation happens at different times in different locations.**

### Check from your server:
```bash
dig raajugarikossu.com +short @8.8.8.8
# Should show ONLY: 91.108.110.72 (eventually)
```

### Check from different DNS servers:
```bash
# Google DNS
dig raajugarikossu.com +short @8.8.8.8

# Cloudflare DNS
dig raajugarikossu.com +short @1.1.1.1

# Your default DNS
dig raajugarikossu.com +short
```

### Check online:
1. Go to **https://dnschecker.org**
2. Enter: `raajugarikossu.com`
3. Click **Search**
4. Check results from different locations - some might already show only `91.108.110.72`

---

## 🔧 Step 5: Lower TTL (If Needed)

**If DNS is taking too long, you can lower TTL in GoDaddy:**

1. **Edit A record** in GoDaddy
2. **Change TTL** to `600` seconds (10 minutes) or `300` seconds (5 minutes)
3. **Save** changes
4. **Wait 5-10 minutes** for lower TTL to take effect
5. **Check again**

**Lower TTL = Faster propagation for future changes**

---

## 🕐 Step 6: Wait and Retry

**If you've confirmed DNS is correct in GoDaddy:**

1. **Wait 15-30 minutes** from when you made the change
2. **Clear DNS cache** on server (Step 3)
3. **Check DNS again**:
   ```bash
   dig raajugarikossu.com +short
   ```

4. **If still showing multiple IPs:**
   - Wait another 15-30 minutes
   - Check from different DNS servers (Step 4)
   - Check online (dnschecker.org)

5. **Once DNS shows ONLY `91.108.110.72`:**
   ```bash
   dig raajugarikossu.com +short
   # Should return ONLY: 91.108.110.72
   ```
   
   **Then try certbot again:**
   ```bash
   sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com
   ```

---

## 🚨 Alternative: Use DNS Challenge Instead

**If DNS propagation is taking too long, you can use DNS challenge method:**

This method verifies via DNS instead of HTTP (port 80), so it doesn't care about multiple IPs.

**However, this requires:**
- GoDaddy API credentials
- Or manual DNS TXT record creation

**For now, let's wait for DNS propagation first** (it's simpler).

---

## ✅ Quick Checklist

- [ ] **Double-checked GoDaddy** - Only ONE A record for `@` pointing to `91.108.110.72`
- [ ] **Double-checked GoDaddy** - Only ONE A record for `www` pointing to `91.108.110.72`
- [ ] **Saved changes** in GoDaddy
- [ ] **Waited 15-30 minutes** since DNS change
- [ ] **Cleared DNS cache** on server
- [ ] **Checked DNS from multiple sources** (8.8.8.8, 1.1.1.1, dnschecker.org)
- [ ] **DNS shows ONLY `91.108.110.72`** from most sources
- [ ] **Tried certbot again** - should work now!

---

## 🎯 Expected Result

**After waiting and clearing cache, you should see:**

```bash
dig raajugarikossu.com +short
91.108.110.72
```

**Only ONE IP address!** ✅

---

## ⚡ Quick Commands to Run Now

```bash
# 1. Clear DNS cache
sudo systemd-resolve --flush-caches
# OR
sudo resolvectl flush-caches
# OR
sudo systemctl restart systemd-resolved

# 2. Check DNS from different sources
dig raajugarikossu.com +short @8.8.8.8
dig raajugarikossu.com +short @1.1.1.1
dig raajugarikossu.com +short

# 3. Wait 15-30 minutes, then check again
dig raajugarikossu.com +short

# 4. Once it shows ONLY 91.108.110.72, try certbot:
sudo certbot certonly --standalone -d raajugarikossu.com -d www.raajugarikossu.com
```

---

## 📞 Next Steps

1. **Verify GoDaddy DNS** - Make absolutely sure only `91.108.110.72` exists
2. **Clear DNS cache** on server
3. **Wait 15-30 minutes**
4. **Check DNS again** from multiple sources
5. **Once fixed, try certbot again**

**DNS propagation is the most likely issue - just need to wait!** ⏰










