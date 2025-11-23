# Final Stream URL Configuration

## Current Situation

Your NGINX config has `/ome/` proxy, but it's looking for a different path structure than what OME is providing.

## Debug Steps

```bash
# 1. Test OME directly (this worked before)
curl http://localhost:8080/live/stream/llhls.m3u8

# 2. Test through NGINX /ome/ path
curl https://rajugarikossu.com/ome/live/stream/llhls.m3u8

# 3. Check NGINX error log for details
tail -20 /var/log/nginx/reddy-anna-error.log
```

## The Issue

Your NGINX `/ome/` location does this:
```nginx
location /ome/ {
    proxy_pass http://127.0.0.1:8080/;  # Note the trailing slash
    # ...
}
```

When you request: `https://rajugarikossu.com/ome/live/stream/llhls.m3u8`

NGINX proxies to: `http://127.0.0.1:8080/live/stream/llhls.m3u8`

This should work! Let's verify OME is actually serving this.

## Verification Commands

```bash
# Is OME running?
docker ps | grep ovenmediaengine

# Is OME serving on 8080?
curl http://localhost:8080/live/stream/llhls.m3u8

# Check if there are any streams
docker logs ovenmediaengine | grep "stream has been created"

# Is OBS still streaming?
docker logs ovenmediaengine --tail 20 | grep "Rtmp Provider"
```

## Solution A: Use /live/ Path (Already Working!)

Your config already has `/live/` that proxies to NodeMediaServer on port 8000, but we can change it to proxy to OME on port 8080:

```bash
nano /etc/nginx/sites-available/reddy-anna.conf
```

Find this section (around line 98):
```nginx
location /live/ {
    proxy_pass http://127.0.0.1:8000/live/;  # OLD - NodeMediaServer
    # ...
}
```

Change to:
```nginx
location /live/ {
    proxy_pass http://127.0.0.1:8080/live/;  # NEW - OvenMediaEngine
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    
    add_header Access-Control-Allow-Origin "*" always;
    proxy_buffering off;
    proxy_cache off;
    
    types {
        application/vnd.apple.mpegurl m3u8;
        video/mp2t ts;
    }
}
```

Then:
```bash
nginx -t
systemctl reload nginx

# Test
curl https://rajugarikossu.com/live/stream/llhls.m3u8
```

## Solution B: Fix /ome/ Path

If you want to keep /ome/ for OME, the issue might be that OME isn't running or not streaming.

Check:
```bash
# Restart OBS stream
# Then check OME logs
docker logs ovenmediaengine --tail 30
```

## Admin Panel URL

After fixing, use:
- **Solution A**: `https://rajugarikossu.com/live/stream/llhls.m3u8`
- **Solution B**: `https://rajugarikossu.com/ome/live/stream/llhls.m3u8`

## Most Likely Issue

OBS might have stopped streaming. Check:
```bash
docker logs ovenmediaengine --tail 50 | grep "stream"
```

If you don't see recent "Rtmp Provider Info" messages, OBS isn't streaming. Restart OBS stream to OME.