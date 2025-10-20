/**
 * BettingStrip - Andar/Opening Card/Bahar betting interface
 * 
 * Three-segment horizontal betting strip with Andar (left),
 * opening card (center), and Bahar (right) sections.
 */

import React from 'react';
import type { GameState } from '../GameLogic/GameLogic';
import type { BetSide } from '../../types/game';

interface BettingStripProps {
  gameState: GameState;
  selectedPosition: BetSide | null;
  selectedBetAmount: number;
  onPositionSelect: (position: BetSide) => void;
  onPlaceBet: (position: BetSide) => void;
  isPlacingBet: boolean;
  className?: string;
}

const BettingStrip: React.FC<BettingStripProps> = ({
  gameState,
  selectedPosition,
  selectedBetAmount,
  // onPositionSelect,
  onPlaceBet,
  isPlacingBet,
  className = ''
}) => {
  const currentBetAmount = selectedPosition 
    ? (selectedPosition === 'andar' ? gameState.totalBets.andar : gameState.totalBets.bahar)
    : 0;

  const handleBetClick = (position: BetSide) => {
    if (isPlacingBet || gameState.phase !== 'betting' || gameState.countdown <= 0) {
      return;
    }
    
    if (selectedBetAmount === 0) {
      // Show toast or notification to select chip first
      return;
    }
    
    onPlaceBet(position);
  };

  const isBettingDisabled = isPlacingBet || gameState.phase !== 'betting' || gameState.countdown <= 0;

  return (
    <div className={`flex gap-2 ${className}`}>
      {/* Andar Section */}
      <button
        onClick={() => handleBetClick('andar')}
        disabled={isBettingDisabled}
        className={`
          flex-1 bg-gradient-to-b from-red-600 to-red-700 rounded-lg p-4 
          border-2 transition-all duration-200 active:scale-95
          ${selectedPosition === 'andar' 
            ? 'border-yellow-400 shadow-lg shadow-yellow-400/50' 
            : 'border-red-500/50'
          }
          ${isBettingDisabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:border-yellow-400/50 hover:shadow-lg'
          }
        `}
      >
        <div className="text-center">
          <div className="text-white font-bold text-lg mb-1">ANDAR</div>
          <div className="text-yellow-300 text-sm font-semibold">1:1</div>
          <div className="text-white text-xs mt-2">
            ₹{currentBetAmount.toLocaleString('en-IN')}
          </div>
        </div>
      </button>

      {/* Opening Card Section */}
      <div className="flex-1 bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg p-4 border-2 border-gray-600/50">
        <div className="flex justify-center items-center h-full">
          {gameState.openingCard ? (
            <div className="text-center">
              <div className="text-yellow-400 text-xs font-semibold mb-2">Opening Card</div>
              <div className="bg-white rounded-lg p-3 shadow-lg border-2 border-yellow-500/50">
                <div className="text-2xl font-bold text-black">
                  {gameState.openingCard.display}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-gray-400 text-sm">Waiting for</div>
              <div className="text-gray-400 text-sm">Opening Card</div>
            </div>
          )}
        </div>
      </div>

      {/* Bahar Section */}
      <button
        onClick={() => handleBetClick('bahar')}
        disabled={isBettingDisabled}
        className={`
          flex-1 bg-gradient-to-b from-blue-900 to-blue-950 rounded-lg p-4 
          border-2 transition-all duration-200 active:scale-95
          ${selectedPosition === 'bahar' 
            ? 'border-yellow-400 shadow-lg shadow-yellow-400/50' 
            : 'border-blue-700/50'
          }
          ${isBettingDisabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:border-yellow-400/50 hover:shadow-lg'
          }
        `}
      >
        <div className="text-center">
          <div className="text-white font-bold text-lg mb-1">BAHAR</div>
          <div className="text-yellow-300 text-sm font-semibold">1:1</div>
          <div className="text-white text-xs mt-2">
            ₹{currentBetAmount.toLocaleString('en-IN')}
          </div>
        </div>
      </button>
    </div>
  );
};

export default BettingStrip;
