// StreamPlayer.tsx - Unified Stream Player Component
// Simplified player component that handles both RTMP and WebRTC streaming methods

import React, { useState, useEffect, useRef } from 'react';
import { Eye, Wifi, WifiOff } from 'lucide-react';

interface StreamConfig {
  activeMethod: 'rtmp' | 'webrtc' | 'none';
  streamStatus: 'online' | 'offline' | 'connecting' | 'error';
  streamTitle: string;
  rtmpServerUrl: string;
  rtmpStreamKey: string;
  webrtcResolution: string;
  webrtcFps: number;
  webrtcBitrate: number;
  streamWidth: number;
  streamHeight: number;
  showStream: boolean;
  viewerCount: number;
}

interface StreamPlayerProps {
  isLive?: boolean;
  viewerCount?: number;
  className?: string;
}

const StreamPlayer: React.FC<StreamPlayerProps> = ({ 
  isLive: propIsLive, 
  viewerCount: propViewerCount, 
  className = '' 
}) => {
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
      const response = await fetch('/api/stream/config');
      
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

  // Stream disabled by admin
  if (!config.showStream) {
    return (
      <div className={`relative w-full aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <WifiOff className="w-16 h-16 text-gray-400 mb-4 mx-auto" />
          <p className="text-white text-lg mb-2">Stream Disabled</p>
          <p className="text-gray-400">Stream is currently disabled by admin</p>
        </div>
      </div>
    );
  }

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
        <RTMPStream config={config} />
      ) : config.activeMethod === 'webrtc' ? (
        <WebRTCStream config={config} />
      ) : (
        <NoStream config={config} />
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
};

// RTMP Stream Component
const RTMPStream: React.FC<{ config: StreamConfig }> = ({ config }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    console.log('🎬 RTMP Stream initialized');
  }, []);

  // Generate player URL based on RTMP settings
  const generatePlayerUrl = (): string => {
    // For Restream URLs
    if (config.rtmpServerUrl.includes('restream.io')) {
      return `https://player.restream.io?token=${config.rtmpStreamKey}`;
    }
    
    // For generic RTMP URLs, use a generic player
    if (config.rtmpStreamKey) {
      return `https://player.restream.io?token=${config.rtmpStreamKey}`;
    }
    
    return '';
  };

  const playerUrl = generatePlayerUrl();

  if (!playerUrl) {
    return (
      <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center">
        <div className="text-center">
          <WifiOff className="w-16 h-16 text-gray-400 mb-4 mx-auto" />
          <p className="text-white text-lg">No RTMP stream configured</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={playerUrl}
      className="absolute inset-0 w-full h-full"
      frameBorder="0"
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
      title={`${config.streamTitle} - RTMP Stream`}
    />
  );
};

// WebRTC Stream Component
const WebRTCStream: React.FC<{ config: StreamConfig }> = ({ config }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'failed'>('connecting');

  useEffect(() => {
    console.log('🌐 WebRTC Stream initializing');
    initializeWebRTC();

    return () => {
      cleanup();
    };
  }, [config]);

  const initializeWebRTC = async () => {
    try {
      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = peerConnection;

      // Handle incoming tracks (video/audio from admin)
      peerConnection.ontrack = (event) => {
        console.log('📺 Received remote track:', event.track.kind);
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setConnectionState('connected');
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Sending ICE candidate');
          // In a real implementation, this would be sent via WebSocket
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('🔌 Connection state:', peerConnection.connectionState);
        setConnectionState(peerConnection.connectionState as any);
      };

      console.log('✅ WebRTC Stream initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing WebRTC:', error);
      setConnectionState('failed');
    }
  };

  const cleanup = () => {
    console.log('🧹 Cleaning up WebRTC Stream');
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Show connection status overlay
  const renderStatusOverlay = () => {
    if (connectionState === 'connected') return null;

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-10">
        <div className="text-center p-6">
          {connectionState === 'connecting' && (
            <>
              <Wifi className="w-16 h-16 text-gold mb-4 mx-auto animate-pulse" />
              <p className="text-white text-lg mb-2">Connecting to stream...</p>
              <p className="text-gray-400 text-sm">Establishing WebRTC connection</p>
            </>
          )}
          
          {connectionState === 'disconnected' && (
            <>
              <WifiOff className="w-16 h-16 text-yellow-400 mb-4 mx-auto" />
              <p className="text-white text-lg mb-2">Connection Lost</p>
              <p className="text-gray-400 text-sm">Attempting to reconnect...</p>
            </>
          )}
          
          {connectionState === 'failed' && (
            <>
              <WifiOff className="w-16 h-16 text-red-400 mb-4 mx-auto" />
              <p className="text-white text-lg mb-2">Connection Failed</p>
              <p className="text-gray-400 text-sm">Unable to establish connection</p>
              <button
                onClick={initializeWebRTC}
                className="mt-4 px-4 py-2 bg-gold hover:bg-gold/80 text-gray-900 rounded-lg font-semibold transition-colors"
              >
                Retry
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-black">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
        muted={false}
      />
      
      {renderStatusOverlay()}
    </div>
  );
};

// No Stream Component
const NoStream: React.FC<{ config: StreamConfig }> = ({ config }) => {
  return (
    <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
      <div className="text-center p-6">
        <WifiOff className="w-16 h-16 text-gray-400 mb-4 mx-auto" />
        <p className="text-white text-lg mb-2">No Stream Active</p>
        <p className="text-gray-400">Admin has not selected a streaming method</p>
        <p className="text-gold mt-4">{config.streamTitle}</p>
      </div>
    </div>
  );
};

export default StreamPlayer;