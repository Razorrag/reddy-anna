# Fix NGINX Proxy Issues

## Current Problems

1. **502 Bad Gateway** - NGINX can't reach OvenMediaEngine at localhost:8080
2. **Server name conflict** - Another config already uses `rajugarikossu.com:443`

## Solution 1: Check if OvenMediaEngine is Running

First, fix the corrupted OME configuration:

```bash
cd /opt/ovenmediaengine

# Remove corrupted config
rm -f conf/Server.xml

# Create clean working config
cat > conf/Server.xml << 'XMLEOF'
<?xml version="1.0" encoding="UTF-8"?>
<Server version="8">
    <Name>OvenMediaEngine</Name>
    <Type>origin</Type>
    <IP>*</IP>

    <Bind>
        <Providers>
            <RTMP>
                <Port>1935</Port>
            </RTMP>
        </Providers>
        <Publishers>
            <LLHLS>
                <Port>8080</Port>
            </LLHLS>
        </Publishers>
    </Bind>

    <VirtualHosts>
        <VirtualHost>
            <Name>default</Name>

            <Host>
                <Names>
                    <Name>*</Name>
                </Names>
            </Host>

            <Applications>
                <Application>
                    <Name>live</Name>
                    <Type>live</Type>
                    <OutputProfiles>
                        <OutputProfile>
                            <Name>bypass</Name>
                            <OutputStreamName>${OriginStreamName}</OutputStreamName>        
                            <Encodes>
                                <Video>
                                    <Bypass>true</Bypass>
                                </Video>
                                <Audio>
                                    <Bypass>true</Bypass>
                                </Audio>
                            </Encodes>
                        </OutputProfile>
                    </OutputProfiles>
                    <Providers>
                        <RTMP/>
                    </Providers>
                    <Publishers>
                        <LLHLS>
                            <SegmentDuration>0.5</SegmentDuration>
                            <SegmentCount>3</SegmentCount>
                            <CrossDomains>
                                <Url>*</Url>
                            </CrossDomains>
                        </LLHLS>
                    </Publishers>
                </Application>
            </Applications>
        </VirtualHost>
    </VirtualHosts>
</Server>
XMLEOF

# Restart OME
docker-compose restart

# Wait a few seconds for it to start
sleep 5

# Check if it's running
docker ps | grep ovenmediaengine

# Check logs - should NOT have errors now
docker logs ovenmediaengine --tail 30

# Test if OME is responding on port 8080
curl http://localhost:8080/live/stream/llhls.m3u8
```

**Expected result**: You should see the .m3u8 playlist content, not a connection error.

## Solution 2: Fix NGINX Configuration Conflict

You have two options:

### Option A: Add to Existing Server Block (Recommended)

Find your existing `rajugarikossu.com` NGINX config and ADD the `/live/` location:

```bash
# Find existing config
grep -r "server_name rajugarikossu.com" /etc/nginx/sites-enabled/

# Edit that file and add this location block inside the existing server block:
```

```nginx
# Inside your existing server block for rajugarikossu.com:443
server {
    listen 443 ssl;
    http2 on;
    server_name rajugarikossu.com;
    
    # ... your existing SSL config ...
    
    # ADD THIS NEW LOCATION:
    location /live/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        
        # CORS for HLS
        add_header Access-Control-Allow-Origin *;
        
        # No buffering for low latency
        proxy_buffering off;
        proxy_cache off;
        
        # HLS content types
        types {
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
        }
    }
    
    # ... rest of your existing config ...
}
```

### Option B: Use Different Subdomain

If you want a separate config:

```bash
# Remove the conflicting symlink
rm /etc/nginx/sites-enabled/ome-ssl-proxy

# Create new config with different subdomain
cat > /etc/nginx/sites-available/ome-stream << 'NGINXEOF'
upstream ome_backend {
    server 127.0.0.1:8080;
    keepalive 32;
}

server {
    listen 443 ssl;
    http2 on;
    server_name stream.rajugarikossu.com;

    ssl_certificate /etc/letsencrypt/live/rajugarikossu.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rajugarikossu.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location /live/ {
        proxy_pass http://ome_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        
        add_header Access-Control-Allow-Origin *;
        proxy_buffering off;
        proxy_cache off;
        
        types {
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
        }
    }
}
NGINXEOF

# Enable it
ln -sf /etc/nginx/sites-available/ome-stream /etc/nginx/sites-enabled/

# Test and reload
nginx -t
systemctl reload nginx
```

**Note**: If using subdomain, you need to add DNS A record for `stream.rajugarikossu.com` pointing to `72.61.170.227`

## Solution 3: Test Everything

```bash
# 1. Test OME directly
curl http://localhost:8080/live/stream/llhls.m3u8

# 2. Test through NGINX (Option A - main domain)
curl https://rajugarikossu.com/live/stream/llhls.m3u8

# OR (Option B - subdomain)
curl https://stream.rajugarikossu.com/live/stream/llhls.m3u8

# 3. Check NGINX error logs if still 502
tail -f /var/log/nginx/error.log
```

## What URL to Use in Admin Panel?

- **Option A**: `https://rajugarikossu.com/live/stream/llhls.m3u8`
- **Option B**: `https://stream.rajugarikossu.com/live/stream/llhls.m3u8`

## Troubleshooting 502 Bad Gateway

If you still get 502:

```bash
# Check if OME is listening on 8080
netstat -tulpn | grep 8080

# Check OME logs
docker logs ovenmediaengine --tail 50

# Check if OBS is streaming
docker logs ovenmediaengine | grep "Rtmp Provider Info"

# Try restarting OBS stream if needed
```

The 502 error means NGINX can't reach OME, which suggests the OME container isn't running properly due to the corrupted XML config. Fix that first!