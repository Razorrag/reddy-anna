const NodeMediaServer = require('node-media-server');
const express = require('express');
const path = require('path');
const os = require('os');

// ------------------
// FFmpeg path setup
// ------------------
const isWindows = os.platform() === 'win32';
const ffmpegPath = isWindows
  ? 'C:\\ffmpeg\\bin\\ffmpeg.exe' // adjust if on Windows
  : '/usr/bin/ffmpeg'; // VPS Linux

// ------------------
// NodeMediaServer config
// ------------------
const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
  },
  http: {
    port: 8000,
    mediaroot: path.join(__dirname, 'media'),
    allow_origin: '*',
  },
  trans: {
    ffmpeg: ffmpegPath,
    tasks: [
      {
        app: 'live',
        hls: true,
        // 🚀 ULTRA-LOW LATENCY CONFIG:
        // - 1s segments for smooth playback
        // - 6 segments in playlist = 6s cache (prevents 404s on pause/refresh)
        // - NO delete_segments = segments persist for smooth resume
        // - Target latency: 2-3s (0.5s GOP + 1.5-2s buffer)
        hlsFlags: '[hls_time=1:hls_list_size=6:hls_flags=independent_segments:hls_segment_type=mpegts]',
        vc: 'libx264',
        vcParam: [
          '-preset', 'ultrafast',
          '-tune', 'zerolatency',
          '-g', '15', // 🚀 CRITICAL: Keyframe every 15 frames (0.5s at 30fps) for ultra-low latency
          '-sc_threshold', '0', // Disable scene change detection for constant GOP
          '-r', '30', // Force 30fps
          '-c:v', 'libx264',
          '-b:v', '2500k', // Bitrate cap
          '-maxrate', '2500k',
          '-bufsize', '5000k'
        ],
        ac: 'aac',
        acParam: ['-ab', '128k', '-ac', '2', '-ar', '44100'],
        dash: false,
      },
    ],
  },
};

// ------------------
// Start NodeMediaServer
// ------------------
const nms = new NodeMediaServer(config);
nms.run();
console.log('✅ NodeMediaServer started with ULTRA-LOW LATENCY config!');
console.log('📊 Config: 0.5s GOP, 1s segments, 6-segment cache');
console.log('🎯 Target latency: 2-3 seconds');
console.log('RTMP URL: rtmp://89.42.231.35:1935/live');
console.log('HLS URL: http://89.42.231.35:8000/live/test/index.m3u8');

// ------------------
// Express server for HTML player
// ------------------
const app = express();

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Serve player.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'player.html'));
});

// 🚀 Serve media (HLS) files with CACHE HEADERS for segment persistence
app.use('/live', express.static(path.join(__dirname, 'media/live'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache'); // Playlist always fresh
    } else if (filePath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Cache-Control', 'public, max-age=10'); // 🚀 Cache segments for 10s
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', streaming: true, latencyMode: 'ultra-low' });
});

app.listen(3000, () => {
  console.log('✅ Player running at http://89.42.231.35:3000');
  console.log('✅ CORS enabled for cross-origin requests');
  console.log('✅ Segment caching enabled (10s TTL)');
});