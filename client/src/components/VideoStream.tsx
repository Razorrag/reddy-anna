/**
 * VideoStream Component - YouTube Live Embed
 * 
 * Simple YouTube Live embed - no token issues, works immediately
 * 
 * Setup:
 * 1. Go to https://studio.youtube.com/
 * 2. Click "Go Live" → "Stream"
 * 3. Set to "Unlisted" and enable "Ultra-low latency"
 * 4. Start streaming from OBS
 * 5. Copy video ID and update YOUTUBE_VIDEO_ID below
 * 
 * Alternative: Use environment variable
 * Add to .env: VITE_YOUTUBE_VIDEO_ID=your_video_id
 */

import { Eye } from "lucide-react";

interface VideoStreamProps {
  isLive?: boolean;
  viewerCount?: number;
  title?: string;
}

export function VideoStream({
  isLive = false,
  viewerCount = 0,
  title = "Andar Bahar Live Game"
}: VideoStreamProps) {
  // YouTube Live Stream ID
  // From: https://youtube.com/live/z7fyLrTL8ng
  const YOUTUBE_VIDEO_ID = "z7fyLrTL8ng";
  
  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl video-stream-container">
      {/* YouTube Live Iframe - Works immediately, no token issues */}
      <iframe 
        src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=0&controls=0&modestbranding=1&rel=0`}
        width="100%" 
        height="100%" 
        allow="autoplay; fullscreen" 
        frameBorder="0"
        className="absolute inset-0 w-full h-full"
        title={title}
        allowFullScreen
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
    </div>
  );
}
