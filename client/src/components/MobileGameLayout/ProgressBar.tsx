/**
 * ProgressBar - Bottom progress indicator
 * 
 * Thin yellow progress bar at the bottom showing round progress
 */

import React from 'react';
import type { GameState } from '../GameLogic/GameLogic';

interface ProgressBarProps {
  gameState: GameState;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ gameState, className = '' }) => {
  // Calculate progress based on countdown timer
  const progress = gameState.phase === 'betting' && gameState.countdown > 0
    ? ((60 - gameState.countdown) / 60) * 100
    : gameState.phase === 'dealing' 
      ? 75 
      : gameState.phase === 'completed' 
        ? 100 
        : 0;

  return (
    <div className={`bg-gray-800 ${className}`}>
      <div 
        className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default ProgressBar;
