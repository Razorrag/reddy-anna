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
// NodeMediaServer config - VPS OPTIMIZED FOR ULTRA-LOW LATENCY
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
        // 🚀 VPS-OPTIMIZED ULTRA-LOW LATENCY CONFIG:
        // - 0.5s segments for instant delivery
        // - 10 segments in playlist = 5s VPS cache (prevents 404s)
        // - Independent segments for instant seeking
        // - Target latency: 1-2s (0.5s GOP + 0.5-1s buffer)
        hlsFlags: '[hls_time=0.5:hls_list_size=10:hls_flags=independent_segments+program_date_time:hls_segment_type=mpegts]',
        vc: 'libx264',
        vcParam: [
          '-preset', 'faster',        // Use VPS CPU power (faster than ultrafast quality)
          '-tune', 'zerolatency',     // Critical for low latency
          '-g', '15',                 // 🚀 CRITICAL: Keyframe every 15 frames (0.5s at 30fps)
          '-sc_threshold', '0',       // Disable scene change detection for constant GOP
          '-r', '30',                 // Force 30fps
          '-c:v', 'libx264',
          '-b:v', '4000k',            // 4Mbps - utilize VPS bandwidth
          '-maxrate', '4000k',
          '-bufsize', '8000k',        // 2x bitrate for smoother delivery
          '-threads', '4',            // Use 4 CPU threads (VPS can handle it)
          '-pix_fmt', 'yuv420p',      // Compatibility
        ],
        ac: 'aac',
        acParam: ['-ab', '160k', '-ac', '2', '-ar', '44100'],
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
console.log('✅ NodeMediaServer started with VPS-OPTIMIZED ULTRA-LOW LATENCY config!');
console.log('📊 Config: 0.5s GOP, 0.5s segments, 10-segment cache (5s VPS buffer)');
console.log('🎯 Target latency: 1-2 seconds');
console.log('💪 VPS-Powered: 4 CPU threads, 4Mbps bitrate, faster preset');
console.log('RTMP URL: rtmp://89.42.231.35:1935/live');
console.log('HLS URL: http://89.42.231.35:8000/live/test/index.m3u8');
console.log('Public URL (via nginx): https://rajugarikossu.com/live/test/index.m3u8');

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

// 🚀 Serve media (HLS) files with OPTIMIZED CACHE HEADERS for VPS
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
  res.json({ 
    status: 'ok', 
    streaming: true, 
    latencyMode: 'ultra-low-vps-optimized',
    config: {
      segmentDuration: '0.5s',
      playlistSize: 10,
      gopSize: '0.5s',
      bitrate: '4000k',
      cpuThreads: 4
    }
  });
});

app.listen(3000, () => {
  console.log('✅ Player running at http://89.42.231.35:3000');
  console.log('✅ CORS enabled for cross-origin requests');
  console.log('✅ Segment caching enabled (10s TTL)');
  console.log('✅ VPS optimization: faster preset, 4 threads, 4Mbps');
});