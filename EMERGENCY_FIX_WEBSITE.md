# Emergency Fix: Website Broken by NGINX Config Conflict

## Problem

The `ome-ssl-proxy` config file created a duplicate `server` block for `rajugarikossu.com:443`, which conflicts with your existing `reddy-anna.conf` config. This broke the website.

## Quick Fix - Remove Conflicting Config

```bash
cd /etc/nginx/sites-enabled

# Remove the conflicting ome-ssl-proxy
rm ome-ssl-proxy

# Test NGINX config
nginx -t

# Reload NGINX to restore website
systemctl reload nginx

# Verify website is back
curl -I https://rajugarikossu.com
```

## Correct Solution - Add to Existing Config

Instead of creating a separate server block, we need to ADD the `/live/` location to your existing `reddy-anna.conf`:

```bash
# Edit your existing config
nano /etc/nginx/sites-available/reddy-anna.conf

# Find the server block for rajugarikossu.com:443
# Add this location block INSIDE that server block:

    location /live/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        
        add_header Access-Control-Allow-Origin *;
        proxy_buffering off;
        proxy_cache off;
        
        types {
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
        }
    }

# Save and test
nginx -t
systemctl reload nginx
```

## Verification

```bash
# Website should be back
curl -I https://rajugarikossu.com

# Stream should be accessible
curl https://rajugarikossu.com/live/stream/llhls.m3u8
```

## Why This Happened

You already had a server block in `reddy-anna.conf` listening on port 443 for `rajugarikossu.com`. Creating a second server block with the same `server_name` and port caused a conflict.

NGINX warned you: `conflicting server name "rajugarikossu.com" on 0.0.0.0:443, ignored`

## Correct Approach

**Don't create a new server block.** Instead, add the `/live/` location to your existing server block in `reddy-anna.conf`.

This way:
- Website continues to work (all existing locations)
- Stream becomes accessible at `/live/` path
- No conflicts