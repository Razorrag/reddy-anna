/**
 * VideoStream Component - Direct OBS Streaming via HLS
 * 
 * Streams directly from OBS without third-party services
 * 
 * OBS Setup:
 * 1. Open OBS → Settings → Stream
 * 2. Service: Custom
 * 3. Server: rtmp://localhost:1935/live
 * 4. Stream Key: stream
 * 5. Click "Start Streaming"
 * 
 * The stream will automatically appear here via HLS
 */

import { Eye } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface VideoStreamProps {
  isLive?: boolean;
  viewerCount?: number;
  title?: string;
}

export function VideoStream({
  isLive = false,
  viewerCount = 0
}: VideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [streamError, setStreamError] = useState(false);
  const [streamLoading, setStreamLoading] = useState(true);

  // HLS stream URL from our RTMP server
  const HLS_URL = "http://localhost:8000/live/stream/index.m3u8";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check if HLS is supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(HLS_URL);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("✅ HLS stream loaded");
        setStreamLoading(false);
        setStreamError(false);
        video.play().catch(e => console.log("Autoplay prevented:", e));
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error("HLS Error:", data);
        if (data.fatal) {
          setStreamError(true);
          setStreamLoading(false);
          
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("Network error, retrying...");
              setTimeout(() => hls.loadSource(HLS_URL), 3000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("Media error, recovering...");
              hls.recoverMediaError();
              break;
            default:
              console.log("Fatal error, destroying HLS instance");
              hls.destroy();
              break;
          }
        }
      });

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
      };
    } 
    // For Safari (native HLS support)
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = HLS_URL;
      video.addEventListener('loadedmetadata', () => {
        setStreamLoading(false);
        setStreamError(false);
        video.play().catch(e => console.log("Autoplay prevented:", e));
      });
      video.addEventListener('error', () => {
        setStreamError(true);
        setStreamLoading(false);
      });
    }
  }, []);

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl video-stream-container">
      {/* HLS Video Player */}
      <video 
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        controls={false}
        autoPlay
        muted={false}
        playsInline
      />

      {/* Top Left - Live Badge */}
      {isLive && (
        <div className="absolute top-4 left-4 z-10">
          <div className="flex items-center gap-2 bg-red-600/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white font-bold text-xs uppercase tracking-wider">LIVE</span>
          </div>
        </div>
      )}

      {/* Top Right - View Count */}
      {viewerCount > 0 && (
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Eye className="w-3 h-3 text-red-400" />
            <span className="text-white text-xs font-medium">
              {viewerCount.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {streamLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-sm">Connecting to stream...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {streamError && !streamLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="text-center px-4">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <p className="text-white text-lg font-semibold mb-2">Stream Not Available</p>
            <p className="text-gray-400 text-sm mb-4">
              Make sure OBS is streaming to:<br />
              <code className="text-xs bg-gray-800 px-2 py-1 rounded">rtmp://localhost:1935/live</code>
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
