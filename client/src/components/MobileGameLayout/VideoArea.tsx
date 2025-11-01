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
 * 
 * CRITICAL: Timer overlay is separate component to prevent video re-renders
 */

import React, { useEffect, useState } from 'react';
import { useGameState } from '@/contexts/GameStateContext';
import StreamPlayer from '../StreamPlayer';

interface VideoAreaProps {
  className?: string;
  isScreenSharing: boolean;
}

// CRITICAL: Separate timer overlay component to prevent video re-renders
const TimerOverlay: React.FC = React.memo(() => {
  const { gameState } = useGameState();
  const localTimer = gameState.countdownTimer;
  const [isPulsing, setIsPulsing] = useState(false);
  const [initialTimer, setInitialTimer] = useState(30);

  // Handle pulse effect when less than 5 seconds
  useEffect(() => {
    if (localTimer <= 5 && localTimer > 0) {
      setIsPulsing(true);
    } else {
      setIsPulsing(false);
    }
  }, [localTimer]);

  // Update initial timer when betting phase starts or resets
  useEffect(() => {
    if (gameState.phase === 'betting') {
      if (localTimer > initialTimer || localTimer === initialTimer) {
        setInitialTimer(localTimer);
      }
    } else {
      setInitialTimer(30);
    }
  }, [gameState.phase, localTimer, initialTimer]);

  // Get timer color based on phase
  const getTimerColor = () => {
    switch (gameState.phase) {
      case 'betting':
        return localTimer <= 5 ? '#EF4444' : '#FFD100';
      case 'dealing':
        return '#10B981';
      case 'complete':
        return '#8B5CF6';
      default:
        return '#6B7280';
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

  // Calculate timer progress for circular display
  const getTimerProgress = () => {
    if (gameState.phase !== 'betting' || initialTimer === 0) return 0;
    return Math.max(0, Math.min(1, (initialTimer - localTimer) / initialTimer));
  };

  // Don't render anything if not in betting phase
  if (gameState.phase !== 'betting') return null;

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
      <div className={`relative transition-all duration-300 ${isPulsing ? 'animate-pulse scale-110' : 'scale-100'}`}>
        <div className="relative w-32 h-32 md:w-40 md:h-40">
          <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 128 128">
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="rgba(0, 0, 0, 0.6)"
              strokeWidth="8"
              fill="rgba(0, 0, 0, 0.4)"
            />
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
  );
});

TimerOverlay.displayName = 'TimerOverlay';

interface VideoAreaProps {
  className?: string;
  isScreenSharing: boolean;
  isGameLive?: boolean; // ✅ Optional prop to avoid gameState dependency
}

// VideoArea component with stable stream rendering
// CRITICAL: Memoized to prevent re-renders from balance updates
const VideoArea: React.FC<VideoAreaProps> = React.memo(({ className = '', isScreenSharing, isGameLive }) => {
  // ✅ Use optional prop OR fallback to gameState (but only read once)
  const gameStateForLive = useGameState();
  const live = isGameLive !== undefined ? isGameLive : gameStateForLive.gameState.phase !== 'idle';
  
  // Log when screen sharing state changes
  useEffect(() => {
    console.log('🎥 VideoArea: isScreenSharing =', isScreenSharing, 'isGameLive =', live);
  }, [isScreenSharing, live]);

  return (
    <div 
      className={`relative bg-black rounded-lg overflow-hidden ${className}`}
      data-video-area="true" // ✅ Marker for video area isolation
      // ✅ CRITICAL FIX #8: Simplified CSS - removed aggressive isolation that might hide video
      style={{
        position: 'relative',
        // ✅ Removed 'contain' - it might prevent video rendering
        // ✅ Removed 'isolation' - it might create issues
        // ✅ Keep simple transforms for GPU acceleration without hiding video
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        // ✅ Ensure video is always visible
        visibility: 'visible',
        opacity: 1,
      }}
      // ✅ Prevent all events from bubbling to video
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseUp={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onTouchMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Video stream layer - simplified */}
      <div 
        className="absolute inset-0"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
        }}
      >
        <StreamPlayer
          isLive={live}
          isScreenSharing={isScreenSharing}
          className="w-full h-full object-cover"
        />
        
        {/* Overlay Gradient for better text visibility */}
        <div 
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
          style={{
            pointerEvents: 'none', // Ensure overlay doesn't block
            zIndex: 2,
          }}
        />
      </div>

      {/* Timer overlay - renders independently - above video but isolated */}
      <div
        style={{
          position: 'relative',
          zIndex: 10, // Above video but isolated
          pointerEvents: 'none', // Don't block video
          contain: 'layout style paint', // Isolate from video
        }}
      >
        <TimerOverlay />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // ✅ ONLY re-render if screen sharing status OR game live status changes
  // This prevents balance/timer updates from disrupting the video stream
  return prevProps.isScreenSharing === nextProps.isScreenSharing &&
         (prevProps.isGameLive === nextProps.isGameLive || 
          (prevProps.isGameLive === undefined && nextProps.isGameLive === undefined)) &&
         prevProps.className === nextProps.className;
});

VideoArea.displayName = 'VideoArea';

export default VideoArea;
