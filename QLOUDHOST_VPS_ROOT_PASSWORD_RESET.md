# QloudHost VPS Root Password Reset Guide
## 🔐 Complete Guide for VPS WITHOUT Control Panel

**IMPORTANT:** This guide is for QloudHost VPS **WITHOUT cPanel or DirectAdmin**. Your VPS requires direct SSH access or support assistance.

---

## **🚨 RECOMMENDED METHOD: Contact QloudHost Support**

Since your VPS has **no control panel**, the fastest and most reliable method is to contact QloudHost support directly:

### **Option A: Live Chat (FASTEST - Recommended)**
1. Visit [QloudHost Website](https://www.qloudhost.com/)
2. Click on **Live Chat** button (bottom right corner)
3. Say: **"I need immediate help resetting root password for my VPS. No control panel installed."**
4. Provide when asked:
   - VPS IP address
   - Account email  
   - Service ID (from client area)
   
**Expected Response:** Immediate to 5 minutes  
**Resolution Time:** Usually within 15-30 minutes

### **Option B: Support Ticket (Also Fast)**
1. Log into [QloudHost Client Area](https://www.qloudhost.com/clients/)
2. Go to **Support** → **Submit Ticket**
3. Department: **Technical Support** or **VPS Support**
4. Priority: **High**
5. Subject: **"URGENT: VPS Root Password Reset - No Control Panel"**

**Message Template:**
```
Hello QloudHost Support Team,

I urgently need assistance resetting the root password for my VPS.

VPS Details:
- IP Address: [YOUR_VPS_IP]
- Service ID: [FROM_CLIENT_AREA]
- Account Email: [YOUR_EMAIL]

My VPS has no control panel installed (no cPanel/DirectAdmin).
I have lost root access and need password reset assistance.

Please reset the root password and send the new credentials 
to my registered email address.

Thank you for urgent assistance.

Best regards,
[Your Name]
```

**Expected Response:** 1-4 hours  
**Resolution Time:** Usually same day

### **Option C: Email Support**
- Email: **support@qloudhost.com**
- Use same message template as above
- Include VPS IP and Service ID

**Expected Response:** 2-12 hours

---

## **METHOD 2: Using SSH (If You Still Have Access)**

If you can still connect but want to change password:

```bash
# Connect to your VPS
ssh root@your-vps-ip

# Change root password
passwd

# Enter new password twice (won't show while typing)
# Password requirements:
# - Minimum 8 characters (16+ recommended)
# - Mix of uppercase, lowercase, numbers, special chars
```

---

## **METHOD 3: Using VNC/Serial Console (If Available)**

### Check if VNC console is available:
1. Log into [QloudHost Client Area](https://www.qloudhost.com/clients/)
2. Go to **Services** → **My Services**
3. Click on your VPS
4. Look for:
   - "VNC Console" button
   - "Serial Console" link
   - "Console Access" option
   - "Remote Console" button

### If VNC Console is Available:

#### For Linux VPS - Single User Mode Reset:

1. **Open VNC console**

2. **Reboot the server:**
   ```bash
   reboot
   ```

3. **When GRUB menu appears:**
   - Press `e` to edit boot parameters
   - Find line starting with `linux` or `linux16`
   - Add `single` or `init=/bin/bash` at end of line
   - Press `Ctrl + X` or `F10` to boot

4. **Reset password:**
   ```bash
   # Remount filesystem as read-write
   mount -o remount,rw /
   
   # Change root password
   passwd root
   # Enter new password twice
   
   # Sync changes
   sync
   
   # Reboot
   reboot -f
   ```

#### For Ubuntu/Debian - Recovery Mode:

1. **Open VNC console**

2. **Reboot and hold `Shift` key**

3. **Select:**
   - "Advanced options"
   - "Recovery mode"
   - "root - Drop to root shell prompt"

4. **Reset password:**
   ```bash
   mount -o remount,rw /
   passwd root
   sync
   reboot
   ```

---

## **METHOD 4: Check Client Area for Reset Option**

Some QloudHost VPS may have basic management:

1. Log into [QloudHost Client Area](https://www.qloudhost.com/clients/)
2. Navigate to **Services** → **My Services**
3. Click on your VPS service
4. Check for:
   - "Root Password Reset" button
   - "Reset Password" link
   - "VPS Management" section
   - Any password-related options

If found, follow on-screen instructions.

---

## **YOUR VPS PLAN DETAILS**

Based on your QloudHost VPS configuration:
- ✅ **Port Speed:** 50TB bandwidth @ 1 Gbps
- ❌ **Control Panel:** None (No cPanel/DirectAdmin)
- ❌ **Auto Installer:** Not available
- ❌ **Addon Storage:** Not available
- **Access Method:** SSH only (or VNC console if available)

---

## **IMPORTANT SECURITY AFTER PASSWORD RESET**

### 1. Create Strong Password
Your new password should be:
- **Minimum 16 characters** (20+ is better)
- Mix of **uppercase + lowercase + numbers + special chars**
- NOT dictionary words
- NOT reused from other services
- Example: `Kx9#mP2$vL8@qR5!wN3^`

Generate strong password:
```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | % {[char]$_})
```

### 2. Setup SSH Key Authentication (Highly Recommended)

**On your local machine:**
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy public key to VPS
ssh-copy-id root@your-vps-ip
```

**On VPS after key works:**
```bash
# Edit SSH config
nano /etc/ssh/sshd_config

# Change these settings:
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin prohibit-password

# Restart SSH
systemctl restart sshd
```

### 3. Configure Firewall

```bash
# Install UFW
apt update
apt install ufw -y

# Configure rules
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw allow 5000/tcp    # Your app (if needed)

# Enable firewall
ufw enable
```

### 4. Install Fail2Ban (Prevents brute force)

```bash
# Install
apt install fail2ban -y

# Enable and start
systemctl enable fail2ban
systemctl start fail2ban

# Check status
fail2ban-client status sshd
```

### 5. Update System

```bash
# Update all packages
apt update && apt upgrade -y

# Setup automatic security updates
apt install unattended-upgrades -y
dpkg-reconfigure --priority=low unattended-upgrades
```

---

## **TROUBLESHOOTING**

### Issue 1: "Permission denied" after reset
```bash
# Check SSH service
systemctl status sshd

# Check SSH config
sshd -t

# Check if root login allowed
grep "PermitRootLogin" /etc/ssh/sshd_config
```

### Issue 2: No VNC console in client area
- **Solution:** Contact QloudHost support - they can provide console access

### Issue 3: Support not responding
- Try **multiple channels**: Live chat + ticket + email
- Mention **"URGENT"** and **"Production server down"** if applicable
- Include all verification details upfront

### Issue 4: New password not working
- Check CAPS LOCK is OFF
- Ensure no extra spaces
- Try from VNC console (if available)
- Contact support for verification

---

## **QLOUDHOST SUPPORT CONTACT INFO**

### Primary Support Channels:
- **Website:** https://www.qloudhost.com/
- **Client Area:** https://www.qloudhost.com/clients/
- **Live Chat:** On website (24/7 availability)
- **Email:** support@qloudhost.com
- **Ticket System:** In client area

### Support Response Times:
- **Live Chat:** Instant to 5 minutes ⚡
- **Support Tickets:** 1-4 hours 🎫
- **Email:** 2-12 hours 📧
- **Emergency:** Use multiple channels simultaneously

### What to Provide to Support:
1. VPS IP address
2. Service ID (from client area)
3. Account email address
4. Brief description of issue
5. Any error messages

---

## **POST-RESET CHECKLIST**

After password reset is complete:

- [ ] Test SSH connection with new password
- [ ] Save password in password manager (LastPass, 1Password, Bitwarden)
- [ ] Setup SSH key authentication
- [ ] Disable password authentication (after keys work)
- [ ] Configure firewall (UFW)
- [ ] Install fail2ban
- [ ] Update system packages
- [ ] Review auth logs: `tail -f /var/log/auth.log`
- [ ] Document password change
- [ ] Update deployment scripts/CI-CD with new credentials
- [ ] Setup monitoring (optional)

---

## **BACKUP BEFORE MAJOR CHANGES**

Before resetting or if migrating:

```bash
# Backup important files
tar -czf /root/backup_$(date +%Y%m%d).tar.gz \
  /var/www \
  /etc/nginx \
  /etc \
  /home \
  /root

# Download to local machine
scp root@your-vps-ip:/root/backup_*.tar.gz ./
```

---

## **FOR VPS MIGRATION (Your Original Goal)**

After resetting password, prepare for migration:

1. **Document current setup:**
   ```bash
   # List running services
   systemctl list-units --type=service --state=running > services.txt
   
   # List installed packages
   dpkg -l > packages.txt  # Ubuntu/Debian
   rpm -qa > packages.txt  # CentOS/RHEL
   
   # List open ports
   netstat -tulpn > ports.txt
   
   # List cron jobs
   crontab -l > cron.txt
   ```

2. **Backup application data**
3. **Backup database** (if applicable)
4. **Backup environment variables** (`.env` files)
5. **Document all configurations**

Refer to your VPS migration guide for detailed steps.

---

## **EMERGENCY: If ALL Methods Fail**

1. **Last resort options:**
   - Request OS reinstall (⚠️ DATA LOSS)
   - Request VPS rebuild with backup restore
   - Escalate to QloudHost management

2. **Before OS reinstall:**
   - Try to backup data if possible
   - Document all configurations
   - Save application files

3. **Contact QloudHost:**
   - Request escalation to senior support
   - Mention data criticality
   - Ask about snapshot/backup restore options

---

## **SECURITY REMINDER**

⚠️ **CRITICAL SECURITY RULES:**

1. ❌ Never share root password via email/chat (even with support - they can reset it)
2. ✅ Use password manager to store credentials
3. ✅ Enable SSH key authentication ASAP
4. ✅ Disable password authentication after keys work
5. ✅ Keep system updated: `apt update && apt upgrade`
6. ✅ Monitor access logs regularly
7. ✅ Use fail2ban to prevent brute force
8. ✅ Enable firewall (UFW or iptables)
9. ✅ Use strong passwords (16+ chars, mixed case, numbers, symbols)
10. ✅ Regular backups (daily/weekly)

---

**Document Created:** 2025-11-16  
**Updated For:** QloudHost VPS WITHOUT Control Panel  
**Project:** Reddy Anna VPS Migration  
**VPS Plan:** 50TB @ 1Gbps, No cPanel/DirectAdmin
