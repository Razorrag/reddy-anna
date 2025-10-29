/**
 * VideoArea - Game Video and Timer Display Component
 *
 * Displays the game stream/video area with timer, opening card, and game status.
 * This is the central visual component of the game interface.
 * Integrates screen sharing from admin to show live game action.
 */

import React, { useEffect, useRef, useState } from 'react';

interface VideoAreaProps {
  className?: string;
  gameState: any; // Use any to handle different GameState structures
}

const VideoArea: React.FC<VideoAreaProps> = ({ className, gameState }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScreenShareActive, setIsScreenShareActive] = useState(false);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);

  // Handle screen share events from WebSocket context
  useEffect(() => {
    const handleScreenShareStart = (event: CustomEvent) => {
      console.log('🖥️ Screen sharing started by admin');
      setIsScreenShareActive(true);
      setScreenShareError(null);
    };

    const handleScreenShareStop = (event: CustomEvent) => {
      console.log('🛑 Screen sharing stopped by admin');
      setIsScreenShareActive(false);
      setScreenShareError(null);
    };

    // Listen for screen share events dispatched by WebSocketContext
    window.addEventListener('screen-share-start', handleScreenShareStart as EventListener);
    window.addEventListener('screen-share-stop', handleScreenShareStop as EventListener);
    
    return () => {
      window.removeEventListener('screen-share-start', handleScreenShareStart as EventListener);
      window.removeEventListener('screen-share-stop', handleScreenShareStop as EventListener);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (screenShareStream) {
        screenShareStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [screenShareStream]);

  return (
    <div className={`video-area relative ${className || ''}`}>
      {/* Stream Player */}
      <div className="stream-container w-full h-full relative bg-gray-900">
        {/* Screen Share Video - Show when active */}
        {isScreenShareActive ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            onLoadedMetadata={() => console.log('Screen share video loaded')}
          />
        ) : (
          /* Mock Stream Content - Show when no screen share */
          <div className="stream-placeholder w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">⏳</div>
              <div className="text-lg font-semibold text-gray-400">
                {process.env.NODE_ENV === 'development'
                  ? 'Stream Placeholder (Development Mode)'
                  : 'Live Stream Loading...'
                }
              </div>
              <div className="text-sm text-gray-500 mt-2">
                {isScreenShareActive ? 'Admin screen sharing active' : 'Admin will start the game shortly'}
              </div>
            </div>
          </div>
        )}

        {/* Timer Overlay - Only show when in betting phase */}
        {gameState.phase === 'betting' && (
          <div className="timer-overlay absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="timer-circle w-32 h-32 bg-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {gameState.countdownTimer}
            </div>
          </div>
        )}

        {/* Opening Card Overlay */}
        {gameState.selectedOpeningCard && (
          <div className="opening-card-overlay absolute top-4 left-4">
            <div className="opening-card bg-white text-black px-3 py-1 rounded text-sm font-bold">
              Opening: {gameState.selectedOpeningCard.display || gameState.selectedOpeningCard.id}
            </div>
          </div>
        )}

        {/* Game Status Overlay */}
        <div className="game-status-overlay absolute top-4 right-4">
          <div className={`status-badge px-3 py-1 rounded text-sm font-semibold ${
            gameState.phase === 'betting' ? 'bg-green-600' :
            gameState.phase === 'dealing' ? 'bg-yellow-600' :
            gameState.phase === 'complete' ? 'bg-blue-600' :
            'bg-gray-600'
          }`}>
            {gameState.phase === 'betting' ? 'Betting Open' :
             gameState.phase === 'dealing' ? 'Dealing Cards' :
             gameState.phase === 'complete' ? 'Game Complete' :
             'Waiting'}
          </div>
        </div>

        {/* Round Indicator */}
        <div className="round-indicator absolute bottom-4 left-4">
          <div className="round-badge bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold">
            ROUND {gameState.currentRound}
          </div>
        </div>

        {/* Screen Share Status Indicator */}
        {isScreenShareActive && (
          <div className="screen-share-indicator absolute top-4 left-1/2 transform -translate-x-1/2">
            <div className="flex items-center bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">
              <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
              SCREEN SHARING
            </div>
          </div>
        )}

        {/* Error Display */}
        {screenShareError && (
          <div className="screen-share-error absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white px-4 py-2 rounded text-sm">
            {screenShareError}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoArea;
