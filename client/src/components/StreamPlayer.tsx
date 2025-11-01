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

  // ✅ CRITICAL FIX #2: Listen to events for immediate state propagation
  // This ensures WebRTCPlayer mounts immediately when stream starts, even if prop hasn't updated yet
  useEffect(() => {
    const handleStreamStart = () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📺 [STREAMPLAYER] Stream-start event received - IMMEDIATE switch to WebRTC');
      // ✅ IMMEDIATE switch to WebRTC mode - don't wait for prop update
      setActiveMode('webrtc');
      setIsReady(true);
      console.log('✅ [STREAMPLAYER] WebRTC mode activated IMMEDIATELY via event');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    };

    window.addEventListener('webrtc_stream_start', handleStreamStart);
    
    return () => {
      window.removeEventListener('webrtc_stream_start', handleStreamStart);
    };
  }, []);

  // Update active mode based on props - ONLY when streaming state changes
  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📺 [STREAMPLAYER] Mode update triggered');
    console.log('📺 [STREAMPLAYER] Props:', {
      isScreenSharing,
      isLive,
      currentMode: activeMode
    });
    
    let timeoutId: NodeJS.Timeout;

    if (isScreenSharing) {
      // ✅ CRITICAL FIX: Immediate switch to WebRTC when screen sharing starts
      // No delay - render immediately when screen sharing is active
      console.log('📺 [STREAMPLAYER] Switching to WebRTC (screen sharing active)');
      console.log('📺 [STREAMPLAYER] isScreenSharing =', isScreenSharing);
      // ✅ Use callback form to ensure synchronous state update
      setActiveMode(prev => {
        if (prev !== 'webrtc') {
          console.log('📺 [STREAMPLAYER] Mode changed to webrtc');
        }
        return 'webrtc';
      });
      setIsReady(prev => {
        if (!prev) {
          console.log('📺 [STREAMPLAYER] Setting isReady to true');
        }
        return true;
      });
      console.log('✅ [STREAMPLAYER] WebRTC mode activated - ready to render');
    } else if (isLive) {
      // Small delay before switching to RTMP to avoid flicker
      timeoutId = setTimeout(() => {
        console.log('📺 [STREAMPLAYER] Switching to RTMP (game is live)');
        setActiveMode('rtmp');
        setIsReady(true);
      }, 100);
    } else {
      // Small delay before going offline to avoid flicker
      timeoutId = setTimeout(() => {
        console.log('📺 [STREAMPLAYER] Switching to offline mode');
        setActiveMode('offline');
        setIsReady(true);
      }, 100);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isScreenSharing, isLive, activeMode]);

  // Prevent re-renders when component receives same props
  // This ensures video stream stays stable during timer updates

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
      <div 
        className={`relative w-full h-full ${className}`} 
        key="player-webrtc"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
        }}
      >
        <WebRTCPlayer roomId="default-room" />
      </div>
    );
  }

  // 2. Fallback: If game is live (but not screen sharing), show RTMP player.
  if (activeMode === 'rtmp') {
    console.log('📺 StreamPlayer: Rendering RTMPPlayer');
    return (
      <div className={`relative w-full h-full ${className}`} key="player-rtmp">
        <RTMPPlayer playerUrl="" streamTitle="Andar Bahar Live" />
      </div>
    );
  }

  // 3. Default: If nothing is live, show an offline message.
  console.log('📺 StreamPlayer: Rendering offline state');
  return (
    <div className={`bg-gray-900 flex items-center justify-center text-white ${className}`} key="player-offline">
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
