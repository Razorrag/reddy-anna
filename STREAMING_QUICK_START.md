# 🚀 Streaming Quick Start

## 3-Step Setup

### 1️⃣ Configure Backend Settings
```
http://localhost:5000/backend-settings
```
- Enter RTMP URL: `rtmp://live.restream.io/live`
- Enter Stream Key: `re_XXXXX_XXXXX` (from Restream.io)
- Click **Save Settings**

### 2️⃣ Configure OBS
```
Settings → Stream
```
- Service: **Custom**
- Server: Your RTMP URL
- Stream Key: Your Stream Key
- Click **Apply** → **OK**

### 3️⃣ Start Streaming
```
OBS: Click "Start Streaming"
Browser: Open http://localhost:5000/game
```
- Stream appears automatically!
- Auto-refreshes every 30 seconds

---

## 🎯 How It Works

```
Backend Settings (/backend-settings)
    ↓
Save RTMP URL + Stream Key to Database
    ↓
OBS Streams to RTMP URL
    ↓
Player Page (/game) Fetches Settings
    ↓
Displays Stream using Restream Player
```

---

## 📋 What You Need

1. **Restream.io Account** (free)
   - Get RTMP URL + Stream Key
   
2. **OBS Studio** (free)
   - Configure with your RTMP settings
   
3. **This Application**
   - Backend settings page to save credentials
   - Player page to display stream

---

## ✅ Verification Checklist

- [ ] RTMP URL saved in backend settings
- [ ] Stream Key saved in backend settings
- [ ] OBS configured with same credentials
- [ ] OBS shows "Streaming" (green button)
- [ ] Player page shows stream or "offline" message
- [ ] Stream status shows "LIVE" when streaming

---

## 🔧 Troubleshooting

**Stream not showing?**
→ Wait 10-15 seconds after starting OBS
→ Refresh browser page
→ Check OBS is actually streaming

**"Not Configured" message?**
→ Go to `/backend-settings`
→ Enter RTMP URL and Stream Key
→ Click Save

**OBS connection failed?**
→ Use IP address: `rtmp://127.0.0.1:1935/live`
→ Check firewall settings

---

## 📊 Simple Architecture

```
┌─────────────────┐
│  OBS Studio     │ Streams to RTMP URL
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Restream.io    │ RTMP Server
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Player Page    │ Displays using Stream Key
└─────────────────┘
```

**Database stores:**
- RTMP URL
- Stream Key
- Stream Title
- Stream Status

**That's it!** No HLS, no embed tokens, no complexity.
