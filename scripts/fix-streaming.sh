#!/bin/bash

echo "🔧 Reddy Anna Streaming Fix Script"
echo "================================="

# Step 1: Check if ffmpeg is installed
echo "📋 Step 1: Checking ffmpeg installation..."
if command -v ffmpeg &> /dev/null; then
    echo "✅ ffmpeg is installed"
    ffmpeg -version | head -1
else
    echo "❌ ffmpeg is NOT installed"
    echo "📦 Installing ffmpeg..."
    sudo apt update
    sudo apt install -y ffmpeg
    if command -v ffmpeg &> /dev/null; then
        echo "✅ ffmpeg installed successfully"
    else
        echo "❌ Failed to install ffmpeg"
        exit 1
    fi
fi

# Step 2: Check media directory
echo ""
echo "📋 Step 2: Checking media directory..."
if [ -d "/root/reddy-anna/media" ]; then
    echo "✅ Media directory exists"
else
    echo "📁 Creating media directory..."
    mkdir -p /root/reddy-anna/media/live
fi

# Set proper permissions
chmod 755 /root/reddy-anna/media
chmod 755 /root/reddy-anna/media/live
echo "✅ Media directory permissions set"

# Step 3: Check if ports are accessible
echo ""
echo "📋 Step 3: Checking port accessibility..."
if netstat -tlnp | grep -q ":1935 "; then
    echo "✅ RTMP port 1935 is open"
else
    echo "❌ RTMP port 1935 is not accessible"
fi

if netstat -tlnp | grep -q ":8000 "; then
    echo "✅ HTTP port 8000 is open"
else
    echo "❌ HTTP port 8000 is not accessible"
fi

# Step 4: Test ffmpeg with a simple conversion
echo ""
echo "📋 Step 4: Testing ffmpeg functionality..."
# Create a test video pattern for 10 seconds
ffmpeg -f lavfi -i testsrc=duration=10:size=320x240:rate=30 -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -c:v libx264 -c:a aac -t 10 /root/reddy-anna/media/test.mp4 -y 2>/dev/null

if [ -f "/root/reddy-anna/media/test.mp4" ]; then
    echo "✅ ffmpeg can create video files"
    rm /root/reddy-anna/media/test.mp4
else
    echo "❌ ffmpeg test failed"
fi

# Step 5: Restart PM2 to ensure latest build
echo ""
echo "📋 Step 5: Restarting application..."
pm2 restart reddy-anna-app
echo "✅ Application restarted"

# Step 6: Show current status
echo ""
echo "📋 Step 6: Current Status"
echo "======================="
echo "Media directory contents:"
ls -la /root/reddy-anna/media/live/ 2>/dev/null || echo "Directory exists but empty"

echo ""
echo "Next steps:"
echo "1. Start streaming from OBS to: rtmp://91.108.110.72:1935/live"
echo "2. Use stream key: stream"
echo "3. Monitor HLS files: watch -n 1 'ls -la /root/reddy-anna/media/live/'"
echo "4. Test HLS: curl http://91.108.110.72:8000/live/stream.m3u8"
echo "5. Test in browser: http://91.108.110.72:5000"

echo ""
echo "🔧 Fix script completed!"
