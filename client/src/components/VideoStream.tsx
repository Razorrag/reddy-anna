import React from "react";
import { Eye, Wifi, WifiOff } from "lucide-react";

interface VideoStreamProps {
  isLive?: boolean;
  viewerCount?: number;
  title?: string;
  streamUrl?: string;
  streamType?: 'rtmp' | 'webrtc' | 'none';
  onStreamStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
}

export function VideoStream({
  isLive = false,
  viewerCount = 0,
  title = 'Andar Bahar Live',
  streamUrl = '',
  streamType = 'rtmp'
}: VideoStreamProps) {
  const [status, setStatus] = React.useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  React.useEffect(() => {
    if (isLive) {
      setStatus('connecting');
      // Simulate connection process, in real implementation would connect to actual stream
      const timer = setTimeout(() => {
        setStatus('connected');
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setStatus('disconnected');
    }
  }, [isLive]);

  // Determine the appropriate player URL based on stream type and configuration
  const getPlayerUrl = () => {
    if (streamType === 'rtmp' && streamUrl) {
      // If stream URL is already a player URL
      if (streamUrl.includes('player')) return streamUrl;
      // If it's an RTMP URL, try to format it for a player
      return `https://player.restream.io?token=${streamUrl.split('/').pop() || 'default'}`;
    }
    // Default fallback
    return "https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1";
  };

  const playerUrl = getPlayerUrl();

  // Show status overlay when not connected
  const renderStatusOverlay = () => {
    if (status === 'connected' || isLive) return null;

    let statusText = '';
    let statusIcon = null;
    let statusColor = '';

    switch (status) {
      case 'connecting':
        statusText = 'Connecting to stream...';
        statusIcon = <Wifi className="w-16 h-16 text-gold mb-4 mx-auto animate-pulse" />;
        statusColor = 'from-gray-900 to-gray-800';
        break;
      case 'error':
        statusText = 'Connection Error';
        statusIcon = <WifiOff className="w-16 h-16 text-red-400 mb-4 mx-auto" />;
        statusColor = 'from-red-900/20 to-red-800/20';
        break;
      case 'disconnected':
      default:
        statusText = 'Stream Offline';
        statusIcon = <WifiOff className="w-16 h-16 text-gray-400 mb-4 mx-auto" />;
        statusColor = 'from-gray-900 to-gray-800';
        break;
    }

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br z-10" style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
        <div className="text-center p-6">
          {statusIcon}
          <p className="text-white text-lg mb-2">{statusText}</p>
          {status === 'disconnected' && (
            <p className="text-gray-400">The game stream will start soon</p>
          )}
          <p className="text-gold mt-4">{title}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl video-stream-container">
      {/* Stream Player */}
      {streamType === 'rtmp' && (
        <iframe
          src={playerUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          title={`${title} - ${streamType.toUpperCase()} Stream`}
        />
      )}

      {/* Overlay: Status Information */}
      {renderStatusOverlay()}

      {/* Overlay: Live Badge */}
      {isLive && status === 'connected' && (
        <div className="absolute top-4 left-4 z-10">
          <div className="flex items-center gap-2 bg-red-600/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white font-bold text-xs uppercase tracking-wider">LIVE</span>
          </div>
        </div>
      )}

      {/* Overlay: View Count */}
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

      {/* Overlay: Stream Type Badge */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
          <span className="text-white text-xs font-medium">
            {streamType === 'rtmp' ? '📡 RTMP Stream' : '🌐 WebRTC Stream'}
          </span>
        </div>
      </div>
    </div>
  );
}
