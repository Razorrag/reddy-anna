# 🚀 OvenMediaEngine Ultra-Low Latency Streaming Guide

**Goal:** Achieve **sub-second (0.5-1s) latency** with zero stuttering

---

## 🎯 What is OvenMediaEngine (OME)?

**OvenMediaEngine** is an open-source streaming server that supports:
- ✅ **WebRTC** - 0.1-0.5s latency (real-time)
- ✅ **Low-Latency HLS (LL-HLS)** - 1-2s latency
- ✅ **SRT** - Sub-second latency
- ✅ **Built-in transcoding** (ABR - Adaptive Bitrate)
- ✅ **Scales to 100,000+ viewers**

---

## 📊 Latency Comparison

| Protocol | Current (nginx-rtmp + HLS) | OME (WebRTC) | OME (LL-HLS) |
|----------|---------------------------|--------------|--------------|
| **Latency** | 3-4 seconds | **0.3-0.5s** ⚡ | **1-2s** |
| **Stuttering** | Eliminated (balanced) | None | None |
| **Scalability** | Excellent (CDN) | Good (100k+) | Excellent (CDN) |
| **Browser Support** | 100% | 95% (modern) | 100% |
| **Setup Complexity** | Simple | Medium | Medium |
| **Server Load** | Low | Medium | Low |

---

## 🏗️ Complete Architecture

### **Current Setup (nginx-rtmp + HLS):**
```
OBS → RTMP → nginx-rtmp → FFmpeg → HLS segments → nginx cache → Browser (HLS.js)
Latency: 3-4 seconds
```

### **Proposed Setup (OvenMediaEngine):**

#### **Option 1: WebRTC (0.3-0.5s latency) ⚡**
```
OBS → RTMP/SRT → OvenMediaEngine → WebRTC → Browser (native WebRTC)
Latency: 0.3-0.5 seconds ✅
```

#### **Option 2: LL-HLS (1-2s latency) 🎯**
```
OBS → RTMP/SRT → OvenMediaEngine → LL-HLS → Browser (HLS.js with LL-HLS)
Latency: 1-2 seconds ✅
```

---

## 💰 Cost Analysis

### **Current Setup:**
```
VPS (nginx-rtmp): $20-50/month
Bandwidth: $0.05-0.10/GB
Total: ~$50-100/month (for moderate traffic)
```

### **OvenMediaEngine Setup:**
```
VPS (OME): $40-80/month (needs more CPU for transcoding)
Bandwidth: $0.05-0.10/GB (same)
Total: ~$70-150/month

OR

OvenMediaEngine Cloud (Managed): $0.10-0.20/GB outbound
Easier setup, scales automatically
```

---

## 🚀 Implementation Plan

### **Phase 1: Setup OvenMediaEngine Server**

#### **Step 1: Install OME on VPS**

```bash
# Ubuntu/Debian installation
curl -fsSL https://repo.airensoft.com/public.key | sudo apt-key add -
echo "deb https://repo.airensoft.com/apt focal main" | sudo tee /etc/apt/sources.list.d/airensoft.list
sudo apt update
sudo apt install ovenmediaengine
```

#### **Step 2: Configure OME for Low Latency**

Create `/etc/ovenmediaengine/Server.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Server version="8">
    <Bind>
        <!-- WebRTC Signaling -->
        <Providers>
            <RTMP>
                <Port>1935</Port>
            </RTMP>
            <SRT>
                <Port>9999</Port>
            </SRT>
            <WebRTC>
                <Signalling>
                    <Port>3333</Port>
                </Signalling>
            </WebRTC>
        </Providers>
        
        <!-- WebRTC Streaming -->
        <Publishers>
            <WebRTC>
                <Signalling>
                    <Port>3334</Port>
                    <TLSPort>3335</TLSPort>
                </Signalling>
            </WebRTC>
            <LLHLS>
                <Port>3336</Port>
            </LLHLS>
        </Publishers>
    </Bind>

    <VirtualHosts>
        <VirtualHost>
            <Name>default</Name>
            
            <!-- Applications -->
            <Applications>
                <Application>
                    <Name>live</Name>
                    <Type>live</Type>
                    
                    <!-- Providers (Input) -->
                    <Providers>
                        <RTMP/>
                        <SRT/>
                        <WebRTC/>
                    </Providers>
                    
                    <!-- Publishers (Output) -->
                    <Publishers>
                        <WebRTC>
                            <Timeout>30000</Timeout>
                        </WebRTC>
                        <LLHLS>
                            <ChunkDuration>0.5</ChunkDuration>
                            <SegmentDuration>3</SegmentDuration>
                            <SegmentCount>10</SegmentCount>
                            <CrossDomains>
                                <Url>*</Url>
                            </CrossDomains>
                        </LLHLS>
                    </Publishers>
                    
                    <!-- Encoding for ABR -->
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
                        
                        <!-- HD Quality -->
                        <OutputProfile>
                            <Name>720p</Name>
                            <OutputStreamName>${OriginStreamName}_720p</OutputStreamName>
                            <Encodes>
                                <Video>
                                    <Codec>h264</Codec>
                                    <Width>1280</Width>
                                    <Height>720</Height>
                                    <Bitrate>2500000</Bitrate>
                                    <Framerate>30</Framerate>
                                    <Preset>faster</Preset>
                                </Video>
                                <Audio>
                                    <Codec>opus</Codec>
                                    <Bitrate>128000</Bitrate>
                                    <Samplerate>48000</Samplerate>
                                    <Channel>2</Channel>
                                </Audio>
                            </Encodes>
                        </OutputProfile>
                    </OutputProfiles>
                </Application>
            </Applications>
        </VirtualHost>
    </VirtualHosts>
</Server>
```

#### **Step 3: Start OME**

```bash
sudo systemctl start ovenmediaengine
sudo systemctl enable ovenmediaengine
sudo systemctl status ovenmediaengine
```

---

### **Phase 2: Configure OBS to Stream to OME**

#### **OBS Settings for Ultra-Low Latency:**

**Stream Settings:**
```
Service: Custom
Server: rtmp://your-vps-ip:1935/live
Stream Key: game_stream
```

**Output Settings:**
```
Encoder: x264 (or NVENC if available)
Rate Control: CBR
Bitrate: 2500 kbps
Keyframe Interval: 1 second (CRITICAL for low latency)
Preset: veryfast (or faster)
Profile: main
Tune: zerolatency ← IMPORTANT!
```

**Advanced Settings:**
```
Process Priority: High
Color Format: NV12
Color Space: 709
Color Range: Partial
```

---

### **Phase 3: Update Frontend to Use WebRTC**

#### **Option A: WebRTC Player (0.3-0.5s latency)**

Install WebRTC player library:
```bash
npm install @airensoft/ovenplayer
```

Update `VideoArea.tsx`:

```typescript
import OvenPlayer from '@airensoft/ovenplayer';

// Replace HLS.js setup with OvenPlayer
useEffect(() => {
  const videoElement = videoRef.current;
  if (!videoElement) return;

  const player = OvenPlayer.create(videoElement, {
    sources: [
      {
        type: 'webrtc',
        file: 'wss://your-vps-ip:3335/live/game_stream'
      },
      {
        type: 'llhls', // Fallback for older browsers
        file: 'https://your-vps-ip:3336/live/game_stream/llhls.m3u8'
      }
    ],
    autoStart: true,
    mute: true,
    controls: false,
    loop: false,
  });

  return () => player.remove();
}, [streamConfig]);
```

#### **Option B: LL-HLS Player (1-2s latency)**

Use HLS.js with LL-HLS support:

```typescript
import Hls from 'hls.js';

const hls = new Hls({
  // LL-HLS specific settings
  lowLatencyMode: true,
  liveSyncDuration: 1,
  liveMaxLatencyDuration: 2,
  maxLiveSyncPlaybackRate: 1.5,
  
  // Optimized for LL-HLS
  maxBufferLength: 3,
  maxMaxBufferLength: 5,
  backBufferLength: 2,
});

hls.loadSource('https://your-vps-ip:3336/live/game_stream/llhls.m3u8');
```

---

## 🎯 Expected Results with OME

### **WebRTC Mode:**

```
OBS → OME → Browser
Total Latency: 0.3-0.5 seconds ⚡⚡⚡

Breakdown:
- OBS encoding: 0.1-0.2s
- Network transfer: 0.05-0.1s
- OME processing: 0.05-0.1s
- WebRTC playback: 0.05-0.1s
────────────────────────
Total: 0.3-0.5s
```

### **LL-HLS Mode:**

```
OBS → OME → Browser
Total Latency: 1-2 seconds ⚡⚡

Breakdown:
- OBS encoding: 0.2-0.3s
- Network transfer: 0.1-0.2s
- OME segmentation: 0.5s (0.5s chunks)
- Browser buffer: 0.5-1s
────────────────────────
Total: 1-2s
```

---

## ⚖️ Decision Matrix

### **Which Protocol to Use?**

| Use Case | Best Protocol | Latency | Complexity |
|----------|--------------|---------|------------|
| **Highest priority: Sub-second latency** | WebRTC | 0.3-0.5s | Medium |
| **Balance: Low latency + reliability** | LL-HLS | 1-2s | Low |
| **Maximum compatibility** | LL-HLS | 1-2s | Low |
| **Legacy browser support needed** | LL-HLS | 1-2s | Low |

### **Recommendation: Hybrid Approach**

```typescript
// Try WebRTC first, fallback to LL-HLS
const player = OvenPlayer.create(videoElement, {
  sources: [
    {
      type: 'webrtc',
      file: 'wss://your-vps:3335/live/game_stream',
      label: 'WebRTC (0.5s)'
    },
    {
      type: 'llhls',
      file: 'https://your-vps:3336/live/game_stream/llhls.m3u8',
      label: 'LL-HLS (1-2s)'
    },
    {
      type: 'hls',
      file: 'https://your-vps/live/game_stream.m3u8',
      label: 'HLS (3-4s)'
    }
  ],
  autoFallback: true // Automatically fallback if WebRTC fails
});
```

---

## 📋 Migration Checklist

### **Preparation (Week 1):**
- [ ] Provision new VPS (4 CPU, 8GB RAM minimum)
- [ ] Install OvenMediaEngine
- [ ] Configure OME with above settings
- [ ] Test with OBS streaming

### **Testing (Week 2):**
- [ ] Stream to OME from OBS
- [ ] Verify WebRTC playback in browser
- [ ] Test LL-HLS fallback
- [ ] Measure actual latency with clock test
- [ ] Load test with multiple viewers

### **Frontend Integration (Week 3):**
- [ ] Install OvenPlayer or update HLS.js
- [ ] Implement WebRTC player component
- [ ] Add LL-HLS fallback
- [ ] Test pause/resume functionality
- [ ] Verify mobile compatibility

### **Deployment (Week 4):**
- [ ] Run parallel with existing setup
- [ ] A/B test with real users
- [ ] Monitor performance and latency
- [ ] Gradually migrate traffic
- [ ] Decommission old nginx-rtmp setup

---

## 💡 Pro Tips

### **1. Optimize OBS for OME:**

```
Use SRT instead of RTMP for even lower latency:
Server: srt://your-vps-ip:9999
Stream Key: live/game_stream

SRT benefits:
- Lower latency than RTMP
- Better error recovery
- Built-in encryption
```

### **2. CDN Integration:**

For scaling to 10,000+ viewers:
```
OME → CloudFlare Stream (WebRTC)
or
OME → AWS CloudFront (LL-HLS)

This offloads streaming to CDN edge servers
```

### **3. Adaptive Bitrate (ABR):**

OME can transcode to multiple qualities:
```xml
<OutputProfiles>
  <OutputProfile><Name>1080p</Name></OutputProfile>
  <OutputProfile><Name>720p</Name></OutputProfile>
  <OutputProfile><Name>480p</Name></OutputProfile>
</OutputProfiles>
```

Users automatically get best quality for their connection.

---

## 🚨 Potential Challenges

### **Challenge 1: WebRTC doesn't work behind some firewalls**
**Solution:** Always provide LL-HLS fallback

### **Challenge 2: Higher server CPU usage**
**Solution:** Use hardware encoding (NVENC in OBS), disable transcoding if source quality is good

### **Challenge 3: HTTPS/WSS required for WebRTC**
**Solution:** Use Let's Encrypt SSL certificate, configure nginx reverse proxy

### **Challenge 4: Mobile data usage**
**Solution:** Implement ABR (adaptive bitrate), users on slow connections get lower quality

---

## 📊 ROI Analysis

### **Benefits of Migration:**

| Aspect | Current (HLS) | OME (WebRTC) | Improvement |
|--------|--------------|--------------|-------------|
| **Latency** | 3-4s | 0.3-0.5s | **85% reduction** ⚡ |
| **User Perception** | "Good enough" | "Real-time!" | Wow factor |
| **Competitive Edge** | Standard | Industry-leading | Differentiation |
| **Betting Accuracy** | Timer at 26-27s | Timer at 29-29.5s | More time to bet |

### **Costs:**

```
Setup Time: 2-4 weeks (one-time)
Additional Server Cost: +$20-50/month
Development Time: 40-60 hours
Learning Curve: Medium

Total Investment: ~$2000-3000 (including dev time)
Ongoing: +$20-50/month
```

### **Is it Worth It?**

**YES, if:**
- You want to be the fastest betting platform
- Sub-second latency is a competitive advantage
- You're planning to scale significantly
- You want "real-time" as a marketing feature

**MAYBE, if:**
- Current 3-4s latency is working fine
- Budget is tight
- Technical resources limited
- Users haven't complained about delay

**NO, if:**
- Current setup is smooth and stable
- Resources better spent elsewhere
- 3-4s latency is acceptable for your market

---

## ✅ Conclusion

### **Current Status:**
Your stream has **3-4s latency with zero stuttering** using balanced HLS configuration. This is actually quite good and industry-standard.

### **With OvenMediaEngine:**
You can achieve **0.3-0.5s latency (WebRTC)** or **1-2s latency (LL-HLS)** while maintaining smooth playback.

### **Recommendation:**

**Short-term (Now):**
- ✅ Keep current balanced HLS setup (it's working well)
- ✅ Focus on other features and user experience
- ✅ Monitor user feedback about latency

**Long-term (3-6 months):**
- 🎯 Plan OME migration if latency becomes competitive issue
- 🎯 Start with LL-HLS (easier, 1-2s latency)
- 🎯 Add WebRTC later for ultra-low latency

**The truth:** Most users won't notice the difference between 3-4s and 1-2s in a betting context. But 0.5s feels truly "live" and can be a strong marketing point!

---

**Next Steps:**
1. Test current setup with real users
2. Gather feedback on latency perception
3. Decide if investment in OME is worth it
4. If yes, follow migration checklist above

**Need help with implementation? I can provide detailed code for each step!**