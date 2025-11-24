#!/bin/bash
# VPS Diagnostic Script for rajugarikossu.com
# Run this on your VPS to diagnose connection issues

echo "=========================================="
echo "🔍 VPS DIAGNOSTIC SCRIPT"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check Nginx Status
echo "1️⃣ Checking Nginx Status..."
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx is running${NC}"
    nginx -t 2>&1 | head -5
else
    echo -e "${RED}❌ Nginx is NOT running${NC}"
    echo "   Start with: sudo systemctl start nginx"
fi
echo ""

# 2. Check Node.js Process
echo "2️⃣ Checking Node.js Backend Process..."
if pgrep -f "node.*index.js" > /dev/null; then
    echo -e "${GREEN}✅ Node.js backend is running${NC}"
    ps aux | grep "node.*index.js" | grep -v grep
else
    echo -e "${RED}❌ Node.js backend is NOT running${NC}"
    echo "   Start with: npm start or pm2 start dist/index.js"
fi
echo ""

# 3. Check Port 5000 (Backend)
echo "3️⃣ Checking Backend Port 5000..."
if netstat -tuln | grep -q ":5000"; then
    echo -e "${GREEN}✅ Port 5000 is listening${NC}"
    netstat -tuln | grep ":5000"
else
    echo -e "${RED}❌ Port 5000 is NOT listening${NC}"
    echo "   Backend server might not be started"
fi
echo ""

# 4. Check Port 443 (HTTPS)
echo "4️⃣ Checking HTTPS Port 443..."
if netstat -tuln | grep -q ":443"; then
    echo -e "${GREEN}✅ Port 443 is listening (HTTPS)${NC}"
    netstat -tuln | grep ":443"
else
    echo -e "${RED}❌ Port 443 is NOT listening${NC}"
    echo "   Nginx might not be configured for SSL"
fi
echo ""

# 5. Check Port 80 (HTTP)
echo "5️⃣ Checking HTTP Port 80..."
if netstat -tuln | grep -q ":80"; then
    echo -e "${GREEN}✅ Port 80 is listening (HTTP)${NC}"
else
    echo -e "${YELLOW}⚠️  Port 80 is not listening${NC}"
fi
echo ""

# 6. Check SSL Certificates
echo "6️⃣ Checking SSL Certificates..."
if [ -f "/etc/letsencrypt/live/rajugarikossu.com/fullchain.pem" ]; then
    echo -e "${GREEN}✅ SSL certificate exists${NC}"
    openssl x509 -in /etc/letsencrypt/live/rajugarikossu.com/fullchain.pem -noout -dates 2>/dev/null || echo "Cannot read certificate details"
else
    echo -e "${RED}❌ SSL certificate NOT found${NC}"
    echo "   Path: /etc/letsencrypt/live/rajugarikossu.com/fullchain.pem"
    echo "   Generate with: sudo certbot --nginx -d rajugarikossu.com -d www.rajugarikossu.com"
fi
echo ""

# 7. Check Nginx Configuration
echo "7️⃣ Checking Nginx Configuration..."
if [ -f "/etc/nginx/sites-available/reddy-anna-rajugarikossu.conf" ]; then
    echo -e "${GREEN}✅ Nginx config exists${NC}"
    if [ -L "/etc/nginx/sites-enabled/reddy-anna-rajugarikossu.conf" ]; then
        echo -e "${GREEN}✅ Config is enabled (symlinked)${NC}"
    else
        echo -e "${RED}❌ Config exists but NOT enabled${NC}"
        echo "   Enable with: sudo ln -s /etc/nginx/sites-available/reddy-anna-rajugarikossu.conf /etc/nginx/sites-enabled/"
    fi
else
    echo -e "${RED}❌ Nginx config NOT found${NC}"
    echo "   Expected: /etc/nginx/sites-available/reddy-anna-rajugarikossu.conf"
fi
echo ""

# 8. Check Firewall
echo "8️⃣ Checking Firewall (UFW)..."
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "Status: active"; then
        echo -e "${YELLOW}UFW is active${NC}"
        ufw status | grep -E "(80|443|5000)"
    else
        echo "UFW is inactive"
    fi
else
    echo "UFW not installed"
fi
echo ""

# 9. Check Application Logs
echo "9️⃣ Checking Application Logs..."
if [ -f "/var/log/nginx/reddy-anna-error.log" ]; then
    echo -e "${GREEN}Last 10 Nginx error log entries:${NC}"
    tail -10 /var/log/nginx/reddy-anna-error.log
else
    echo "Nginx error log not found"
fi
echo ""

# 10. Test Local Backend Connection
echo "🔟 Testing Local Backend Connection..."
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/health > /dev/null 2>&1; then
    response=$(curl -s -w "%{http_code}" http://127.0.0.1:5000/api/health)
    echo -e "${GREEN}✅ Backend responds: HTTP $response${NC}"
else
    echo -e "${RED}❌ Backend not responding on http://127.0.0.1:5000${NC}"
fi
echo ""

# 11. Check Domain DNS
echo "1️⃣1️⃣ Checking Domain DNS..."
echo "A record for rajugarikossu.com:"
dig +short rajugarikossu.com A
echo ""

# 12. Check Environment File
echo "1️⃣2️⃣ Checking .env Configuration..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    echo "NODE_ENV: $(grep NODE_ENV .env | cut -d'=' -f2)"
    echo "PORT: $(grep ^PORT= .env | cut -d'=' -f2)"
    echo "ALLOWED_ORIGINS: $(grep ALLOWED_ORIGINS .env | cut -d'=' -f2 | cut -c1-50)..."
else
    echo -e "${RED}❌ .env file NOT found${NC}"
fi
echo ""

echo "=========================================="
echo "🏁 DIAGNOSTIC COMPLETE"
echo "=========================================="
echo ""
echo "📋 NEXT STEPS:"
echo "1. Fix any issues marked with ❌"
echo "2. Ensure .env has correct domain (not localhost)"
echo "3. Rebuild: npm run build"
echo "4. Restart backend: pm2 restart all (or npm start)"
echo "5. Restart Nginx: sudo systemctl restart nginx"