/**
 * StreamPlayer - WebRTC-Only Player Wrapper
 *
 * This component handles only WebRTC streaming for screen sharing.
 * RTMP has been completely removed to eliminate race conditions.
 *
 * Uses React.memo to prevent unnecessary re-renders and ensure
 * WebRTC connections persist across state changes.
 */
import React, { useEffect, useState } from 'react';
import WebRTCPlayer from './StreamPlayer/WebRTCPlayer';

interface StreamPlayerProps {
  isScreenSharing: boolean; // The prop from VideoArea
  className?: string;
}

const StreamPlayer: React.FC<StreamPlayerProps> = React.memo(({
  isScreenSharing,
  className,
}) => {
  // Simple binary state: WebRTC or Offline
  const [activeMode, setActiveMode] = useState<'webrtc' | 'offline'>('offline');

  // Update active mode based on props - immediate switching, no delays
  useEffect(() => {
    if (isScreenSharing) {
      console.log('📺 StreamPlayer: Switching to WebRTC (screen sharing active)');
      setActiveMode('webrtc');
    } else {
      console.log('📺 StreamPlayer: Switching to offline mode');
      setActiveMode('offline');
    }
  }, [isScreenSharing]);

  // WebRTC streaming mode
  if (activeMode === 'webrtc') {
    console.log('📺 StreamPlayer: Rendering WebRTCPlayer');
    return (
      <div className={`relative w-full h-full ${className}`} key="webrtc-stream">
        <WebRTCPlayer roomId="default-room" />
      </div>
    );
  }

  // Offline state
  console.log('📺 StreamPlayer: Rendering offline state');
  return (
    <div className={`bg-gray-900 flex items-center justify-center text-white ${className}`}>
      <div className="text-center">
        <div className="text-6xl mb-4">📺</div>
        <div className="text-xl font-semibold text-gray-400">Stream Offline</div>
        <div className="text-sm text-gray-500 mt-2">Waiting for admin to start sharing...</div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.isScreenSharing === nextProps.isScreenSharing &&
    prevProps.className === nextProps.className
  );
});

StreamPlayer.displayName = 'StreamPlayer';

export default StreamPlayer;
