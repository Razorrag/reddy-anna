# Production Deployment Guide

This guide covers deploying the Reddy Anna Andar Bahar game to production.

## 🚨 Pre-Deployment Checklist

### Critical Security Items
- [ ] Change all default secrets (JWT_SECRET, SESSION_SECRET)
- [ ] Set `NODE_ENV=production`
- [ ] Configure HTTPS/SSL certificates
- [ ] Set up Redis for state management
- [ ] Configure proper CORS origins
- [ ] Enable secure session cookies
- [ ] Review and test rate limiting
- [ ] Set up database backups

### Infrastructure Requirements
- [ ] PostgreSQL database (Supabase recommended)
- [ ] Redis instance (for multi-server deployments)
- [ ] HTTPS-enabled domain
- [ ] Node.js 18+ runtime
- [ ] Sufficient memory (min 512MB, recommended 1GB+)

## 🔧 Environment Configuration

### Required Environment Variables

```bash
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here

# Authentication
JWT_SECRET=your-secure-jwt-secret-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SESSION_SECRET=your-secure-session-secret

# Server
NODE_ENV=production
PORT=5000

# CORS - Your actual domains
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Redis (CRITICAL for production)
REDIS_URL=redis://your-redis-host:6379
# Or with authentication:
# REDIS_URL=redis://username:password@host:port

# Game Configuration
DEFAULT_BALANCE=100000.00
MIN_BET=1000
MAX_BET=100000
```

### Generate Secure Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate session secret
openssl rand -base64 32
```

## 📦 Build Process

### 1. Install Dependencies

```bash
npm install --production=false
```

### 2. Build Application

```bash
npm run build
```

This will:
- Build the React client (optimized, minified)
- Bundle the server with esbuild
- Output to `dist/` directory

### 3. Verify Build

```bash
# Check dist directory structure
ls -la dist/
# Should contain:
# - index.js (server bundle)
# - public/ (client build)
```

## 🚀 Deployment Options

### Option 1: Traditional VPS/Server

1. **Upload Files**
   ```bash
   # Upload dist/ folder and package.json
   scp -r dist/ package.json user@server:/app/
   ```

2. **Install Production Dependencies**
   ```bash
   ssh user@server
   cd /app
   npm install --production
   ```

3. **Set Environment Variables**
   ```bash
   # Create .env file or use system environment
   nano .env
   ```

4. **Start with Process Manager (PM2)**
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name reddy-anna
   pm2 save
   pm2 startup
   ```

### Option 2: Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy built application
COPY dist/ ./dist/

# Expose port
EXPOSE 5000

# Start application
CMD ["node", "dist/index.js"]
```

Build and run:

```bash
docker build -t reddy-anna .
docker run -d -p 5000:5000 --env-file .env reddy-anna
```

### Option 3: Platform as a Service (Render, Railway, etc.)

1. **Connect Repository**
   - Link your Git repository

2. **Configure Build Command**
   ```bash
   npm install && npm run build
   ```

3. **Configure Start Command**
   ```bash
   npm start
   ```

4. **Set Environment Variables**
   - Use platform's environment variable UI
   - Add all required variables from above

## 🗄️ Database Setup

### 1. Run Schema Migration

```bash
# In Supabase SQL Editor, run:
# database_schema_fixed.sql
```

This creates:
- All tables with proper ENUM types
- Indexes for performance
- Foreign key constraints

### 2. Create Admin User

```sql
-- Generate password hash (use bcrypt with 12 rounds)
-- Example: $2b$12$...

INSERT INTO admin_credentials (username, password_hash, role)
VALUES ('admin', 'your-bcrypt-hash-here', 'admin');
```

### 3. Verify Tables

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

## 🔴 Redis Setup

### Why Redis is Required

In production, Redis replaces in-memory state storage to:
- ✅ Survive server restarts
- ✅ Support multiple server instances (horizontal scaling)
- ✅ Provide fast, persistent state management

### Redis Providers

**Managed Options (Recommended):**
- [Redis Cloud](https://redis.com/cloud/) - Free tier available
- [Upstash](https://upstash.com/) - Serverless Redis
- [AWS ElastiCache](https://aws.amazon.com/elasticache/)
- [DigitalOcean Managed Redis](https://www.digitalocean.com/products/managed-databases-redis)

**Self-Hosted:**
```bash
# Install Redis
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis

# Test connection
redis-cli ping
# Should return: PONG
```

### Configure Redis URL

```bash
# Format: redis://[username]:[password]@[host]:[port]
REDIS_URL=redis://localhost:6379

# With authentication:
REDIS_URL=redis://user:password@host:6379

# With TLS (recommended for production):
REDIS_URL=rediss://user:password@host:6379
```

## 🔒 HTTPS/SSL Configuration

### Using Nginx as Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

## 📊 Monitoring & Logging

### PM2 Monitoring

```bash
# View logs
pm2 logs reddy-anna

# Monitor resources
pm2 monit

# View status
pm2 status
```

### Application Logs

The application logs to stdout. In production:

```bash
# With PM2
pm2 logs reddy-anna --lines 100

# With Docker
docker logs -f container-name

# Direct
NODE_ENV=production node dist/index.js 2>&1 | tee app.log
```

### Health Check Endpoint

```bash
# Check if server is running
curl https://yourdomain.com/api/health
```

## 🔄 Updates & Maintenance

### Zero-Downtime Deployment

With PM2:

```bash
# Pull latest code
git pull

# Rebuild
npm run build

# Reload (zero downtime)
pm2 reload reddy-anna
```

### Database Migrations

```sql
-- Always backup before migrations
-- Run migration scripts in Supabase SQL Editor
-- Test on staging environment first
```

### Redis Maintenance

```bash
# Check Redis memory usage
redis-cli INFO memory

# Clear all game state (if needed)
redis-cli FLUSHDB
```

## 🚨 Troubleshooting

### Server Won't Start

1. Check environment variables are set
2. Verify Redis connection: `redis-cli ping`
3. Check database connection
4. Review logs: `pm2 logs`

### WebSocket Connection Fails

1. Verify HTTPS is enabled
2. Check CORS configuration
3. Ensure WebSocket proxy is configured (Nginx)
4. Check firewall rules

### High Memory Usage

1. Check Redis memory: `redis-cli INFO memory`
2. Monitor active connections: `pm2 monit`
3. Review game state cleanup
4. Consider increasing server resources

### CORS Errors

1. Verify `ALLOWED_ORIGINS` includes your domain
2. Check protocol (http vs https)
3. Ensure credentials are enabled
4. Review browser console for specific error

## 📈 Scaling Considerations

### Horizontal Scaling (Multiple Servers)

**Requirements:**
- Redis for shared state (CRITICAL)
- Load balancer (Nginx, AWS ALB, etc.)
- Sticky sessions for WebSocket connections

**Load Balancer Configuration:**
```nginx
upstream backend {
    ip_hash; # Sticky sessions for WebSocket
    server server1:5000;
    server server2:5000;
    server server3:5000;
}
```

### Vertical Scaling (Bigger Server)

**Recommended Specs by User Count:**
- 100 concurrent users: 1GB RAM, 1 CPU
- 500 concurrent users: 2GB RAM, 2 CPU
- 1000+ concurrent users: 4GB+ RAM, 4+ CPU

## 🔐 Security Hardening

### Firewall Rules

```bash
# Allow only necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### Rate Limiting

Already configured in `server/security.ts`:
- Auth endpoints: 50 requests/15min
- API endpoints: 2000 requests/15min
- Game endpoints: 300 requests/minute

### Regular Security Updates

```bash
# Update dependencies monthly
npm audit
npm audit fix

# Update system packages
sudo apt update && sudo apt upgrade
```

## 📞 Support & Maintenance

### Backup Strategy

1. **Database:** Daily automated backups (Supabase handles this)
2. **Redis:** Periodic snapshots if using persistent Redis
3. **Code:** Version control (Git)

### Monitoring Alerts

Set up alerts for:
- Server downtime
- High error rates
- Memory/CPU usage > 80%
- Database connection failures
- Redis connection failures

---

## ✅ Post-Deployment Verification

After deployment, verify:

- [ ] Application loads at your domain
- [ ] HTTPS is working (green padlock)
- [ ] WebSocket connection establishes
- [ ] User registration works
- [ ] Admin login works
- [ ] Game can be started
- [ ] Bets can be placed
- [ ] Payments can be requested
- [ ] Admin panel is accessible

**Congratulations! Your application is now live in production! 🎉**
