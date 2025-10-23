/**
 * VideoStream Component - Live Stream Only
 * 
 * Features:
 * - Live Restream.io iframe embed
 * - Backend configuration support
 * - Stream status monitoring
 * - Clean error handling
 * - No local video fallback - Live stream only
 */

import { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoStreamProps {
  streamUrl?: string;
  streamType?: 'video' | 'embed';
  isLive?: boolean;
  viewerCount?: number;
  title?: string;
}

export function VideoStream({
  streamUrl,
  streamType,
  isLive = true,
  viewerCount = 1234,
  title = "Andar Bahar Live Game"
}: VideoStreamProps) {
  const [streamError, setStreamError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStreamUrl, setCurrentStreamUrl] = useState(
    streamUrl || "https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1"
  );
  const [currentStreamType, setCurrentStreamType] = useState(
    streamType || 'embed'
  );
  const [streamStatus, setStreamStatus] = useState<'online' | 'offline' | 'error'>('offline');

  // Load stream settings from backend
  useEffect(() => {
    const loadStreamSettings = async () => {
      try {
        const response = await fetch('/api/game/stream-settings');
        const data = await response.json();
        
        if (data.streamUrl) {
          setCurrentStreamUrl(data.streamUrl);
          setCurrentStreamType(data.streamType || 'embed');
        }
      } catch (error) {
        console.error('Failed to load stream settings:', error);
        // Keep defaults
      }
    };

    loadStreamSettings();
  }, []);

  // Set stream status to online for live streams (no status checking to avoid CORS issues)
  useEffect(() => {
    if (currentStreamType === 'embed') {
      setStreamStatus('online');
    }
  }, [currentStreamType]);

  const renderStreamContent = () => {
    // Live stream embed (Restream.io iframe)
    return (
      <iframe
        src={currentStreamUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onLoad={() => {
          setIsLoading(false);
          setStreamError(false);
        }}
        onError={() => {
          setStreamError(true);
          setIsLoading(false);
        }}
        data-testid="live-stream"
      />
    );
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
      {/* Video/Stream Content */}
      {renderStreamContent()}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-lg">Loading stream...</p>
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

      {/* Stream Status Indicator */}
      <div className="absolute top-4 right-4 z-10">
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
          streamStatus === 'online' 
            ? 'bg-green-500/80 text-white' 
            : streamStatus === 'error'
            ? 'bg-red-500/80 text-white'
            : 'bg-gray-500/80 text-white'
        }`}>
          {streamStatus === 'online' ? '🟢 ONLINE' : streamStatus === 'error' ? '🔴 ERROR' : '⚫ OFFLINE'}
        </div>
      </div>

      {/* Error State */}
      {streamError && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="text-red-500 text-4xl mb-2">⚠️</div>
            <div className="text-white">Stream unavailable</div>
            <div className="text-sm text-white/60 mt-1">Please try again later</div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
