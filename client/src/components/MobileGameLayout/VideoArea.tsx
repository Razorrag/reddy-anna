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
}

const VideoArea: React.FC<VideoAreaProps> = ({ className = '' }) => {
  const { gameState } = useGameState();
  
  // Use the gameState.timer directly
  const localTimer = gameState.countdownTimer;
  const [isPulsing, setIsPulsing] = useState(false);
  
  const streamTitle = 'Andar Bahar Live';

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

  // Calculate timer progress for circular display
  const getTimerProgress = () => {
    if (gameState.phase !== 'betting') return 0;
    const maxTime = 30; // 30 seconds for betting
    return Math.max(0, (maxTime - localTimer) / maxTime);
  };

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      {/* Live Video Stream */}
      <div className="relative aspect-video">
        <StreamPlayer
          isLive={gameState.phase !== 'idle'}
          className="w-full h-full"
        />

        {/* Game Status Overlay - Removed to keep video clean */}

        {/* Dealing Animation - Removed duplicate, using left badge instead */}

        {/* Overlay Gradient for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Circular Timer Overlay - CENTER OF SCREEN - ONLY VISIBLE DURING BETTING */}
      {gameState.phase === 'betting' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto">
          <div className={`relative transition-all duration-300 ${
            gameState.phase === 'betting' && isPulsing ? 'animate-pulse scale-110' : 'scale-100'
          }`}>
            {/* Large Circular Timer */}
            <div className="relative w-32 h-32">
              <svg className="transform -rotate-90 w-32 h-32">
                {/* Background circle */}
                <circle
                  cx="64"
                  cy="64"
                  r="58"
                  stroke="rgba(0, 0, 0, 0.5)"
                  strokeWidth="8"
                  fill="rgba(0, 0, 0, 0.3)"
                />
                {/* Progress circle - only show during betting */}
                <circle
                  cx="64"
                  cy="64"
                  r="58"
                  stroke={getTimerColor()}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 58}`}
                  strokeDashoffset={`${2 * Math.PI * 58 * (1 - getTimerProgress())}`}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              {/* Timer text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white font-bold text-4xl drop-shadow-lg">
                  {localTimer > 0 ? localTimer : '--'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Special indicator for non-betting phases to show game state */}
      {gameState.phase !== 'betting' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none">
          {gameState.phase === 'dealing' && (
            <div className="text-6xl animate-pulse text-green-400 font-bold">🎴</div>
          )}
          {gameState.phase === 'complete' && gameState.gameWinner && (
            <div className="text-center bg-black/70 backdrop-blur-sm rounded-xl p-4 border-2 border-yellow-500/50">
              <div className="text-2xl font-bold text-yellow-400 mb-2">
                {gameState.gameWinner === 'andar' ? 'ANDAR WON!' : 'BAHAR WON!'}
              </div>
              {gameState.winningCard && (
                <div className="text-white text-lg">{gameState.winningCard.display}</div>
              )}
            </div>
          )}
          {(gameState.phase === 'idle' || gameState.phase === 'opening') && (
            <div className="text-4xl text-gray-400 font-bold">⏳</div>
          )}
        </div>
      )}

      {/* Phase Indicator with Round Number */}
      <div className="absolute top-4 left-4">
        <div className="bg-black/80 px-3 py-2 rounded-lg border border-yellow-400 backdrop-blur-sm">
          <div className="text-yellow-400 text-lg font-bold">
            ROUND {gameState.currentRound}
          </div>
          <div className="text-white text-sm font-semibold">
            {getPhaseText()}
          </div>
          {gameState.phase === 'betting' && (
            <div className="text-gray-400 text-xs">
              {localTimer}s remaining
            </div>
          )}
        </div>
      </div>

      {/* Betting Locked Indicator */}
      {gameState.bettingLocked && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="bg-red-600/90 px-6 py-3 rounded-lg border-2 border-red-400 backdrop-blur-sm animate-bounce">
            <div className="text-white font-bold text-lg">
              BETTING LOCKED
            </div>
          </div>
        </div>
      )}

      {/* Game Status Overlay */}
      {gameState.phase === 'complete' && gameState.gameWinner && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">
              {gameState.gameWinner === 'andar' ? (
                <span className="text-red-500">ANDAR WON!</span>
              ) : gameState.currentRound === 1 ? (
                <span className="text-blue-500">BABA WON!</span>
              ) : gameState.currentRound === 2 ? (
                <span className="text-blue-500">SHOOT WON!</span>
              ) : (
                <span className="text-blue-500">BAHAR WON!</span>
              )}
            </div>
            {gameState.winningCard && (
              <div className="text-yellow-400 text-lg">
                Winning Card: {gameState.winningCard.display}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default VideoArea;
