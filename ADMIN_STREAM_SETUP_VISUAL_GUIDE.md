# 🎥 **ADMIN STREAM SETUP - VISUAL GUIDE**

## **STEP-BY-STEP WITH SCREENSHOTS**

---

## **📍 STEP 1: ACCESS STREAM SETTINGS**

Navigate to: **`/admin-stream-settings-new`**

Or add this link to your admin dashboard:
```tsx
<button onClick={() => navigate('/admin-stream-settings-new')}>
  🎥 Stream Settings
</button>
```

---

## **📍 STEP 2: ADMIN INTERFACE OVERVIEW**

```
┌─────────────────────────────────────────────────────────────┐
│  🎥 Stream Settings                                         │
│  Configure your live stream URL - Simple and powerful      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  LEFT SIDE: Configuration          RIGHT SIDE: Preview     │
│  ┌──────────────────────┐         ┌──────────────────────┐│
│  │ Stream URL Input     │         │                      ││
│  │ [Enter URL here...]  │         │   LIVE PREVIEW       ││
│  │                      │         │                      ││
│  │ Stream Type          │         │   [Video shows       ││
│  │ [iFrame] [Video]     │         │    here after        ││
│  │                      │         │    clicking          ││
│  │ Stream Title         │         │    Preview]          ││
│  │ [Live Game Stream]   │         │                      ││
│  │                      │         │                      ││
│  │ ☑ Stream Active      │         └──────────────────────┘│
│  │                      │         Preview Info:           ││
│  │ [Save] [Preview]     │         • Type: IFRAME          ││
│  └──────────────────────┘         • Status: 🟢 Active     ││
│                                    • URL: ✅ Set           ││
│  Example URLs:                                             │
│  • YouTube Live                                            │
│  • Vimeo                                                   │
│  • Custom HLS                                              │
│  • MP4 Video                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## **📍 STEP 3: GET YOUR STREAM URL**

### **Option A: YouTube Live (Recommended)**

1. **Go to YouTube Studio**
   ```
   https://studio.youtube.com
   ```

2. **Click "Go Live"**
   - Select "Stream" option
   - Set up your stream

3. **Get Embed URL**
   - Go to your live video page
   - Click "Share" button
   - Click "Embed"
   - Copy the URL from iframe src:
   ```
   https://www.youtube.com/embed/YOUR_VIDEO_ID
   ```

4. **Paste in Stream URL field**

### **Option B: Custom Video File**

1. **Upload video to your server**
   ```
   https://yourserver.com/videos/game-stream.mp4
   ```

2. **Or use HLS stream**
   ```
   https://yourserver.com/stream/index.m3u8
   ```

3. **Paste direct URL in Stream URL field**

---

## **📍 STEP 4: CONFIGURE SETTINGS**

### **A. Stream URL**
```
┌────────────────────────────────────────────────┐
│ Stream URL *                                   │
│ ┌────────────────────────────────────────────┐ │
│ │ https://www.youtube.com/embed/YOUR_VIDEO  │ │
│ └────────────────────────────────────────────┘ │
│ Enter YouTube embed URL, Vimeo player URL,    │
│ or direct video URL                            │
└────────────────────────────────────────────────┘
```

### **B. Stream Type**
```
┌────────────────────────────────────────────────┐
│ Stream Type                                    │
│ ┌──────────────────┐  ┌──────────────────────┐│
│ │ ✓ iFrame         │  │   Video              ││
│ │ (YouTube, Vimeo) │  │   (MP4, HLS)         ││
│ └──────────────────┘  └──────────────────────┘│
└────────────────────────────────────────────────┘
```

### **C. Stream Title**
```
┌────────────────────────────────────────────────┐
│ Stream Title                                   │
│ ┌────────────────────────────────────────────┐ │
│ │ Live Game Stream                           │ │
│ └────────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

### **D. Video Options (for Video type only)**
```
┌────────────────────────────────────────────────┐
│ ☑ Autoplay                                     │
│ ☑ Muted by default                             │
│ ☐ Show controls                                │
└────────────────────────────────────────────────┘
```

### **E. Stream Status**
```
┌────────────────────────────────────────────────┐
│ ☑ Stream Active (Players can see it)          │
└────────────────────────────────────────────────┘
```

---

## **📍 STEP 5: PREVIEW YOUR STREAM**

Click the **"Preview"** button:

```
┌────────────────────────────────────────────────┐
│                                                │
│           LIVE PREVIEW                         │
│                                                │
│     [Your video plays here]                    │
│                                                │
│  This is exactly how players will see it       │
│                                                │
└────────────────────────────────────────────────┘

Preview Info:
• Stream Type: IFRAME
• Status: 🟢 Active
• URL Set: ✅
```

**If preview works → You're good to go!**

---

## **📍 STEP 6: SAVE SETTINGS**

Click **"Save Settings"** button:

```
┌────────────────────────────────────────────────┐
│  [💾 Save Settings]  [👁 Preview]              │
└────────────────────────────────────────────────┘
```

You'll see:
```
✅ Stream settings saved successfully!
```

---

## **📍 STEP 7: VERIFY ON PLAYER SIDE**

Open the player game page:

```
┌─────────────────────────────────────────────────┐
│  Balance: ₹150,000                              │
├─────────────────────────────────────────────────┤
│                                                 │
│                                                 │
│         YOUR FULL-SCREEN VIDEO                  │
│         PLAYING HERE                            │
│                                                 │
│              ┌──────────┐                       │
│              │  Timer   │  ← Countdown overlay  │
│              │   30s    │                       │
│              └──────────┘                       │
│                                                 │
│         Round 1 | Betting Phase                 │
│                                                 │
├─────────────────────────────────────────────────┤
│  [₹100] [₹500] [₹1000] [₹5000]                 │
│  [Andar] [Bahar]                                │
└─────────────────────────────────────────────────┘
```

**Video fills 65-70% of screen with overlays on top!**

---

## **🎯 QUICK REFERENCE:**

### **YouTube Embed URL Format:**
```
✅ CORRECT: https://www.youtube.com/embed/VIDEO_ID
❌ WRONG:   https://www.youtube.com/watch?v=VIDEO_ID
```

### **Stream Type Selection:**
```
iFrame:
  ✅ YouTube Live
  ✅ Vimeo
  ✅ Any embeddable player

Video:
  ✅ MP4 files
  ✅ HLS streams (.m3u8)
  ✅ Direct video URLs
```

### **Common Settings:**
```
YouTube Live:
  • Type: iFrame
  • Autoplay: N/A (handled by YouTube)
  • Muted: N/A (handled by YouTube)
  • Controls: N/A (handled by YouTube)

Custom Video:
  • Type: Video
  • Autoplay: ✅ Enabled
  • Muted: ✅ Enabled
  • Controls: ☐ Disabled (cleaner look)
```

---

## **🔧 TROUBLESHOOTING:**

### **Problem: "Stream not configured" message**
**Solution:**
1. Go to `/admin-stream-settings-new`
2. Enter stream URL
3. Enable "Stream Active"
4. Click "Save Settings"

### **Problem: Preview not showing**
**Solution:**
1. Check URL is correct
2. For YouTube: Use embed URL, not watch URL
3. Try clicking Preview again
4. Check browser console for errors

### **Problem: Video not full-screen**
**Solution:**
- This is automatic! Video fills entire video area
- If not working, check browser zoom level
- Try refreshing the page

### **Problem: YouTube embed blocked**
**Solution:**
1. Make sure video is public or unlisted
2. Check video allows embedding
3. Use the embed URL format

---

## **📊 EXAMPLE CONFIGURATIONS:**

### **Configuration 1: YouTube Live**
```
Stream URL: https://www.youtube.com/embed/dQw4w9WgXcQ
Stream Type: iFrame
Stream Title: Live Casino Game
Stream Active: ✅ Enabled
```

### **Configuration 2: Custom MP4**
```
Stream URL: https://myserver.com/game-stream.mp4
Stream Type: Video
Stream Title: Live Game Feed
Autoplay: ✅ Enabled
Muted: ✅ Enabled
Controls: ☐ Disabled
Stream Active: ✅ Enabled
```

### **Configuration 3: HLS Stream**
```
Stream URL: https://myserver.com/live/stream.m3u8
Stream Type: Video
Stream Title: Live Stream
Autoplay: ✅ Enabled
Muted: ✅ Enabled
Controls: ☐ Disabled
Stream Active: ✅ Enabled
```

---

## **✅ SUCCESS CHECKLIST:**

- [ ] Accessed `/admin-stream-settings-new`
- [ ] Entered stream URL
- [ ] Selected correct stream type
- [ ] Clicked "Preview" and video showed
- [ ] Enabled "Stream Active" checkbox
- [ ] Clicked "Save Settings"
- [ ] Saw success message
- [ ] Opened player game page
- [ ] Video showing full-screen
- [ ] Countdown timer overlaying correctly

---

## **🎉 YOU'RE DONE!**

Your stream is now configured and players can see it!

**To change stream:**
1. Go back to `/admin-stream-settings-new`
2. Update URL
3. Click "Save Settings"

**To disable stream:**
1. Go to `/admin-stream-settings-new`
2. Uncheck "Stream Active"
3. Click "Save Settings"

---

**Simple, powerful, and works everywhere!** 🚀
