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
        // Stable low-latency HLS profile:
        // - hls_time=1            → 1s segments (good balance latency/stability)
        // - hls_list_size=4       → keep last 4s of content to absorb jitter
        // - delete_segments       → drop old segments so latency does not grow
        hlsFlags: '[hls_time=1:hls_list_size=4:hls_flags=delete_segments]',
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
console.log('RTMP URL: rtmp://91.108.110.72:1935/live');
console.log('HLS URL: http://91.108.110.72:8000/live/test/index.m3u8');

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
  console.log('✅ Player running at http://91.108.110.72:3000');
  console.log('✅ CORS enabled for cross-origin requests');
});
