/**
 * StreamPlayer - Unified Player Wrapper
 *
 * This component decides which video player to render based on the
 * current application state.
 *
 * It prioritizes WebRTC screen sharing over the default RTMP stream.
 * Uses React.memo to prevent unnecessary re-renders and race conditions.
 */
import React, { useEffect, useState } from 'react';
import RTMPPlayer from './StreamPlayer/RTMPPlayer';
import WebRTCPlayer from './StreamPlayer/WebRTCPlayer';

interface StreamPlayerProps {
  isLive: boolean;
  isScreenSharing: boolean; // The prop from VideoArea
  className?: string;
}

const StreamPlayer: React.FC<StreamPlayerProps> = React.memo(({
  isLive,
  isScreenSharing,
  className,
}) => {
  // Local state to smoothly handle screen sharing transitions
  const [activeMode, setActiveMode] = useState<'webrtc' | 'rtmp' | 'offline'>('offline');
  const [isReady, setIsReady] = useState(false);

  // Update active mode based on props with debounce to prevent race conditions
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isScreenSharing) {
      // Immediate switch to WebRTC when screen sharing starts
      console.log('📺 StreamPlayer: Switching to WebRTC (screen sharing active)');
      setActiveMode('webrtc');
      setIsReady(true);
    } else if (isLive) {
      // Small delay before switching to RTMP to avoid flicker
      timeoutId = setTimeout(() => {
        console.log('📺 StreamPlayer: Switching to RTMP (game is live)');
        setActiveMode('rtmp');
        setIsReady(true);
      }, 100);
    } else {
      // Small delay before going offline to avoid flicker
      timeoutId = setTimeout(() => {
        console.log('📺 StreamPlayer: Switching to offline mode');
        setActiveMode('offline');
        setIsReady(true);
      }, 100);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isScreenSharing, isLive]);

  // Don't render until ready to prevent flashing
  if (!isReady) {
    return (
      <div className={`bg-gray-900 flex items-center justify-center ${className}`}>
        <div className="text-gray-400 text-sm">Loading stream...</div>
      </div>
    );
  }

  // 1. Priority: If Admin is screen sharing, show the WebRTC player.
  if (activeMode === 'webrtc') {
    console.log('📺 StreamPlayer: Rendering WebRTCPlayer');
    return (
      <div className={`relative w-full h-full ${className}`} key="webrtc-player">
        <WebRTCPlayer roomId="default-room" />
      </div>
    );
  }

  // 2. Fallback: If game is live (but not screen sharing), show RTMP player.
  if (activeMode === 'rtmp') {
    console.log('📺 StreamPlayer: Rendering RTMPPlayer');
    return (
      <div className={`relative w-full h-full ${className}`} key="rtmp-player">
        <RTMPPlayer playerUrl="" streamTitle="Andar Bahar Live" />
      </div>
    );
  }

  // 3. Default: If nothing is live, show an offline message.
  console.log('📺 StreamPlayer: Rendering offline state');
  return (
    <div className={`bg-gray-900 flex items-center justify-center text-white ${className}`}>
      <div className="text-center">
        <div className="text-6xl mb-4">📺</div>
        <div className="text-xl font-semibold text-gray-400">Stream Offline</div>
        <div className="text-sm text-gray-500 mt-2">Waiting for game to start...</div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.isScreenSharing === nextProps.isScreenSharing &&
    prevProps.isLive === nextProps.isLive &&
    prevProps.className === nextProps.className
  );
});

StreamPlayer.displayName = 'StreamPlayer';

export default StreamPlayer;
