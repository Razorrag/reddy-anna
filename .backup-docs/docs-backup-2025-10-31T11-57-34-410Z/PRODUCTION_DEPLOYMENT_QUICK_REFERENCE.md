# Production Deployment Quick Reference

## Essential Environment Variables

```bash
# Required for production
NODE_ENV=production
PORT=5000
SESSION_SECRET=your-32-char-secret-key-here
JWT_SECRET=your-jwt-secret-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key

# Recommended for production
CORS_ORIGIN=https://yourdomain.com
DEFAULT_BALANCE=0.00
JWT_EXPIRES_IN=15m        # Access token expiration (15 minutes)
JWT_REFRESH_EXPIRES_IN=7d # Refresh token expiration (7 days)
```

## Generate Secure Keys

```bash
# Generate session secret (32+ characters recommended)
openssl rand -base64 32

# Generate JWT secret (32+ characters recommended)
openssl rand -base64 32
```

## PM2 Commands

```bash
# Start application
pm2 start ecosystem.config.cjs --env production

# Check status
pm2 status

# View logs
pm2 logs andar-bahar --lines 100

# Restart after updates
pm2 reload andar-bahar

# Setup auto-start on boot
pm2 startup
pm2 save
```

## Build Process

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Build application
npm run build

# Verify dist folder exists
ls -la dist/
```

## Nginx Configuration (WebSocket Support)

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

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
        proxy_read_timeout 86400;
    }
}
```

## Security Checklist

- [ ] Environment variables properly set
- [ ] SSL certificate installed
- [ ] Firewall configured (ports 80, 443, SSH only)
- [ ] Database connection verified
- [ ] Admin panel tested
- [ ] WebSocket connections working
- [ ] Production logs monitored

## Common Issues

1. **Port 5000 blocked**: Ensure only Nginx accesses it, not external
2. **WebSocket problems**: Check Nginx proxy configuration 
3. **SSL renewal**: Certbot should auto-renew with systemd timer
4. **Database connectivity**: Verify Supabase connection in production