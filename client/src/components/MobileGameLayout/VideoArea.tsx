/**
 * VideoArea - Enhanced video stream area with circular countdown timer overlay
 * 
 * Features:
 * - Circular countdown timer with yellow stroke
 * - Round number display
 * - Pulse effect when <5 seconds
 * - Phase-specific colors (betting/dealing)
 * - Smooth timer animations
 */

import React, { useEffect, useState } from 'react';
import { useGameState } from '@/contexts/GameStateContext';

interface VideoAreaProps {
  className?: string;
}

const VideoArea: React.FC<VideoAreaProps> = ({ className = '' }) => {
  const { gameState, setCountdown } = useGameState();
  const [localTimer, setLocalTimer] = useState(gameState.countdownTimer);
  const [isPulsing, setIsPulsing] = useState(false);

  // Sync local timer with game state
  useEffect(() => {
    setLocalTimer(gameState.countdownTimer);
  }, [gameState.countdownTimer]);

  // Handle countdown logic
  useEffect(() => {
    if (gameState.phase === 'betting' && localTimer > 0) {
      const timer = setTimeout(() => {
        const newTime = localTimer - 1;
        setLocalTimer(newTime);
        setCountdown(newTime);
        
        // Trigger pulse effect when less than 5 seconds
        if (newTime <= 5 && newTime > 0) {
          setIsPulsing(true);
        } else {
          setIsPulsing(false);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [localTimer, gameState.phase, setCountdown]);

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
      {/* Video Stream Placeholder */}
      <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-black">
        {/* Simulated video stream */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-lg mb-2">Live Stream</div>
            <div className="text-gray-500 text-sm">Game ID: {gameState.gameId || 'Waiting...'}</div>
            {gameState.phase === 'idle' && (
              <div className="text-yellow-400 text-sm mt-4 animate-pulse">
                Waiting for game to start...
              </div>
            )}
          </div>
        </div>

        {/* Overlay Gradient for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Circular Timer Overlay */}
      {(gameState.phase === 'betting' || gameState.phase === 'dealing') && (
        <div className="absolute top-4 right-4 pointer-events-none">
          <div className={`relative ${isPulsing ? 'animate-pulse' : ''}`}>
            {/* Simple Circular Timer */}
            <div className="relative w-20 h-20">
              <svg className="transform -rotate-90 w-20 h-20">
                {/* Background circle */}
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="rgba(0, 0, 0, 0.3)"
                  strokeWidth="6"
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke={getTimerColor()}
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - getTimerProgress())}`}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              {/* Timer text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white font-bold text-lg">
                  {localTimer}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phase Indicator */}
      <div className="absolute top-4 left-4">
        <div className="bg-black/80 px-3 py-2 rounded-lg border border-gray-700 backdrop-blur-sm">
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
                <span className="text-red-500">ANDAR WINS!</span>
              ) : (
                <span className="text-blue-500">BAHAR WINS!</span>
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

      {/* Connection Status Indicator */}
      <div className="absolute bottom-4 left-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-green-400 text-xs">Connected</span>
        </div>
      </div>

      {/* Viewer Count (placeholder) */}
      <div className="absolute bottom-4 right-4">
        <div className="bg-black/60 px-2 py-1 rounded-full border border-gray-700">
          <span className="text-gray-300 text-xs">
            👁️ 127 watching
          </span>
        </div>
      </div>
    </div>
  );
};

export default VideoArea;
