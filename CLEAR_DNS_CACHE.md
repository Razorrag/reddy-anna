# 🔄 Clear DNS Cache - Alternative Methods

## ❌ Problem

```
sudo systemd-resolve --flush-caches
sudo: systemd-resolve: command not found
```

**The `systemd-resolve` command doesn't exist on this system.**

---

## ✅ Alternative Methods to Clear DNS Cache

### Method 1: Try `resolvectl` (Newer systemd versions)

```bash
# Clear DNS cache with resolvectl
sudo resolvectl flush-caches

# OR
sudo systemctl restart systemd-resolved
```

---

### Method 2: Restart systemd-resolved Service

```bash
# Restart the DNS resolver service
sudo systemctl restart systemd-resolved

# Check if it's running
sudo systemctl status systemd-resolved
```

---

### Method 3: Check Which DNS Resolver is Running

```bash
# Check what DNS resolver services are running
sudo systemctl status systemd-resolved
sudo systemctl status nscd
sudo systemctl status dnsmasq

# Restart whichever is running
sudo systemctl restart systemd-resolved
sudo systemctl restart nscd
sudo systemctl restart dnsmasq
```

---

### Method 4: Check DNS Configuration

```bash
# Check what DNS servers are being used
cat /etc/resolv.conf

# Check DNS resolver status
resolvectl status
# OR
systemd-resolve --status
```

---

### Method 5: Force DNS Query from Different Server

**Instead of clearing cache, query from different DNS servers:**

```bash
# Query from Google DNS (bypasses local cache)
dig raajugarikossu.com +short @8.8.8.8

# Query from Cloudflare DNS
dig raajugarikossu.com +short @1.1.1.1

# Query from Quad9 DNS
dig raajugarikossu.com +short @9.9.9.9
```

**This shows what DNS servers see, not what's cached locally.**

---

### Method 6: Check DNS Without Cache

**Use `dig` with `+noall +answer` to get fresh results:**

```bash
# Query from specific DNS server (bypasses cache)
dig +noall +answer raajugarikossu.com @8.8.8.8

# Query root domain
dig +noall +answer raajugarikossu.com @8.8.8.8

# Query www subdomain
dig +noall +answer www.raajugarikossu.com @8.8.8.8
```

---

## 🎯 Recommended Approach

**Since DNS cache clearing might not work, use these methods:**

### Step 1: Query from Public DNS Servers

```bash
# Check what Google DNS sees
dig raajugarikossu.com +short @8.8.8.8

# Check what Cloudflare DNS sees
dig raajugarikossu.com +short @1.1.1.1

# Compare with your default DNS
dig raajugarikossu.com +short
```

**This shows the actual DNS propagation status from different locations.**

---

### Step 2: Check DNS Online

1. **Go to https://dnschecker.org**
2. **Enter**: `raajugarikossu.com`
3. **Click**: Search
4. **Check results** from different global locations
5. **See if DNS has propagated** in different regions

---

### Step 3: Wait for DNS Propagation

**DNS changes take time to propagate globally:**

- **Minimum**: 5-10 minutes
- **Typical**: 15-30 minutes
- **Maximum**: 48 hours (rare)

**If you just changed DNS in GoDaddy:**
- Wait at least **15-30 minutes**
- Check again from different DNS servers

---

### Step 4: Once DNS Shows Only Your IP

**Once you see ONLY `91.108.110.72` from most DNS servers:**

```bash
# Verify DNS is correct
dig raajugarikossu.com +short @8.8.8.8
# Should return ONLY: 91.108.110.72

dig www.raajugarikossu.com +short @8.8.8.8
# Should return: raajugarikossu.com. and 91.108.110.72
```

**Then try certbot:**

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

---

## ⚡ Quick Commands to Run Now

```bash
# 1. Try resolvectl (if available)
sudo resolvectl flush-caches
# OR
sudo systemctl restart systemd-resolved

# 2. Check DNS from public DNS servers (bypasses cache)
dig raajugarikossu.com +short @8.8.8.8
dig raajugarikossu.com +short @1.1.1.1
dig raajugarikossu.com +short

# 3. Wait 15-30 minutes, then check again
# 4. Once DNS shows ONLY 91.108.110.72, try certbot
```

---

## 🔍 Understanding DNS Cache

**Your server's DNS cache doesn't affect Let's Encrypt verification!**

Let's Encrypt verifies from their own servers, not from your server's cache. The issue is that DNS still hasn't fully propagated globally.

**What matters:**
- ✅ DNS propagation to Let's Encrypt servers
- ✅ DNS propagation globally (takes 15-30 minutes)
- ❌ Your local DNS cache (doesn't affect Let's Encrypt)

**So the real solution is:**
1. Make sure GoDaddy DNS is correct
2. Wait 15-30 minutes for propagation
3. Check from multiple DNS servers
4. Once DNS is correct globally, try certbot

---

## 📋 Summary

- ❌ **`systemd-resolve` doesn't exist** on your system
- ✅ **Try `resolvectl`** or restart services
- ✅ **Better approach**: Query from public DNS servers (bypasses cache)
- ✅ **Best solution**: Wait for DNS propagation (15-30 minutes)
- ✅ **Check online**: https://dnschecker.org
- ✅ **Once propagated**: Try certbot again

**DNS propagation is the real issue - not your local cache!** ⏰










