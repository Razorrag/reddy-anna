# Restream.io Quick Setup Guide for OBS Streaming

## 🎯 Restream.io Setup - Step by Step

### Step 1: Sign Up for Restream.io
1. Go to [restream.io](https://restream.io/)
2. Click **"Sign Up"** 
3. Choose your plan:
   - **Free Plan**: Stream to 2 platforms simultaneously
   - **Premium**: Stream to 30+ platforms (recommended for serious streaming)
4. Complete registration with email or Google/Facebook account

### Step 2: Set Up Your First Stream
1. After login, click **"Go Live"** or **"Create Stream"**
2. Choose **"Custom RTMP"** option
3. You'll see your **RTMP URL** and **Stream Key**:
   ```
   RTMP URL: rtmp://live.restream.io/live
   Stream Key: your-unique-stream-key-here
   ```

### Step 3: Configure OBS for Restream.io
1. Open OBS Studio
2. Go to **Settings** → **Stream**
3. Set **Service**: **Custom**
4. Enter:
   - **Server**: `rtmp://live.restream.io/live`
   - **Stream Key**: Your unique stream key from Restream
5. Click **Apply** → **OK**

### Step 4: Optimize OBS Settings for Restream
1. Go to **Settings** → **Output**
2. Set **Output Mode**: **Advanced**
3. In **Streaming** tab:
   - **Encoder**: x264 or Hardware (NVENC/QuickSync)
   - **Rate Control**: CBR
   - **Bitrate**: 2500 Kbps
   - **Keyframe Interval**: 2 seconds
   - **Preset**: veryfast

### Step 5: Set Up Your OBS Scene
1. In **Sources** panel, click **+**
2. Add **Video Capture Device** (for webcam)
3. Or add **Display Capture** (for screen sharing)
4. Or add **Game Capture** (for game streaming)
5. Position and resize your sources

### Step 6: Test Your Stream
1. Click **"Start Streaming"** in OBS
2. Check OBS shows **"LIVE"** status
3. Go to your Restream.io dashboard
4. You should see your stream preview

### Step 7: Get Your Embed Code for the App
1. In Restream dashboard, find your active stream
2. Click **"Share"** or **"Embed"**
3. Copy the **Embed Code** - it looks like:
   ```html
   <iframe src="https://cloud.restream.io/embed/your-stream-id" width="640" height="360" frameborder="0" allowfullscreen></iframe>
   ```
4. Extract just the URL part: `https://cloud.restream.io/embed/your-stream-id`

### Step 8: Configure Your App Admin Panel
1. Go to `https://your-app.onrender.com/admin-game`
2. Log in with admin credentials
3. Find **Stream Configuration** section
4. Set:
   - **Stream Type**: `embed`
   - **Stream URL**: `https://cloud.restream.io/embed/your-stream-id`
   - **Stream Status**: `live`
5. Click **Save Settings**

### Step 9: Verify Stream in Your App
1. Open your app: `https://your-app.onrender.com`
2. Navigate to the game page
3. Your Restream stream should appear
4. Test that it plays smoothly

## 🎬 Complete Restream.io Configuration

### OBS Settings Summary:
```
Service: Custom
Server: rtmp://live.restream.io/live
Stream Key: [your-unique-key-from-restream]

Output Settings:
- Encoder: x264 or NVENC
- Rate Control: CBR
- Bitrate: 2500 Kbps
- Keyframe Interval: 2 seconds
- Preset: veryfast

Video Settings:
- Base Resolution: 1920x1080
- Output Resolution: 1280x720
- FPS: 30
```

### App Admin Panel Settings:
```
Stream Type: embed
Stream URL: https://cloud.restream.io/embed/your-stream-id
Stream Status: live
```

## 🚀 Advanced Restream.io Features

### Multi-Platform Streaming (Premium)
1. In Restream dashboard, click **"Add Platforms"**
2. Connect YouTube, Facebook, Twitch, etc.
3. Your single OBS stream will broadcast to all platforms
4. Viewers can watch on any platform

### Custom Branding
1. Go to **Settings** → **Branding**
2. Upload your logo
3. Customize colors and overlays
4. Add custom stream title and description

### Analytics and Insights
1. Monitor viewer count across platforms
2. Track engagement metrics
3. Export performance reports
4. Optimize streaming schedule

## 🛠️ Troubleshooting Restream.io

### Stream Not Connecting
**Problem**: OBS can't connect to Restream

**Solutions**:
1. Verify RTMP URL: `rtmp://live.restream.io/live`
2. Check stream key is correct (no extra spaces)
3. Ensure internet connection is stable
4. Try restarting OBS
5. Check Restream service status

### Stream Not Showing in App
**Problem**: Stream works in Restream but not in your app

**Solutions**:
1. Verify embed URL format: `https://cloud.restream.io/embed/your-stream-id`
2. Check admin panel settings are saved
3. Test embed URL in browser directly
4. Refresh the game page
5. Check browser console for errors

### Poor Quality Issues
**Problem**: Stream is pixelated or buffering

**Solutions**:
1. Reduce OBS bitrate to 2000 Kbps
2. Lower resolution to 720p
3. Use wired internet connection
4. Close other bandwidth-heavy apps
5. Check upload speed at speedtest.net

### Audio Problems
**Problem**: No sound or bad audio quality

**Solutions**:
1. Check audio device in OBS Settings → Audio
2. Verify audio levels in OBS mixer
3. Ensure correct microphone is selected
4. Test with headphones first
5. Check system audio settings

## 📱 Mobile Optimization with Restream

### Best Settings for Mobile Viewers
- Resolution: 1280x720 (not 1080p)
- Bitrate: 2000-2500 Kbps
- FPS: 30 (not 60)
- Audio: 128 kbps

### Testing on Mobile
1. Open your app on mobile device
2. Test stream playback
3. Check if controls work properly
4. Verify portrait/landscape orientation

## 💡 Pro Tips for Restream.io

### Before Going Live
1. Test stream for 5-10 minutes
2. Check audio and video quality
3. Verify embed code works in app
4. Have backup content ready
5. Test on mobile devices

### During Stream
1. Monitor Restream dashboard
2. Watch viewer count across platforms
3. Keep an eye on OBS stats
4. Be ready to troubleshoot quickly
5. Engage with your audience

### After Stream
1. Stop OBS stream properly
2. Update app admin panel to "offline"
3. Review analytics in Restream
4. Save recording if available
5. Plan improvements for next stream

## 🔄 Backup Plan

### If Restream.io Goes Down
1. **Quick Switch to YouTube**:
   - Go to YouTube Studio → Go Live
   - Get YouTube RTMP settings
   - Update OBS settings
   - Update app admin panel with YouTube embed URL

2. **Pre-recorded Backup**:
   - Have a 10-minute loop video ready
   - Upload to YouTube as unlisted
   - Use as fallback in admin panel

## 📞 Restream.io Support

### Getting Help
- **Restream Help Center**: [help.restream.io](https://help.restream.io/)
- **Live Chat**: Available in Restream dashboard
- **Email Support**: support@restream.io
- **Community Forum**: community.restream.io

### Common Issues Quick Reference
| Issue | Solution |
|-------|----------|
| Can't connect | Check RTMP URL and stream key |
| No video | Verify OBS sources and scenes |
| No audio | Check OBS audio mixer settings |
| Lagging stream | Reduce bitrate to 2000 Kbps |
| Not showing in app | Verify embed URL format |

## 🎉 You're Ready!

With Restream.io, you can:
- ✅ Stream to multiple platforms simultaneously
- ✅ Get professional embed codes for your app
- ✅ Monitor analytics across all platforms
- ✅ Use custom branding and overlays
- ✅ Have reliable streaming infrastructure

**Start with the free plan** to test everything works, then upgrade to premium when you need multi-platform streaming.

Your Reddy Anna app is now ready to display professional live streams using Restream.io! 🚀
