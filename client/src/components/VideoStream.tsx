import { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoStreamProps {
  streamUrl?: string;
  streamType?: 'video' | 'embed' | 'rtmp';
  isLive?: boolean;
  viewerCount?: number;
  title?: string;
}

export function VideoStream({ 
  streamUrl, 
  streamType = 'video',
  isLive = true,
  viewerCount = 1234,
  title = "Andar Bahar"
}: VideoStreamProps) {
  const [streamError, setStreamError] = useState(false);
  
  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
      {/* Video/Stream Content */}
      {streamType === 'video' && streamUrl ? (
        <video
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
      ) : streamType === 'embed' && streamUrl ? (
        <iframe
          className="w-full h-full"
          src={streamUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          data-testid="embed-stream"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
          <div className="text-center">
            <div className="text-6xl font-bold text-gold mb-4">A | B</div>
            <div className="text-xl text-gold-muted">Andar Bahar</div>
            <div className="text-sm text-muted-foreground mt-2">Stream Starting Soon...</div>
          </div>
        </div>
      )}
      
      {/* Overlay Information */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none">
        {/* Top Bar - Live Indicator and View Count */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          {/* Live Indicator */}
          {isLive && (
            <div className="flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-full shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white font-semibold text-sm uppercase">LIVE</span>
            </div>
          )}
          
          {/* View Count */}
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Eye className="w-4 h-4 text-gold" />
            <span className="text-white font-medium text-sm">
              {viewerCount.toLocaleString()}
            </span>
          </div>
        </div>
        
        {/* Bottom Bar - Game Title */}
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
            <div className="text-casino-error text-4xl mb-2">⚠️</div>
            <div className="text-white">Stream unavailable</div>
            <div className="text-sm text-muted-foreground mt-1">Please try again later</div>
          </div>
        </div>
      )}
    </div>
  );
}
