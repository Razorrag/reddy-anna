# Production Server Configuration

## Server Specifications Recommendations

### Minimum Requirements:
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04 LTS or higher

### Recommended Requirements (for production):
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **OS**: Ubuntu 22.04 LTS

## System Configuration

### 1. Update and Secure the System

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install security tools
sudo apt install ufw fail2ban curl wget git nano htop -y

# Configure firewall (only necessary ports)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2. Optimize System for Node.js

```bash
# Increase file descriptor limits
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "root soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "root hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Apply limits
sudo sysctl -w fs.file-max=100000
echo "fs.file-max = 100000" | sudo tee -a /etc/sysctl.conf
```

### 3. Configure Node.js for Production

Create a systemd service for better process management (alternative to PM2):

```bash
sudo nano /etc/systemd/system/andar-bahar.service
```

```ini
[Unit]
Description=Andar Bahar Game Server
After=network.target

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=/var/www/andarbahar
EnvironmentFile=/var/www/andarbahar/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Then enable the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable andar-bahar
sudo systemctl start andar-bahar
sudo systemctl status andar-bahar
```

### 4. PM2 Configuration (Alternative Process Management)

If you prefer PM2 over systemd, use the ecosystem.config.cjs file:

Create PM2 ecosystem file:
```bash
nano ecosystem.config.cjs
```

Add the following configuration:
```javascript
module.exports = {
  apps: [{
    name: 'andar-bahar',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G'
  }]
};
```

Create logs directory:
```bash
mkdir -p logs
```

Start with PM2:
```bash
pm2 start ecosystem.config.cjs --env production
```

Set PM2 to start on boot:
```bash
pm2 startup
pm2 save
```

## Database Connection Optimization

### 1. Connection Pooling
Your current setup uses Supabase which handles connection pooling automatically. In your Supabase settings, ensure:

- Pool size is set appropriately
- Connection timeout is set to 30 seconds
- Idle timeout is configured

### 2. Database Connection Settings
Add these environment variables for connection optimization:

```bash
# Connection pooling (for PostgreSQL, if you switch from Supabase)
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_TIMEOUT=30000
```

## Nginx Configuration for Production

### Optimized Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/andarbahar
```

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/m;
limit_req_zone $binary_remote_addr zone=static:10m rate=10r/s;

upstream app_server {
    server 127.0.0.1:5000;
    keepalive 32;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Static files (for direct access, not through Node.js)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        limit_req zone=static burst=20 nodelay;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri @nodejs;
    }

    # API endpoints with rate limiting
    location ~ ^/api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://app_server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Login endpoint (strict rate limiting)
    location ~ ^/api/(auth|login|register) {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://app_server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Main application (WebSocket support)
    location / {
        proxy_pass http://app_server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket and long-polling timeout
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

## Application Configuration for Production

### 1. Memory and Performance Settings

```bash
# In your .env file
NODE_ENV=production
PORT=5000

# Memory settings
NODE_OPTIONS="--max-old-space-size=1024"  # Limit Node.js heap size to 1GB

# Session settings
SESSION_SECRET=your-very-long-secret-here
SESSION_MAX_AGE=86400000  # 24 hours in milliseconds

# JWT settings
JWT_SECRET=your-long-jwt-secret-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=100  # requests per window
```

### 2. Production Build Configuration

Create an optimized production build script:

```bash
nano scripts/build-production.js
```

```javascript
import { execSync } from 'child_process';
import { mkdirSync, cpSync, existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🚀 Starting production build process...');

try {
  // Clean dist directory
  const distDir = join(rootDir, 'dist');
  if (existsSync(distDir)) {
    console.log('🧹 Cleaning dist directory...');
    rmSync(distDir, { recursive: true, force: true });
  }

  // Build client with production optimizations
  console.log('🔨 Building client with production optimizations...');
  execSync('npm run build', {
    cwd: join(rootDir, 'client'),
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });

  // Create dist directories
  console.log('📁 Creating dist directories...');
  mkdirSync(distDir, { recursive: true });
  mkdirSync(join(distDir, 'public'), { recursive: true });

  // Copy client build to dist/public
  console.log('📋 Copying client build files...');
  const clientDistDir = join(rootDir, 'client', 'dist');
  if (existsSync(clientDistDir)) {
    cpSync(clientDistDir, join(distDir, 'public'), { recursive: true });
  } else {
    throw new Error('Client build directory not found');
  }

  // Build server with optimizations
  console.log('🔨 Building server with optimizations...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --minify --outdir=dist', {
    cwd: rootDir,
    stdio: 'inherit'
  });

  // Set production environment variables
  console.log('🔐 Setting production environment configuration...');
  
  console.log('✅ Production build completed successfully!');
  console.log('📦 Output directory: dist/');
  console.log('   - Server: dist/index.js');
  console.log('   - Client: dist/public/');
  console.log('');
  console.log('🎉 Your application is ready for production deployment!');

} catch (error) {
  console.error('❌ Production build failed:', error.message);
  process.exit(1);
}
```

### 3. Health Check Endpoint

Your application should have a health check endpoint. Make sure the `/` route in your server serves as a health check:

```typescript
// In your routes.ts, add this health check
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV
  });
});
```

## Monitoring and Logging Configuration

### 1. Application Logging

Add structured logging to your application:

```bash
# Install logging library
npm install pino pino-pretty
```

### 2. Log Rotation

Configure log rotation in your PM2 ecosystem file:

```javascript
module.exports = {
  apps: [{
    name: 'andar-bahar',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }],
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-vps-ip',
      ref: 'origin/main',
      repo: 'git@github.com:username/repo.git',
      path: '/var/www/andarbahar',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};
```

### 3. System Monitoring

Install server monitoring:

```bash
# Install Netdata for system monitoring
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# Or use a simple monitoring script
sudo apt install htop iotop nethogs -y
```

## Backup Strategy

### 1. Database Backup (Supabase)

Since you're using Supabase, backups are handled automatically, but you can also set up custom backups:

```bash
# Create a backup script
nano backup-database.sh
```

```bash
#!/bin/bash
# Supabase doesn't allow direct database dumps, so use their export feature
# This is just a placeholder for your own backup strategy

# For local PostgreSQL (if you switch later):
# pg_dump -h localhost -U username database_name > backup_$(date +%Y%m%d_%H%M%S).sql

echo "Database backup: Remember to use Supabase's built-in backup feature"
echo "Or set up scheduled exports through their dashboard"
```

### 2. Application Backup

```bash
# Create backup script
sudo nano /usr/local/bin/backup-app.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backups"
APP_DIR="/var/www/andarbahar"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup application files (excluding node_modules)
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C /var/www andarbahar --exclude='node_modules' --exclude='logs' --exclude='.git'

# Backup environment file separately (if needed)
cp $APP_DIR/.env $BACKUP_DIR/env_$DATE.bak

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "app_*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "env_*.bak" -mtime +7 -delete

echo "Backup completed: app_$DATE.tar.gz"
```

Make it executable and add to cron:

```bash
sudo chmod +x /usr/local/bin/backup-app.sh
sudo crontab -e
# Add this line to run daily at 2 AM:
0 2 * * * /usr/local/bin/backup-app.sh
```

## Performance Optimization Tips

1. **Enable Gzip compression** in Nginx
2. **Use a CDN** for static assets (Cloudflare, AWS CloudFront)
3. **Optimize database queries** - add indexes where needed
4. **Implement caching** - consider Redis for session storage
5. **Monitor resource usage** - keep an eye on CPU, memory, and disk usage
6. **Rate limiting** - protect against DDoS and abuse
7. **Optimize WebSocket connections** - handle disconnections gracefully

Your application should now be configured for secure, scalable production deployment!