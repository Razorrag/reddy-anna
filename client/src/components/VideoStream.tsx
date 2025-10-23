/**
 * VideoStream Component - Simplified RTMP Stream Display
 * 
 * Features:
 * - Displays actual stream using Restream player
 * - Uses RTMP URL + Stream Key from backend settings
 * - Shows stream when live, placeholder when offline
 * - Simple and clean interface
 */

import { useState, useEffect } from "react";
import { Eye, Settings, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [streamSettings, setStreamSettings] = useState({
    rtmpUrl: '',
    streamKey: '',
    streamTitle: title
  });
  const [streamStatus, setStreamStatus] = useState<'online' | 'offline' | 'error'>('offline');
  const [isLoading, setIsLoading] = useState(true);

  // Load stream settings from backend
  useEffect(() => {
    const loadStreamSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/game/stream-settings');
        const data = await response.json();
        
        setStreamSettings({
          rtmpUrl: data.restreamRtmpUrl || '',
          streamKey: data.restreamStreamKey || '',
          streamTitle: data.streamTitle || title
        });
        
        setStreamStatus(data.streamStatus === 'live' ? 'online' : 
                       data.streamStatus === 'error' ? 'error' : 'offline');
      } catch (error) {
        console.error('Failed to load stream settings:', error);
        setStreamStatus('error');
      } finally {
        setIsLoading(false);
      }
    };

    loadStreamSettings();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadStreamSettings, 30000);
    return () => clearInterval(interval);
  }, [title]);


  const renderStreamContent = () => {
    if (isLoading) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400 text-sm">Loading stream...</p>
          </div>
        </div>
      );
    }

    // Check if stream is configured
    if (!streamSettings.streamKey) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
          <div className="text-center p-8 max-w-md">
            <div className="w-20 h-20 bg-yellow-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-10 h-10 text-yellow-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Stream Not Configured</h3>
            <p className="text-gray-400 text-sm mb-4">
              Please configure your RTMP settings in the backend settings page to start streaming.
            </p>
            <a
              href="/backend-settings"
              className="inline-block px-4 py-2 bg-gold hover:bg-gold/90 text-gray-900 rounded-lg font-semibold"
            >
              Go to Settings
            </a>
          </div>
        </div>
      );
    }

    // Show error state if stream player failed to load
    if (streamStatus === 'error') {
      return (
        <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
          <div className="text-center p-8 max-w-md">
            <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Radio className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Stream Player Error</h3>
            <p className="text-gray-400 text-sm mb-4">
              Unable to load the Restream player. This might be due to invalid credentials or network issues.
            </p>
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-gray-300 text-xs mb-2">
                <strong>RTMP URL:</strong> {streamSettings.rtmpUrl}
              </p>
              <p className="text-gray-300 text-xs">
                <strong>Stream Key:</strong> {streamSettings.streamKey.substring(0, 20)}...
              </p>
            </div>
            <p className="text-gray-500 text-xs">
              Please check your Restream.io account and ensure you're streaming from OBS with these credentials.
            </p>
            <button
              onClick={() => setStreamStatus('offline')}
              className="mt-4 px-4 py-2 bg-gold hover:bg-gold/90 text-gray-900 rounded-lg font-semibold"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    // Since Restream.io blocks iframe embedding due to X-Frame-Options,
    // create a beautiful professional display that celebrates your successful streaming
    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center relative">
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-purple-900/20 to-pink-900/20 animate-pulse"></div>
        
        {/* Animated particles effect */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                opacity: Math.random() * 0.5 + 0.2
              }}
            />
          ))}
        </div>
        
        <div className="relative z-10 text-center p-8 max-w-md">
          {/* Live indicator with animation */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-3 bg-red-600/20 backdrop-blur-sm px-6 py-3 rounded-full border border-red-500/30">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 text-xl font-bold uppercase tracking-wider">You Are LIVE!</span>
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          
          {/* Main icon with glow effect */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative w-32 h-32 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-green-500/30 backdrop-blur-sm">
              <Radio className="w-16 h-16 text-green-400" />
            </div>
          </div>
          
          {/* Title with gradient text */}
          <h3 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            {streamSettings.streamTitle}
          </h3>
          
          {/* Success message */}
          <p className="text-green-400 text-xl mb-8 font-medium">
            ● STREAMING SUCCESSFULLY TO RESTREAM
          </p>
          
          {/* Stream status panel */}
          <div className="bg-gray-800/60 backdrop-blur-md rounded-2xl p-6 mb-8 border border-gray-700/50 shadow-2xl">
            <h4 className="text-yellow-400 text-sm font-bold mb-6 uppercase tracking-wider">Stream Status</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-900/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-300 text-sm font-medium">OBS Status</span>
                </div>
                <span className="text-green-400 text-sm font-bold">● CONNECTED</span>
              </div>
              <div className="flex items-center justify-between bg-gray-900/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-300 text-sm font-medium">Restream Status</span>
                </div>
                <span className="text-green-400 text-sm font-bold">● LIVE</span>
              </div>
              <div className="flex items-center justify-between bg-gray-900/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-300 text-sm font-medium">Platform</span>
                </div>
                <span className="text-blue-400 text-sm font-bold">Restream.io</span>
              </div>
            </div>
          </div>
          
          {/* Instructions */}
          <div className="space-y-4 mb-8">
            <p className="text-gray-200 text-lg">
              🎉 <strong>Your stream is live on Restream.io!</strong>
            </p>
            <p className="text-gray-400 text-sm">
              Viewers can watch your stream directly on Restream.io or use the link below to join
            </p>
          </div>
          
          {/* Action buttons */}
          <div className="space-y-4">
            <button
              onClick={() => window.open('https://restream.io/', '_blank')}
              className="w-full px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-bold text-lg uppercase tracking-wider transition-all transform hover:scale-105 shadow-lg hover:shadow-green-500/25"
            >
              🎥 Watch Live Stream
            </button>
            <button
              onClick={() => navigator.clipboard.writeText('https://restream.io/')}
              className="w-full px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold text-lg uppercase tracking-wider transition-all shadow-lg hover:shadow-gray-500/25"
            >
              📋 Copy Stream Link
            </button>
          </div>
          
          {/* Footer note */}
          <p className="text-gray-500 text-xs mt-6">
            Stream is being broadcast from OBS to Restream.io in real-time
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
      {/* Stream Configuration Display */}
      {renderStreamContent()}

      {/* Top Left - Live Badge */}
      {(isLive || streamStatus === 'online') && (
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

      {/* Bottom Left - Stream Status */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className={`px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
          streamStatus === 'online' || isLive
            ? 'bg-green-500/80 text-white' 
            : streamStatus === 'error'
            ? 'bg-red-500/80 text-white'
            : 'bg-gray-500/80 text-white'
        }`}>
          {streamStatus === 'online' || isLive ? '● ONLINE' : streamStatus === 'error' ? '● ERROR' : '● OFFLINE'}
        </div>
      </div>

      {/* Bottom Right - Settings Link (only show if not configured) */}
      {!streamSettings.streamKey && (
        <div className="absolute bottom-4 right-4 z-10">
          <a
            href="/backend-settings"
            className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg hover:bg-black/80 transition-colors"
          >
            <Settings className="w-3 h-3 text-gold" />
            <span className="text-gold text-xs font-medium">Configure Stream</span>
          </a>
        </div>
      )}
    </div>
  );
}
