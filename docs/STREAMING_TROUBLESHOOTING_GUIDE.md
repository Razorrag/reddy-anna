# Streaming Troubleshooting Guide

## Issues Fixed

### 1. Missing stream_settings Table
**Problem**: `Error: Could not find the table 'public.stream_settings' in the schema cache`

**Solution**: Created migration script to add the missing table:
```sql
-- File: db/migrations/create_stream_settings_table.sql
CREATE TABLE IF NOT EXISTS stream_settings (
    id serial PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. HLS Stream Not Accessible
**Problem**: HLS manifest parsing error - `no EXTM3U delimiter`

**Root Causes & Solutions**:

#### A. Missing HLS Files
- RTMP stream was being received but HLS files weren't being generated properly
- Solution: Enhanced RTMP server configuration and HLS file serving

#### B. CORS Issues
- HLS requests blocked by CORS policy
- Solution: Added proper CORS headers for HLS endpoints

#### C. Port Configuration
- HLS serving on port 8000 but frontend trying to access from port 5000
- Solution: Added proxy endpoint to serve HLS streams through main port

### 3. Frontend Build Issues
**Problem**: Build process failing due to missing PostCSS config

**Solution**: Verified PostCSS config exists in client directory and build script works correctly

## Configuration Changes Made

### Server Side (server/index.ts)

1. **Enhanced HLS Serving**:
```typescript
// Serve HLS stream files through main port with proper headers
app.use('/stream', express.static(path.join(process.cwd(), 'media'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length');
    }
    // ... similar for .ts files
  }
}));

// Proxy HLS streams from port 8000 to main port 5000
app.use('/stream-live', async (req, res) => {
  // Proxy logic to forward requests from main port to HLS port
});
```

2. **Stream Status Endpoint**:
```typescript
app.get('/api/game/stream-status', (req, res) => {
  const status = getStreamStatus();
  res.json({
    success: true,
    streamStatus: status.isLive ? 'live' : 'offline',
    streamPath: status.streamPath,
    hlsUrl: status.isLive ? '/stream/live/stream.m3u8' : null,
    viewers: 0
  });
});
```

### Client Side (client/src/components/VideoStream.tsx)

1. **Enhanced HLS.js Configuration**:
```typescript
const hls = new Hls({
  enableWorker: true,
  lowLatencyMode: true,
  backBufferLength: 90,
  debug: true,
  maxBufferLength: 30,
  maxMaxBufferLength: 600,
  maxBufferSize: 60 * 1000 * 1000,
  maxBufferHole: 0.5
});
```

2. **Improved URL Handling**:
```typescript
let hlsUrl = streamUrl;
if (streamUrl.startsWith('rtmp://')) {
  hlsUrl = streamUrl
    .replace('rtmp://', 'http://')
    .replace(':1935', ':8000') + '.m3u8';
} else if (streamUrl.startsWith('/stream/')) {
  // For production, use the current domain with proxy
  hlsUrl = window.location.origin + streamUrl;
}
```

3. **Enhanced Debugging**:
```typescript
hls.on(Hls.Events.MANIFEST_PARSED, () => {
  console.log('✅ HLS manifest parsed successfully');
});

hls.on(Hls.Events.ERROR, (event, data) => {
  console.error('❌ HLS error:', event, data);
});
```

## Testing Checklist

### 1. Database Setup
- [ ] Run stream_settings table migration
- [ ] Verify table exists in Supabase
- [ ] Test stream settings API endpoints

### 2. RTMP Server
- [ ] Verify RTMP server is running on port 1935
- [ ] Test RTMP stream ingestion
- [ ] Check HLS file generation in media directory

### 3. HLS Serving
- [ ] Test direct HLS access: `http://localhost:8000/stream/live/stream.m3u8`
- [ ] Test proxied HLS access: `http://localhost:5000/stream/live/stream.m3u8`
- [ ] Verify CORS headers are present

### 4. Frontend
- [ ] Test HLS.js initialization
- [ ] Verify stream URL construction
- [ ] Check browser console for HLS errors
- [ ] Test video playback in different browsers

### 5. Production Deployment
- [ ] Update environment variables
- [ ] Test streaming on production VPS
- [ ] Verify firewall allows ports 1935, 8000, 5000
- [ ] Test with external streaming software (OBS)

## Common Issues & Solutions

### Issue: "HLS manifest parsing error - no EXTM3U delimiter"
**Causes**:
1. HLS file doesn't exist or is empty
2. HLS file has incorrect permissions
3. RTMP stream not being received

**Solutions**:
1. Check if HLS files are being generated in media directory
2. Verify RTMP stream is active
3. Check HLS file content starts with `#EXTM3U`

### Issue: "CORS policy: No 'Access-Control-Allow-Origin' header"
**Causes**:
1. CORS headers missing on HLS endpoints
2. Request from different domain/port

**Solutions**:
1. Ensure CORS headers are set on `/stream` endpoints
2. Use proxy endpoint `/stream-live` for cross-origin requests

### Issue: "Stream not found or unavailable"
**Causes**:
1. RTMP server not running
2. No active stream
3. Incorrect stream key

**Solutions**:
1. Check RTMP server logs
2. Verify stream is being pushed to correct endpoint
3. Use correct RTMP URL: `rtmp://server:1935/live/stream`

## Production Deployment Notes

1. **Firewall Configuration**:
   - Open port 1935 for RTMP ingestion
   - Open port 8000 for HLS serving (internal)
   - Open port 5000 for main application

2. **Environment Variables**:
   ```
   NODE_ENV=production
   CORS_ORIGIN=https://yourdomain.com
   PORT=5000
   ```

3. **SSL/HTTPS**:
   - Use HTTPS for main application
   - RTMP can remain HTTP
   - HLS will be served over HTTPS through proxy

4. **Monitoring**:
   - Monitor RTMP server logs
   - Check HLS file generation
   - Monitor video playback metrics

## Next Steps

1. **Test with OBS**: Set up OBS to stream to RTMP endpoint
2. **Monitor Performance**: Check video latency and quality
3. **Add Analytics**: Implement viewer counting and stream metrics
4. **Add Fallbacks**: Implement backup stream sources
5. **Security**: Add stream authentication and rate limiting
