# NGINX SSL Proxy Solution for OvenMediaEngine

## Problem
OvenMediaEngine doesn't support TLS configuration in the XML format we've tried. Multiple attempts resulted in configuration errors.

## Better Solution: Use NGINX as SSL Termination Proxy

Instead of configuring TLS in OvenMediaEngine, use NGINX (already running on your server with valid SSL) to proxy HTTPS requests to OME's HTTP port.

## Step 1: Fix OME Configuration (Remove TLS)

Replace `/opt/ovenmediaengine/conf/Server.xml` with working HTTP-only config:

```bash
cd /opt/ovenmediaengine
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

# Verify it's working
docker logs ovenmediaengine --tail 20
curl http://localhost:8080/live/stream/llhls.m3u8
```

## Step 2: Add NGINX SSL Proxy Configuration

Create `/etc/nginx/sites-available/ome-ssl-proxy`:

```nginx
# OvenMediaEngine HTTPS Proxy
upstream ome_backend {
    server 127.0.0.1:8080;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name rajugarikossu.com;

    # SSL certificates (already exist)
    ssl_certificate /etc/letsencrypt/live/rajugarikossu.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rajugarikossu.com/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # LL-HLS streaming endpoint
    location /live/ {
        proxy_pass http://ome_backend;
        proxy_http_version 1.1;
        
        # Keep connections alive
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers for HLS
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type";
        
        # Disable buffering for low latency
        proxy_buffering off;
        proxy_cache off;
        
        # Important for .m3u8 and .ts files
        types {
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
        }
    }
}
```

## Step 3: Enable and Test

```bash
# Enable the configuration
ln -s /etc/nginx/sites-available/ome-ssl-proxy /etc/nginx/sites-enabled/

# Test NGINX config
nginx -t

# Reload NGINX
systemctl reload nginx

# Test HTTPS stream
curl https://rajugarikossu.com/live/stream/llhls.m3u8
```

## Step 4: Update Admin Panel Stream URL

In your admin panel, change stream URL from:
- ❌ `http://72.61.170.227:8080/live/stream/llhls.m3u8`

To:
- ✅ `https://rajugarikossu.com/live/stream/llhls.m3u8`

## Why This is Better

1. **No OME TLS Configuration Needed** - OME runs HTTP only on localhost
2. **NGINX Handles SSL** - Uses your existing valid certificates
3. **Standard Port 443** - No need to open port 8443
4. **Better Performance** - NGINX is optimized for proxying
5. **Easier to Maintain** - Familiar NGINX configuration
6. **Already Working** - Your NGINX + SSL setup is proven to work

## Flow

```
Frontend (HTTPS) 
  ↓
NGINX :443 (SSL termination)
  ↓
OvenMediaEngine :8080 (HTTP, localhost only)
  ↓
Stream delivered
```

## Verification Steps

1. OME starts without errors: `docker logs ovenmediaengine`
2. HTTP stream works locally: `curl http://localhost:8080/live/stream/llhls.m3u8`
3. HTTPS stream works externally: `curl https://rajugarikossu.com/live/stream/llhls.m3u8`
4. Frontend loads stream without mixed content errors
5. Video displays with LIVE badge

This approach uses standard, well-documented technology instead of fighting with OME's TLS configuration.