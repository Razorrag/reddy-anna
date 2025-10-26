# 🎥 YouTube Live Setup - 5 Minute Guide

## ✅ Why YouTube Live?

- ✅ **FREE** forever
- ✅ **No token issues** - just video ID
- ✅ **2-5 second latency** (ultra-low latency mode)
- ✅ **Works immediately**
- ✅ **No viewer limits**
- ✅ **Simple iframe embed**

---

## 🚀 Quick Setup (5 Minutes)

### **Step 1: Go to YouTube Studio**
```
https://studio.youtube.com/
```

### **Step 2: Start Live Stream**
1. Click **"Create"** button (top right)
2. Select **"Go Live"**
3. Choose **"Stream"** option (not webcam)

### **Step 3: Configure Stream Settings**
1. **Title:** "Andar Bahar Live Game"
2. **Visibility:** Select **"Unlisted"** (so only your app users can see it)
3. **Category:** Gaming
4. **Latency:** Enable **"Ultra-low latency"** (important!)

### **Step 4: Get Stream Credentials**
You'll see:
```
Stream URL: rtmps://a.rtmps.youtube.com:443/live2
Stream Key: xxxx-xxxx-xxxx-xxxx
```

Copy the **Stream Key**

### **Step 5: Configure OBS**
1. Open OBS Studio
2. Go to **Settings** → **Stream**
3. **Service:** YouTube - RTMPS
4. **Server:** rtmps://a.rtmps.youtube.com:443/live2 (auto-selected)
5. **Stream Key:** Paste your key from Step 4
6. Click **OK**

### **Step 6: Start Streaming**
1. Click **"Start Streaming"** in OBS
2. Wait 10-15 seconds
3. Go back to YouTube Studio
4. You should see "Stream is live" message

### **Step 7: Get Video ID**
In YouTube Studio, look at the URL:
```
https://studio.youtube.com/video/dQw4w9WgXcQ/livestreaming
                                 ^^^^^^^^^^^
                                 This is your Video ID
```

Or click "View on YouTube" and copy from URL:
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
                                 ^^^^^^^^^^^
                                 Video ID
```

### **Step 8: Update VideoStream.tsx**
Open: `client/src/components/VideoStream.tsx`

Find line 33:
```tsx
const YOUTUBE_VIDEO_ID = "dQw4w9WgXcQ"; // REPLACE THIS
```

Replace with your actual video ID:
```tsx
const YOUTUBE_VIDEO_ID = "YOUR_VIDEO_ID_HERE";
```

### **Step 9: Test**
1. Save the file
2. Refresh your game page
3. You should see your live stream!

---

## 🎮 OBS Settings for Best Quality

### **Video Settings**
```
Base Resolution: 1920x1080
Output Resolution: 1920x1080 (or 1280x720 for lower bandwidth)
FPS: 30 or 60
```

### **Output Settings**
```
Output Mode: Advanced
Encoder: x264 (or NVENC if you have NVIDIA GPU)
Rate Control: CBR
Bitrate: 4500 Kbps (1080p) or 2500 Kbps (720p)
Keyframe Interval: 2
Preset: veryfast (or faster if CPU struggles)
Profile: high
Tune: zerolatency
```

### **Audio Settings**
```
Sample Rate: 48 kHz
Channels: Stereo
Bitrate: 160 Kbps
```

---

## 🔧 Using Environment Variable (Recommended)

Instead of hardcoding the video ID, use an environment variable:

### **1. Create/Update .env file**
```bash
# .env (in root directory)
VITE_YOUTUBE_VIDEO_ID=dQw4w9WgXcQ
```

### **2. Update VideoStream.tsx**
```tsx
// Line 33
const YOUTUBE_VIDEO_ID = import.meta.env.VITE_YOUTUBE_VIDEO_ID || "dQw4w9WgXcQ";
```

### **3. Restart Dev Server**
```bash
npm run dev
```

**Benefits:**
- ✅ Easy to update (just edit .env file)
- ✅ No code changes needed
- ✅ Can use different IDs for dev/production

---

## 📱 URL Parameters Explained

Current iframe URL:
```
https://www.youtube.com/embed/VIDEO_ID?autoplay=1&mute=0&controls=0&modestbranding=1&rel=0
```

**Parameters:**
- `autoplay=1` - Starts playing automatically
- `mute=0` - Audio enabled (change to `1` to mute)
- `controls=0` - Hides player controls (change to `1` to show)
- `modestbranding=1` - Minimal YouTube branding
- `rel=0` - Don't show related videos at end

**Optional parameters you can add:**
- `&loop=1` - Loop the video
- `&start=10` - Start at 10 seconds
- `&end=60` - End at 60 seconds
- `&cc_load_policy=1` - Show captions
- `&iv_load_policy=3` - Hide annotations

---

## 🎯 Testing Checklist

- [ ] YouTube account created
- [ ] Live stream created in YouTube Studio
- [ ] Stream set to "Unlisted"
- [ ] "Ultra-low latency" enabled
- [ ] OBS configured with YouTube credentials
- [ ] Streaming started in OBS
- [ ] Stream shows as "Live" in YouTube Studio
- [ ] Video ID copied
- [ ] VideoStream.tsx updated with video ID
- [ ] Game page refreshed
- [ ] Stream visible in game
- [ ] Audio working
- [ ] Video quality good
- [ ] Latency acceptable (2-5 seconds)

---

## 🔄 Updating Video ID for Each Stream

Each time you start a new stream, the video ID changes. Here's how to update:

### **Method 1: Manual Update**
1. Start new stream in OBS
2. Get new video ID from YouTube Studio
3. Update line 33 in VideoStream.tsx
4. Save file (hot reload will update)

### **Method 2: Environment Variable**
1. Start new stream in OBS
2. Get new video ID
3. Update `.env` file
4. Restart dev server

### **Method 3: Admin Panel (Future Enhancement)**
Create an admin panel where you can paste the video ID without touching code.

---

## 🚨 Troubleshooting

### **"Video unavailable"**
- Check if stream is actually live in YouTube Studio
- Verify video ID is correct
- Check if video is set to "Unlisted" or "Public" (not "Private")

### **"Playback on other websites has been disabled"**
- This shouldn't happen with live streams
- If it does, check YouTube Studio settings
- Ensure "Allow embedding" is enabled

### **High latency (>10 seconds)**
- Enable "Ultra-low latency" in YouTube Studio
- Check OBS settings (use "zerolatency" tune)
- Reduce keyframe interval to 2 seconds

### **Stream keeps buffering**
- Lower bitrate in OBS (try 2500 Kbps)
- Check internet upload speed
- Reduce resolution to 720p

### **No audio**
- Check `mute=0` in iframe URL
- Verify audio is enabled in OBS
- Check browser audio permissions

---

## 📊 Comparison: Before vs After

### **Before (Restream)**
- ❌ Token expires
- ❌ Invalid token errors
- ❌ Complex setup
- ❌ API calls needed
- ❌ Database dependencies

### **After (YouTube)**
- ✅ No token issues
- ✅ Just video ID
- ✅ Simple setup (5 min)
- ✅ No API calls
- ✅ No dependencies
- ✅ FREE forever
- ✅ 2-5 second latency

---

## 🎉 You're Done!

Your live stream should now be working with:
- ✅ No token errors
- ✅ Simple setup
- ✅ Low latency (2-5 seconds)
- ✅ Free forever
- ✅ Reliable (YouTube infrastructure)

**Next time you stream:**
1. Start OBS
2. Get new video ID
3. Update VideoStream.tsx (or .env)
4. Done!

---

## 💡 Pro Tips

1. **Create a Dedicated Channel**
   - Make a separate YouTube channel just for streaming
   - Keeps your main channel clean

2. **Use Unlisted Streams**
   - Only people with the link can watch
   - Perfect for your app users

3. **Schedule Streams**
   - You can schedule streams in advance
   - Get a permanent video ID that works before going live

4. **Monitor Analytics**
   - YouTube Studio shows viewer count, watch time, etc.
   - Great for understanding your audience

5. **Save Recordings**
   - YouTube automatically records your streams
   - Can replay later or download

---

**Need help? Check the full guide:** `docs/EASY_LIVESTREAM_OPTIONS.md`
