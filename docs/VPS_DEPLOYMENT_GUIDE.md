# VPS Deployment Guide for Andar Bahar Game

This guide will help you deploy your Andar Bahar game application to a VPS (Virtual Private Server).

## Prerequisites

- A VPS with SSH access (Ubuntu 20.04+ recommended)
- Domain name (optional but recommended)
- Supabase account and database setup
- Basic knowledge of Linux command line

## Step 1: Initial VPS Setup

### Connect to your VPS
```bash
ssh root@your-vps-ip
```

### Update system packages
```bash
sudo apt update && sudo apt upgrade -y
```

### Install Node.js and npm
```bash
# Install NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Install pm2 for process management
```bash
sudo npm install -g pm2
```

### Install Git
```bash
sudo apt install git -y
```

## Step 2: Clone and Setup Application

### Create application directory
```bash
mkdir -p /var/www/andarbahar
cd /var/www/andarbahar
```

### Clone your repository (or upload files)
```bash
git clone https://github.com/yourusername/your-repo.git .
# OR if you have local files, upload them via SCP or SFTP
```

### Install dependencies
```bash
npm install
cd client && npm install && cd ..
```

### Build the application
```bash
npm run build
```

## Step 3: Environment Configuration

### Create environment file
```bash
nano .env
```

Add the following configuration (replace with your actual values):
```bash
# Environment
NODE_ENV=production

# Server Configuration
PORT=5000

# Security
SESSION_SECRET=your-super-secret-session-key-here-32-characters-long
JWT_SECRET=your-jwt-secret-key-here-also-very-long

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-super-long-supabase-service-key

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com

# Default Balance
DEFAULT_BALANCE=0.00

# JWT Token Expiration
JWT_EXPIRES_IN=24h
```

### Generate secure secrets
```bash
# Generate session secret
openssl rand -base64 32

# Generate JWT secret
openssl rand -base64 32
```

## Step 4: Database Setup

### Setup Supabase
1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Get your API URL and Service Role Key from Project Settings → API
4. Update your `.env` file with these values

### Import database schema
```bash
# Execute the initial schema (your supabase_schema.sql file)
# You can do this through the Supabase web interface or using the Supabase CLI
```

## Step 5: Configure PM2 Process Manager

### Create PM2 ecosystem file
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

### Create logs directory
```bash
mkdir -p logs
```

## Step 6: Start the Application

### Start with PM2
```bash
pm2 start ecosystem.config.cjs --env production
```

### Set PM2 to start on boot
```bash
pm2 startup
pm2 save
```

### Check application status
```bash
pm2 status
pm2 logs andar-bahar
```

### Check application status
```bash
pm2 status
pm2 logs andar-bahar
```

## Step 7: Configure Reverse Proxy with Nginx

### Install Nginx
```bash
sudo apt install nginx -y
```

### Start and enable Nginx
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Configure Nginx (for HTTPS with SSL)
```bash
sudo nano /etc/nginx/sites-available/andarbahar
```

Add the following configuration (replace `yourdomain.com` with your actual domain):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # WebSocket and HTTP proxy settings
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
        
        # Timeouts for WebSocket connections
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
    }
}
```

### Enable the site
```bash
sudo ln -s /etc/nginx/sites-available/andarbahar /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

## Step 8: SSL Certificate Setup (Let's Encrypt)

### Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Get SSL certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

The certificate will be automatically renewed. Check the status:
```bash
sudo systemctl status certbot.timer
```

## Step 9: Firewall Configuration

### Enable UFW firewall
```bash
sudo ufw enable
```

### Allow necessary ports
```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 5000  # Only if not behind proxy, otherwise remove
```

### Check firewall status
```bash
sudo ufw status
```

## Step 10: Monitoring and Maintenance

### PM2 monitoring command
```bash
pm2 monit
```

### Common PM2 commands
```bash
pm2 restart andar-bahar          # Restart application
pm2 reload andar-bahar           # Zero-downtime reload
pm2 stop andar-bahar             # Stop application
pm2 logs andar-bahar --lines 100 # View last 100 lines of logs
pm2 startup                      # Setup PM2 to run on boot
```

### Update application
```bash
# Pull latest code
git pull origin main

# Install any new dependencies
npm install
cd client && npm install && cd ..

# Rebuild application
npm run build

# Restart application
pm2 restart andar-bahar
```

## Troubleshooting

### Common Issues and Solutions:

1. **Application not starting:**
   - Check logs: `pm2 logs andar-bahar`
   - Check environment variables are set correctly
   - Ensure all required dependencies are installed

2. **WebSocket issues:**
   - Make sure Nginx is configured with WebSocket support
   - Check proxy settings in Nginx configuration

3. **SSL certificate issues:**
   - Verify domain DNS is pointing to your VPS
   - Check firewall allows port 80/443

4. **Database connection issues:**
   - Verify Supabase URL and keys are correct
   - Check network connection to Supabase

### Useful Commands for Debugging:

```bash
# Check if the application is running on the correct port
netstat -tuln | grep :5000

# Check Nginx status
sudo systemctl status nginx

# Check PM2 logs
pm2 logs

# Check system resources
htop

# Check disk usage
df -h
```

## Security Best Practices

1. **Regular Updates:** Keep your system and packages updated
2. **Strong Passwords:** Use strong passwords and SSH keys
3. **SSL/TLS:** Always use HTTPS for production
4. **Environment Variables:** Never commit sensitive information to Git
5. **Firewall:** Keep unnecessary ports closed
6. **Backups:** Regularly backup your database and application files

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `PORT` | Yes | Server port | `5000` |
| `SESSION_SECRET` | Yes | Session encryption key | Random 32+ char string |
| `JWT_SECRET` | Yes | JWT token encryption key | Random 32+ char string |
| `SUPABASE_URL` | Yes | Supabase project URL | `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key | Long API key |
| `CORS_ORIGIN` | No | Allowed origin | `https://yourdomain.com` |
| `DEFAULT_BALANCE` | No | Default user balance | `0.00` |

Your Andar Bahar game should now be running on your VPS and accessible via your domain with HTTPS!