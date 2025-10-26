/**
 * Universal Stream Player
 * 
 * Auto-detects stream method (RTMP or WebRTC) and loads the appropriate player
 * Provides unified interface for both streaming methods
 */

import { useState, useEffect } from 'react';
import { Eye, Wifi, WifiOff } from 'lucide-react';
import RTMPPlayer from './RTMPPlayer';
import WebRTCPlayer from './WebRTCPlayer';

interface StreamConfig {
  activeMethod: 'rtmp' | 'webrtc';
  streamStatus: 'online' | 'offline' | 'connecting' | 'error';
  streamTitle: string;
  rtmpPlayerUrl: string;
  webrtcRoomId: string;
  viewerCount: number;
}

interface UniversalStreamPlayerProps {
  isLive?: boolean;
  viewerCount?: number;
  className?: string;
}

export default function UniversalStreamPlayer({
  isLive: propIsLive,
  viewerCount: propViewerCount,
  className = ''
}: UniversalStreamPlayerProps) {
  const [config, setConfig] = useState<StreamConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch stream configuration
  useEffect(() => {
    fetchStreamConfig();
    
    // Poll for config updates every 30 seconds
    const interval = setInterval(fetchStreamConfig, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStreamConfig = async () => {
    try {
      const response = await fetch('/api/stream/config', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch stream configuration');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setConfig(data.data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching stream config:', err);
      setError('Unable to load stream configuration');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`relative w-full aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-white text-lg">Loading stream...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !config) {
    return (
      <div className={`relative w-full aspect-video bg-gradient-to-br from-red-900/20 to-red-800/20 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <WifiOff className="w-16 h-16 text-red-400 mb-4 mx-auto" />
          <p className="text-white text-lg mb-2">Stream Unavailable</p>
          <p className="text-gray-400 text-sm">{error || 'Unable to connect to stream'}</p>
          <button
            onClick={fetchStreamConfig}
            className="mt-4 px-4 py-2 bg-gold hover:bg-gold/80 text-gray-900 rounded-lg font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Determine live status (from props or config)
  const isLive = propIsLive !== undefined ? propIsLive : config.streamStatus === 'online';
  const viewerCount = propViewerCount !== undefined ? propViewerCount : config.viewerCount;

  // Offline state
  if (!isLive) {
    return (
      <div className={`relative w-full aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <WifiOff className="w-16 h-16 text-gray-400 mb-4 mx-auto animate-pulse" />
          <p className="text-white text-xl mb-2">Stream Offline</p>
          <p className="text-gray-400">The game stream will start soon</p>
          <p className="text-gold mt-4">{config.streamTitle}</p>
        </div>
      </div>
    );
  }

  // Connecting state
  if (config.streamStatus === 'connecting') {
    return (
      <div className={`relative w-full aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center ${className}`}>
        <div className="text-center">
          <Wifi className="w-16 h-16 text-gold mb-4 mx-auto animate-pulse" />
          <p className="text-white text-lg mb-2">Connecting to stream...</p>
          <p className="text-gray-400 text-sm">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ${className}`}>
      {/* Render appropriate player based on method */}
      {config.activeMethod === 'rtmp' ? (
        <RTMPPlayer
          playerUrl={config.rtmpPlayerUrl}
          streamTitle={config.streamTitle}
        />
      ) : (
        <WebRTCPlayer
          roomId={config.webrtcRoomId}
          streamTitle={config.streamTitle}
        />
      )}

      {/* Overlay: Live Badge */}
      {isLive && (
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

      {/* Overlay: Stream Method Badge (bottom left) */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
          <span className="text-white text-xs font-medium">
            {config.activeMethod === 'rtmp' ? '📡 RTMP Stream' : '🌐 WebRTC Stream'}
          </span>
        </div>
      </div>
    </div>
  );
}
