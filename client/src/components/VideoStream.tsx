import React, { useState, useRef, useEffect } from "react";
import { Eye, Wifi, WifiOff, Play, Pause, Volume2, VolumeX } from "lucide-react";

interface VideoStreamProps {
  isLive?: boolean;
  viewerCount?: number;
  title?: string;
  streamUrl?: string;
  streamType?: 'rtmp' | 'webrtc' | 'none';
  onStreamStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  webrtcStream?: MediaStream | null;
}

export function VideoStream({
  isLive = false,
  viewerCount = 0,
  title = 'Andar Bahar Live',
  streamUrl = '',
  streamType = 'rtmp',
  webrtcStream = null
}: VideoStreamProps) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
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

  // Handle WebRTC stream when provided
  useEffect(() => {
    if (webrtcStream && videoRef.current) {
      videoRef.current.srcObject = webrtcStream;
      videoRef.current.play().catch(err => {
        console.error('Failed to play WebRTC stream:', err);
        setStatus('error');
      });
    }
  }, [webrtcStream]);

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

  // Control handlers
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (!isFullscreen) {
        videoRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

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

  // Render WebRTC stream
  const renderWebRTCStream = () => {
    if (streamType !== 'webrtc') return null;

    return (
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          autoPlay
          muted={isMuted}
          playsInline
          className="w-full h-full object-contain bg-black"
          onPlay={() => setStatus('connected')}
          onPause={() => setStatus('disconnected')}
          onError={() => setStatus('error')}
        />
        
        {/* WebRTC Controls Overlay */}
        <div className="absolute top-0 left-0 right-0 bottom-0 opacity-0 hover:opacity-100 transition-opacity duration-200">
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/50 backdrop-blur-sm p-2 rounded-lg">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayPause}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
              </button>
              <button
                onClick={handleMute}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
              </button>
            </div>
            <button
              onClick={handleFullscreen}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white text-xs"
            >
              Fullscreen
            </button>
          </div>
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

      {/* WebRTC Stream */}
      {renderWebRTCStream()}

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

      {/* WebRTC Connection Status */}
      {streamType === 'webrtc' && status !== 'connected' && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-2xl mb-2">🌐</div>
            <div className="text-sm">{status === 'connecting' ? 'Connecting...' : 'Waiting for stream'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
