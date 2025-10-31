/**
 * VideoArea - Enhanced video stream area with circular countdown timer overlay
 *
 * Features:
 * - Circular countdown timer with yellow stroke
 * - Round number display
 * - Pulse effect when <5 seconds
 * - Phase-specific colors (betting/dealing)
 * - Smooth timer animations
 * - Unified StreamPlayer for both RTMP and WebRTC streaming
 */

import React, { useEffect, useState } from 'react';
import { useGameState } from '@/contexts/GameStateContext';
import StreamPlayer from '../StreamPlayer';

interface VideoAreaProps {
  className?: string;
  isScreenSharing: boolean;
}

const VideoArea: React.FC<VideoAreaProps> = React.memo(({ className = '', isScreenSharing }) => {
  const { gameState } = useGameState();
  
  // Use the gameState.timer directly
  const localTimer = gameState.countdownTimer;
  const [isPulsing, setIsPulsing] = useState(false);

  // Log when screen sharing state changes
  useEffect(() => {
    console.log('🎥 VideoArea: isScreenSharing =', isScreenSharing);
  }, [isScreenSharing]);

  // Handle pulse effect when less than 5 seconds
  useEffect(() => {
    if (localTimer <= 5 && localTimer > 0) {
      setIsPulsing(true);
    } else {
      setIsPulsing(false);
    }
  }, [localTimer]);

  // Get timer color based on phase
  const getTimerColor = () => {
    switch (gameState.phase) {
      case 'betting':
        return localTimer <= 5 ? '#EF4444' : '#FFD100'; // Red when urgent, yellow normally
      case 'dealing':
        return '#10B981'; // Green for dealing
      case 'complete':
        return '#8B5CF6'; // Purple for complete
      default:
        return '#6B7280'; // Gray for idle
    }
  };

  // Get phase text
  const getPhaseText = () => {
    switch (gameState.phase) {
      case 'betting':
        return 'Betting';
      case 'dealing':
        return gameState.currentRound === 3 ? 'Final Draw' : 'Dealing';
      case 'complete':
        return 'Complete';
      default:
        return 'Waiting';
    }
  };

  // Track initial timer value to calculate progress correctly
  const [initialTimer, setInitialTimer] = useState(30);

  // Update initial timer when betting phase starts or resets
  useEffect(() => {
    if (gameState.phase === 'betting') {
      // When betting phase starts, capture the initial timer value
      if (localTimer > initialTimer || localTimer === initialTimer) {
        setInitialTimer(localTimer);
      }
    } else {
      // Reset for next betting phase
      setInitialTimer(30);
    }
  }, [gameState.phase, localTimer, initialTimer]);

  // Calculate timer progress for circular display
  const getTimerProgress = () => {
    if (gameState.phase !== 'betting' || initialTimer === 0) return 0;
    return Math.max(0, Math.min(1, (initialTimer - localTimer) / initialTimer));
  };

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      {/* Live Video Stream - Fill available space; allow cropping (object-cover) */}
      <div className="absolute inset-0">
        <StreamPlayer
          isLive={gameState.phase !== 'idle'}
          isScreenSharing={isScreenSharing}
          className="w-full h-full object-cover"
        />

        {/* Game Status Overlay - Removed to keep video clean */}

        {/* Dealing Animation - Removed duplicate, using left badge instead */}

        {/* Overlay Gradient for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Circular Timer Overlay - CENTERED - ONLY VISIBLE DURING BETTING */}
      {gameState.phase === 'betting' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div className={`relative transition-all duration-300 ${
            gameState.phase === 'betting' && isPulsing ? 'animate-pulse scale-110' : 'scale-100'
          }`}>
            {/* Large Circular Timer */}
            <div className="relative w-32 h-32 md:w-40 md:h-40">
              <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 128 128">
                {/* Background circle */}
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="rgba(0, 0, 0, 0.6)"
                  strokeWidth="8"
                  fill="rgba(0, 0, 0, 0.4)"
                />
                {/* Progress circle - only show during betting */}
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke={getTimerColor()}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * getTimerProgress()}`}
                  className="transition-all duration-1000 ease-linear"
                  strokeLinecap="round"
                />
              </svg>
              {/* Timer text - Perfectly centered */}
              <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
                <div className="text-white font-bold text-5xl md:text-6xl drop-shadow-2xl leading-none">
                  {localTimer > 0 ? localTimer : '--'}
                </div>
                <div className="text-gold text-xs md:text-sm font-semibold mt-1 tracking-wide uppercase">
                  {getPhaseText()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clean video surface outside betting: no overlays */}

    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if isScreenSharing changes or className changes
  return (
    prevProps.isScreenSharing === nextProps.isScreenSharing &&
    prevProps.className === nextProps.className
  );
});

VideoArea.displayName = 'VideoArea';

export default VideoArea;
