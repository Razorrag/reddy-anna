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
        // OPTIMIZED: 1s segments x 6 in playlist = 6s cache (prevents 404s on pause/refresh)
        // NO delete_segments = segments persist for smooth resume
        // Target latency: 2-3s (1s GOP + 1-2s buffer)
        hlsFlags: '[hls_time=1:hls_list_size=6:hls_flags=independent_segments:hls_segment_type=mpegts]',
        vc: 'libx264',
        vcParam: [
          '-preset', 'ultrafast',
          '-tune', 'zerolatency',
          '-g', '30', // Force keyframe every 30 frames (1s at 30fps)
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
console.log('✅ NodeMediaServer started!');
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

// Serve media (HLS) files with proper MIME types
app.use('/live', express.static(path.join(__dirname, 'media/live'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (path.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', streaming: true });
});

app.listen(3000, () => {
  console.log('✅ Player running at http://89.42.231.35:3000');
  console.log('✅ CORS enabled for cross-origin requests');
});