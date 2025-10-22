# OBS Live Streaming Setup Guide for Render-Hosted App

## 🎯 Overview

This step-by-step guide will help you set up OBS Studio to live stream to your Reddy Anna Andar Bahar game hosted on Render.

## ⚠️ Important: Render Limitations

**Render blocks external access to port 1935**, which means:
- ❌ You CANNOT stream directly to `rtmp://your-app.onrender.com:1935/live`
- ✅ You must use an external streaming service (YouTube, Restream.io, etc.)
- ✅ Your app will display the stream using embed codes or HLS URLs

## 📋 Step-by-Step Setup

### Step 1: Choose Your Streaming Service

#### Option A: YouTube Live (Free & Recommended)
1. Go to [YouTube Studio](https://studio.youtube.com/)
2. Click "Create" → "Go Live"
3. Choose "Stream" (not "Schedule")
4. Copy your **RTMP URL** and **Stream Key**

#### Option B: Restream.io (Free Tier Available)
1. Sign up at [restream.io](https://restream.io/)
2. Go to Dashboard → "Add Channel"
3. Choose your platform (YouTube, Facebook, etc.)
4. Get your **RTMP URL** and **Stream Key**

#### Option C: Cloudflare Stream ($5/month - Best Quality)
1. Sign up for [Cloudflare Stream](https://www.cloudflare.com/products/stream/)
2. Go to Stream → "Create Live Input"
3. Copy your **RTMP ingest URL** and **Stream Key**

### Step 2: Configure OBS Studio

#### 2.1 Install OBS (if not already installed)
- Download from [obsproject.com](https://obsproject.com/)
- Install and launch OBS

#### 2.2 Configure Stream Settings
1. Open OBS → **Settings** → **Stream**
2. Set **Service**: **Custom**
3. Enter your streaming service details:
   - **Server**: RTMP URL from Step 1
   - **Stream Key**: Stream Key from Step 1
4. Click **Apply**

#### 2.3 Optimize Output Settings
1. Go to **Settings** → **Output**
2. Set **Output Mode**: **Advanced**
3. In **Streaming** tab:
   - **Encoder**: x264 or Hardware (NVENC/QuickSync)
   - **Rate Control**: CBR
   - **Bitrate**: 2500 Kbps
   - **Keyframe Interval**: 2 seconds
   - **Preset**: veryfast

#### 2.4 Configure Video Settings
1. Go to **Settings** → **Video**
2. Set **Base Resolution**: 1920x1080
3. Set **Output Resolution**: 1280x720
4. Set **FPS**: 30

### Step 3: Set Up Your Scene

#### 3.1 Add Video Source
1. In **Sources** panel, click **+**
2. Choose **Video Capture Device** (for webcam)
3. Or **Display Capture** (for screen)
4. Or **Game Capture** (for games)

#### 3.2 Add Game Elements (Optional)
- Add **Text** for game info
- Add **Image** for logo
- Position and resize as needed

### Step 4: Test Your Stream

#### 4.1 Start Streaming in OBS
1. Click **Start Streaming** in OBS
2. Check for "LIVE" status in OBS
3. Monitor bitrate and dropped frames

#### 4.2 Get Your Stream URL/HLS Link

**For YouTube Live:**
1. Go to YouTube Studio → Live
2. Copy your **Stream URL** (looks like: `https://www.youtube.com/watch?v=xxxxx`)
3. Convert to embed URL: `https://www.youtube.com/embed/xxxxx`

**For Restream.io:**
1. Go to Restream Dashboard
2. Copy the **Embed Code** or **HLS URL**

**For Cloudflare Stream:**
1. Go to Cloudflare Stream
2. Copy the **HLS playback URL** (.m3u8)

### Step 5: Configure Your App Admin Panel

#### 5.1 Access Admin Panel
1. Go to `https://your-app.onrender.com/admin-game`
2. Log in with admin credentials

#### 5.2 Update Stream Settings
1. Find the **Stream Configuration** section
2. Set **Stream Type**: 
   - `embed` (for YouTube/Restream embed)
   - `video` (for HLS URLs)
3. Enter your stream URL:
   - **For YouTube**:Paste embed URL (`https://www.youtube.com/embed/xxxxx`)
   - **For HLS**: Paste .m3u8 URL
4. Set **Stream Status**: `live`
5. Click **Save Settings**

### Step 6: Verify Stream in Your App

#### 6.1 Test Player View
1. Open your app: `https://your-app.onrender.com`
2. Navigate to the game page
3. Your stream should appear in the video area
4. Check that it plays smoothly

#### 6.2 Troubleshooting if Stream Not Showing
1. Check browser console for errors (F12 → Console)
2. Verify stream URL is accessible
3. Try opening the stream URL directly in browser
4. Check admin panel settings are saved

## 🔧 Complete Configuration Examples

### YouTube Live Configuration
```
OBS Settings:
- Service: Custom
- Server: rtmp://a.rtmp.youtube.com/live2
- Stream Key: your-youtube-stream-key

Admin Panel:
- Stream Type: embed
- Stream URL: https://www.youtube.com/embed/your-video-id
- Stream Status: live
```

### Restream.io Configuration
```
OBS Settings:
- Service: Custom
- Server: rtmp://live.restream.io/live
- Stream Key: your-restream-key

Admin Panel:
- Stream Type: embed
- Stream URL: https://cloud.restream.io/embed/your-stream-id
- Stream Status: live
```

### Cloudflare Stream Configuration
```
OBS Settings:
- Service: Custom
- Server: rtmp://live.cloudflare.com/live
- Stream Key: your-cloudflare-key

Admin Panel:
- Stream Type: video
- Stream URL: https://watch.cloudflarestream.com/your-stream-id/manifest/video.m3u8
- Stream Status: live
```

## 🚀 Going Live Checklist

### Pre-Stream Setup
- [ ] OBS installed and configured
- [ ] Streaming service account set up
- [ ] Stream key and RTMP URL copied
- [ ] OBS scene prepared with sources
- [ ] Admin panel settings configured
- [ ] Stream tested and working

### Technical Verification
- [ ] OBS shows "LIVE" status
- [ ] No significant dropped frames in OBS
- [ ] Stream plays in admin panel preview
- [ ] Stream appears on player game page
- [ ] Audio levels are correct
- [ ] Video quality looks good

### Final Checks
- [ ] Internet connection stable (wired preferred)
- [ ] CPU usage under 80% in OBS
- [ ] Backup plan ready (pre-recorded video)
- [ ] Admin panel open for monitoring
- [ ] Stream tested on mobile device

## 🛠️ Troubleshooting Guide

### Stream Not Appearing in App
**Problem**: Players can't see the stream

**Solutions**:
1. Check stream URL is correct in admin panel
2. Verify stream is actually live on streaming platform
3. Test stream URL in browser directly
4. Check browser console for CORS errors
5. Refresh the game page

### Poor Video Quality
**Problem**: Stream is pixelated or laggy

**Solutions**:
1. Reduce OBS bitrate to 2000 Kbps
2. Lower resolution to 720p
3. Use wired internet connection
4. Close other bandwidth-heavy applications
5. Check upload speed at speedtest.net

### Audio Issues
**Problem**: No sound or poor audio quality

**Solutions**:
1. Check audio device in OBS settings
2. Verify audio levels in OBS mixer
3. Set audio bitrate to 128 kbps
4. Test with headphones first

### High CPU Usage
**Problem**: OBS using too much CPU

**Solutions**:
1. Use hardware encoder (NVENC/QuickSync)
2. Lower video resolution
3. Reduce FPS to 30
4. Close unnecessary applications
5. Use OBS "Simple" output mode

## 📱 Mobile Optimization

### For Mobile Viewers
- Use 720p resolution (not 1080p)
- Keep bitrate under 2500 Kbps
- Test stream on mobile devices
- Consider vertical orientation for mobile-first content

### App Settings for Mobile
- Stream should auto-play on mobile
- HLS format works best on mobile
- Test on both iOS and Android
- Ensure responsive design works

## 🔄 Backup and Redundancy

### Have a Backup Plan
1. **Pre-recorded Video**: Have a 10-minute loop video ready
2. **Secondary Stream Service**: Set up backup YouTube stream
3. **Admin Panel Fallback**: Configure fallback video URL
4. **Test Failover**: Practice switching to backup

### Quick Switch Process
1. Stop OBS stream
2. Start backup stream on same platform
3. Update stream URL in admin panel if needed
4. Notify players of brief interruption

## 📊 Monitoring During Live Stream

### OBS Metrics to Watch
- **Dropped Frames**: Should be under 5%
- **Bitrate**: Should be stable
- **CPU Usage**: Should be under 80%
- **Frames per Second**: Should be stable at 30

### App Metrics to Monitor
- **Player Count**: Watch for sudden drops
- **Stream Buffering**: Check for player complaints
- **Admin Panel**: Monitor stream status
- **Error Logs**: Watch for any errors

## 🎉 Best Practices

### Before Going Live
1. Test stream for at least 10 minutes
2. Have all scenes and sources prepared
3. Check audio and video quality
4. Verify admin panel settings
5. Have moderator/admin ready

### During Stream
1. Monitor OBS stats continuously
2. Keep an eye on chat/player feedback
3. Be ready to troubleshoot quickly
4. Have backup content ready
5. Stay calm if issues occur

### After Stream
1. Stop OBS properly
2. Update admin panel to "offline"
3. Save recording if needed
4. Review performance metrics
5. Note any issues for next time

## 🆘 Quick Help

### Emergency Contacts
- **Streaming Platform Support**: YouTube/Restream/Cloudflare help
- **OBS Documentation**: [obsproject.com/support](https://obsproject.com/support)
- **Render Status**: [status.render.com](https://status.render.com/)

### Common Issues Quick Fix
| Issue | Quick Fix |
|-------|-----------|
| No video | Check OBS scene and sources |
| No audio | Check OBS audio mixer |
| Lagging stream | Lower bitrate to 2000 Kbps |
| Stream not showing | Refresh admin panel settings |
| Players can't connect | Check CORS and stream URL |

---

## 🎯 You're Ready!

Follow this guide step-by-step and you'll have OBS streaming live to your Render-hosted app in no time. The key is using an external streaming service since Render blocks the RTMP port.

**Remember**: Start with YouTube Live as it's the easiest and most reliable option. You can always switch to other services later once you're comfortable with the setup.

Good luck with your live streaming! 🚀
