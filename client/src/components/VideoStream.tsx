import { useState, useEffect, useRef } from "react";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import Hls from "hls.js";

interface VideoStreamProps {
  streamUrl?: string;
  streamType?: 'video' | 'embed' | 'rtmp';
  isLive?: boolean;
  viewerCount?: number;
  title?: string;
}

export function VideoStream({
  streamUrl = "/hero images/uhd_30fps.mp4",
  streamType = 'video',
  isLive = true,
  viewerCount = 1234,
  title = "Andar Bahar Live Game"
}: VideoStreamProps) {
  const [streamError, setStreamError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize HLS.js for RTMP streams
  useEffect(() => {
    if (streamType === 'rtmp' && streamUrl && videoRef.current) {
      const video = videoRef.current;
      
      // Convert RTMP URL to HLS URL
      // RTMP: rtmp://localhost:1935/live/streamKey
      // HLS: http://localhost:8000/live/streamKey.m3u8
      let hlsUrl = streamUrl;
      if (streamUrl.startsWith('rtmp://')) {
        hlsUrl = streamUrl
          .replace('rtmp://', 'http://')
          .replace(':1935', ':8000') + '.m3u8';
      } else if (streamUrl.startsWith('/stream/')) {
        // For production, use the current domain with proxy
        hlsUrl = window.location.origin + streamUrl;
      }
      
      console.log('🎥 Initializing HLS stream:', hlsUrl);
      
      if (Hls.isSupported()) {
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
        
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('✅ HLS manifest parsed successfully');
          video.play().catch(err => {
            console.error('Error playing video:', err);
            setStreamError(true);
          });
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('❌ HLS error:', event, data);
          if (data.fatal) {
            setStreamError(true);
          }
        });
        
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('✅ HLS media attached');
        });
        
        hls.on(Hls.Events.LEVEL_LOADED, () => {
          console.log('✅ HLS level loaded');
        });
        
        // Store HLS instance for cleanup
        (window as any).hlsInstance = hls;
        
        return () => {
          hls.destroy();
        };
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        console.log('🍎 Using native HLS support');
        video.src = hlsUrl;
        video.play().catch(err => {
          console.error('Error playing video:', err);
          setStreamError(true);
        });
      }
    }
  }, [streamType, streamUrl]);

  // Cleanup HLS instance on unmount
  useEffect(() => {
    return () => {
      if ((window as any).hlsInstance) {
        (window as any).hlsInstance.destroy();
        (window as any).hlsInstance = null;
      }
    };
  }, []);

  const renderStreamContent = () => {
    switch (streamType) {
      case 'video':
        return (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            onError={() => setStreamError(true)}
            data-testid="video-stream"
          >
            <source src={streamUrl} type="video/mp4" />
          </video>
        );
      case 'rtmp':
        return (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
            onError={() => setStreamError(true)}
            data-testid="rtmp-stream"
          />
        );
      case 'embed':
        if (streamUrl) {
          return (
            <iframe
              className="w-full h-full"
              src={streamUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              data-testid="embed-stream"
            />
          );
        }
        // Fall through to default if no embed URL
      default:
        return (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            <div className="text-center">
              <div className="text-6xl font-bold text-gold mb-4">A | B</div>
              <div className="text-xl text-gold">Andar Bahar</div>
              <div className="text-sm text-white/60 mt-2">Stream Starting Soon...</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
      {/* Video/Stream Content */}
      {renderStreamContent()}

      {/* Overlay Information - Matches Legacy Layout */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none">
        {/* Top Bar - Live Indicator and View Count */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          {/* Live Indicator - Legacy Style */}
          {isLive && (
            <div className="flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-full shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white font-semibold text-sm uppercase">LIVE</span>
            </div>
          )}

          {/* View Count - Legacy Style */}
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Eye className="w-4 h-4 text-gold" />
            <span className="text-white font-medium text-sm">
              {viewerCount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Bottom Bar - Game Title - Legacy Style */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-semibold text-lg md:text-xl drop-shadow-lg">
            {title}
          </h3>
        </div>
      </div>

      {/* Error State */}
      {streamError && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="text-red-500 text-4xl mb-2">⚠️</div>
            <div className="text-white">Stream unavailable</div>
            <div className="text-sm text-white/60 mt-1">Please try again later</div>
          </div>
        </div>
      )}
    </div>
  );
}
