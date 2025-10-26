# 🚀 Deploy to VPS Now - Quick Steps

## Critical Fix Applied ✅

The `server/vite.ts` file has been fixed to serve static files from the correct location (`dist/public/` instead of `client/dist/`).

---

## Run These Commands on Your VPS

### 1. Stop Current Application
```bash
pm2 stop andar-bahar
pm2 delete andar-bahar
```

### 2. Pull Latest Code
```bash
cd ~/reddy-anna
git pull
```

### 3. Install Dependencies (if needed)
```bash
npm install
```

### 4. Build the Application
```bash
npm run build
```

**Verify the build:**
```bash
ls -la dist/
ls -la dist/public/
```

You should see:
- `dist/index.js` (compiled server)
- `dist/public/index.html` (frontend)
- `dist/public/assets/` (frontend assets)

### 5. Create Logs Directory
```bash
mkdir -p logs
```

### 6. Start with PM2
```bash
pm2 start ecosystem.config.cjs --env production
```

### 7. Check Status
```bash
pm2 status
pm2 logs andar-bahar --lines 50
```

**You should see:**
```
✅ Serving static files from: /root/reddy-anna/dist/public
```

### 8. Test the Application

**Direct access:**
```bash
curl http://localhost:5000
```

**From browser:**
- `http://91.108.110.72:5000`

---

## If You Want to Use Nginx (Port 80)

### Install Nginx
```bash
sudo apt update
sudo apt install nginx -y
```

### Create Configuration
```bash
sudo nano /etc/nginx/sites-available/andar-bahar
```

**Paste this:**
```nginx
server {
    listen 80;
    server_name 91.108.110.72;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket support
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

### Enable and Start Nginx
```bash
sudo ln -s /etc/nginx/sites-available/andar-bahar /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Allow Firewall
```bash
sudo ufw allow 80
sudo ufw allow 5000
```

**Access via:**
- `http://91.108.110.72` (through Nginx)
- `http://91.108.110.72:5000` (direct)

---

## Troubleshooting

### Check if app is running
```bash
pm2 status
pm2 logs andar-bahar
```

### Check if port is listening
```bash
netstat -tuln | grep :5000
```

### Check Nginx logs (if using Nginx)
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Restart everything
```bash
pm2 restart andar-bahar
sudo systemctl restart nginx
```

---

## What Changed?

**Before (WRONG):**
- Server looked for files in `client/dist/` ❌
- This directory doesn't exist after build

**After (CORRECT):**
- Server looks for files in `dist/public/` ✅
- This is where Vite puts the built frontend

**Build Output Structure:**
```
dist/
├── index.js          # Compiled server code
├── public/           # Frontend files
│   ├── index.html
│   └── assets/
│       ├── index-[hash].js
│       └── index-[hash].css
```

The server runs from `dist/index.js` and serves static files from `dist/public/`.

---

## Success Indicators

✅ PM2 shows app as "online"
✅ Logs show: "Serving static files from: /root/reddy-anna/dist/public"
✅ Browser shows your app (not 404 or error)
✅ No errors in `pm2 logs`

---

## Quick Commands Reference

```bash
# View logs
pm2 logs andar-bahar

# Restart app
pm2 restart andar-bahar

# Stop app
pm2 stop andar-bahar

# Monitor
pm2 monit

# Save PM2 config (run on boot)
pm2 save
pm2 startup
```
