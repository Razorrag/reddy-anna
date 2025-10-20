/**
 * VideoArea - Video player with countdown timer overlay
 * 
 * Displays the live stream simulation with circular countdown timer
 * and opening card preview overlay.
 */

import React from 'react';
import { CircularTimer } from '../CircularTimer';
import LiveStreamSimulation from '../LiveStreamSimulation';
import type { GameState } from '../GameLogic/GameLogic';

interface VideoAreaProps {
  gameState: GameState;
  className?: string;
}

const VideoArea: React.FC<VideoAreaProps> = ({ gameState, className = '' }) => {
  return (
    <div className={`relative bg-black ${className}`}>
      {/* Video Background */}
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <LiveStreamSimulation />
      </div>

      {/* Countdown Timer Overlay */}
      {gameState.phase === 'betting' && gameState.countdown > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <CircularTimer
              seconds={gameState.countdown}
              totalSeconds={60}
              phase={gameState.phase === 'betting' ? 'betting' : 'idle'}
              isVisible={gameState.phase === 'betting' && gameState.countdown > 0}
            />
            {/* Round text */}
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-white text-xs font-medium">
              Round {gameState.currentRound}
            </div>
          </div>
        </div>
      )}

      {/* Opening Card Preview */}
      {gameState.openingCard && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg p-2 border-2 border-yellow-500/50">
          <div className="text-center">
            <div className="text-yellow-400 text-xs font-semibold mb-1">Opening Card</div>
            <div className="bg-white rounded-lg p-3 shadow-lg">
              <div className="text-2xl font-bold text-black">
                {gameState.openingCard.display}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Phase Indicator */}
      <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-full px-3 py-1 border border-yellow-500/30">
        <div className="text-yellow-400 text-xs font-semibold capitalize">
          {gameState.phase}
        </div>
      </div>

      {/* Winner Announcement */}
      {gameState.winner && gameState.phase === 'completed' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/90 backdrop-blur-sm rounded-2xl p-6 border-4 border-yellow-500 shadow-2xl animate-bounce">
            <div className="text-center">
              <div className="text-yellow-400 text-2xl font-bold mb-2">
                {gameState.winner.toUpperCase()} WINS!
              </div>
              <div className="text-white text-sm">
                Round {gameState.currentRound} Complete
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoArea;
