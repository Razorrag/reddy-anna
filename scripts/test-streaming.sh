#!/bin/bash

echo "🎥 Reddy Anna Streaming Test Script"
echo "=================================="

# Function to test URL
test_url() {
    local url=$1
    local description=$2
    
    echo "🔍 Testing $description..."
    echo "URL: $url"
    
    response=$(curl -s -w "HTTP_CODE:%{http_code}" "$url" 2>/dev/null)
    http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
    body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')
    
    if [ "$http_code" = "200" ]; then
        echo "✅ $description - HTTP $http_code"
        if [[ "$body" == *"#EXTM3U"* ]]; then
            echo "✅ Valid M3U8 playlist detected"
            echo "📄 First few lines:"
            echo "$body" | head -5
        else
            echo "⚠️  HTTP 200 but not a valid M3U8 playlist"
            echo "📄 Response preview:"
            echo "$body" | head -3
        fi
    else
        echo "❌ $description - HTTP $http_code"
        if [ -n "$body" ]; then
            echo "📄 Error response:"
            echo "$body"
        fi
    fi
    echo ""
}

# Test 1: Check if application is running
echo "📋 Test 1: Application Status"
echo "============================="
if pm2 list | grep -q "reddy-anna-app.*online"; then
    echo "✅ Application is running"
else
    echo "❌ Application is not running"
    echo "Run: pm2 start npm --name 'reddy-anna-app' -- run start"
fi
echo ""

# Test 2: Check main application
echo "📋 Test 2: Main Application"
echo "==========================="
test_url "http://91.108.110.72:5000" "Main Application"

# Test 3: Test HLS endpoint (through proxy)
echo "📋 Test 3: HLS Endpoint (Proxy)"
echo "==============================="
test_url "http://91.108.110.72:5000/stream/live/stream.m3u8" "HLS via Main Server"

# Test 4: Test HLS endpoint (direct)
echo "📋 Test 4: HLS Endpoint (Direct)"
echo "==============================="
test_url "http://91.108.110.72:8000/live/stream.m3u8" "HLS Direct from RTMP Server"

# Test 5: Check media directory
echo "📋 Test 5: Media Directory"
echo "========================="
if [ -d "/root/reddy-anna/media/live" ]; then
    echo "✅ Media directory exists"
    echo "📁 Contents:"
    ls -la /root/reddy-anna/media/live/ 2>/dev/null || echo "Directory is empty"
    
    if [ "$(ls -A /root/reddy-anna/media/live/ 2>/dev/null)" ]; then
        echo "✅ Media files found"
        
        # Show file details
        echo "📄 File details:"
        for file in /root/reddy-anna/media/live/*; do
            if [ -f "$file" ]; then
                size=$(du -h "$file" | cut -f1)
                modified=$(stat -c %y "$file" | cut -d. -f1)
                echo "  $(basename "$file") - $size - Modified: $modified"
            fi
        done
    else
        echo "❌ No media files found"
        echo "💡 Start streaming from OBS to generate files"
    fi
else
    echo "❌ Media directory does not exist"
    echo "💡 Run: mkdir -p /root/reddy-anna/media/live"
fi
echo ""

# Test 6: Port connectivity
echo "📋 Test 6: Port Connectivity"
echo "==========================="
echo "🔍 Checking RTMP port 1935..."
if timeout 3 bash -c "</dev/tcp/91.108.110.72/1935" 2>/dev/null; then
    echo "✅ RTMP port 1935 is accessible"
else
    echo "❌ RTMP port 1935 is not accessible"
fi

echo "🔍 Checking HTTP port 8000..."
if timeout 3 bash -c "</dev/tcp/91.108.110.72/8000" 2>/dev/null; then
    echo "✅ HTTP port 8000 is accessible"
else
    echo "❌ HTTP port 8000 is not accessible"
fi

echo ""
# Test 7: Stream Settings API
echo "📋 Test 7: Stream Settings API"
echo "=============================="
test_url "http://91.108.110.72:5000/api/game/stream-settings" "Stream Settings API"

echo ""
echo "🎯 Summary & Next Steps"
echo "====================="
echo "If HLS tests failed:"
echo "1. Install ffmpeg: sudo apt install ffmpeg"
echo "2. Start OBS streaming to: rtmp://91.108.110.72:1935/live"
echo "3. Use stream key: stream"
echo "4. Monitor files: watch -n 1 'ls -la /root/reddy-anna/media/live/'"
echo ""
echo "If ports are not accessible:"
echo "1. Check firewall: sudo ufw status"
echo "2. Allow ports: sudo ufw allow 1935 && sudo ufw allow 8000"
echo ""
echo "🔧 Test script completed!"
