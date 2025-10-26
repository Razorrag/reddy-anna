# 🚀 OBS Quick Start - 3 Steps

Stream directly from OBS to your app in 3 simple steps!

## Step 1: Install FFmpeg

### Windows
1. Download: https://www.gyan.dev/ffmpeg/builds/
2. Extract to `C:\ffmpeg`
3. Add to `.env`: `FFMPEG_PATH=C:/ffmpeg/bin/ffmpeg.exe`

### macOS
```bash
brew install ffmpeg
```

### Linux
```bash
sudo apt install ffmpeg
```

## Step 2: Configure OBS

Open OBS → Settings → Stream:

- **Service**: Custom
- **Server**: `rtmp://localhost:1935/live`
- **Stream Key**: `stream`

Click **OK**

## Step 3: Start Streaming

1. Start your server:
   ```bash
   npm run dev
   ```

2. Click **Start Streaming** in OBS

3. Open your app: `http://localhost:5173`

**Done!** Your stream should appear in 2-5 seconds.

---

## Troubleshooting

### Stream not appearing?

1. **Check FFmpeg**: Run `ffmpeg -version`
2. **Check server logs**: Look for "🔴 STREAM STARTED"
3. **Check OBS**: Make sure it says "Live" (not "Connecting...")

### Still not working?

See full guide: `docs/DIRECT_OBS_STREAMING_SETUP.md`

---

## What You Get

✅ No third-party services (YouTube, Twitch, etc.)
✅ 2-5 second latency
✅ Unlimited viewers
✅ Full control
✅ Free forever

Your stream: **OBS → Your Server → Your App**
