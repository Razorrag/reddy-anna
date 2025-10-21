 /**
 * BettingStrip - Andar/Opening Card/Bahar betting interface
 * 
 * Three-segment horizontal betting strip with Andar (left),
 * opening card (center), and Bahar (right) sections.
 * Enhanced with round-specific bet display and asymmetric payout multipliers.
 */

import React from 'react';
import { useGameState } from '@/contexts/GameStateContext';
import { useNotification } from '@/contexts/NotificationContext';
import type { BetSide } from '@/types/game';

interface BettingStripProps {
  selectedPosition: BetSide | null;
  selectedBetAmount: number;
  onPositionSelect: (position: BetSide) => void;
  onPlaceBet: (position: BetSide) => void;
  isPlacingBet: boolean;
  className?: string;
}

const BettingStrip: React.FC<BettingStripProps> = ({
  selectedPosition,
  selectedBetAmount,
  onPlaceBet,
  isPlacingBet,
  className = ''
}) => {
  const { 
    gameState
  } = useGameState();
  const { showNotification } = useNotification();

  // Get current round bets
  const currentRoundBets = gameState.currentRound === 1 ? gameState.round1Bets : gameState.round2Bets;
  const currentPlayerBets = gameState.currentRound === 1 ? gameState.playerRound1Bets : gameState.playerRound2Bets;

  // Calculate asymmetric payout multipliers based on round and potential winner
  const getPayoutMultiplier = (side: BetSide): string => {
    if (gameState.currentRound === 1) {
      return side === 'andar' ? '1:1' : '1:0';
    } else if (gameState.currentRound === 2) {
      return side === 'andar' ? '1:1' : '1:0 (R1) + 1:1 (R2)';
    } else {
      return '1:1';
    }
  };

  const handleBetClick = (position: BetSide) => {
    // Use gameState directly instead of separate checks
    if (isPlacingBet ||
        gameState.phase !== 'betting' ||
        gameState.bettingLocked) {
      return;
    }

    if (selectedBetAmount === 0) {
      showNotification('Please select a chip first', 'error');
      return;
    }

    onPlaceBet(position);
  };

  const isBettingDisabled = isPlacingBet || gameState.phase !== 'betting' || gameState.countdownTimer <= 0 || gameState.bettingLocked;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Main Betting Strip */}
      <div className="flex gap-2">
        {/* Andar Section */}
        <button
          onClick={() => handleBetClick('andar')}
          disabled={isBettingDisabled}
          className={`
            flex-1 bg-gradient-to-b from-red-600 to-red-700 rounded-lg p-3 
            border-2 transition-all duration-200 active:scale-95 relative
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
          <div className="flex items-center justify-between h-full">
            {/* Left side - Text and bet info */}
            <div className="flex-1 text-left pr-2">
              <div className="text-white font-bold text-sm mb-2">ANDAR</div>
              
              {/* Show bet amounts */}
              <div>
                <div className="text-white text-xs">
                  Total: ₹{currentRoundBets.andar.toLocaleString('en-IN')}
                </div>
                {currentPlayerBets.andar > 0 && (
                  <div className="text-yellow-200 text-xs">
                    You: ₹{currentPlayerBets.andar.toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            </div>

            {/* Right side - Empty space (opening card moved to center) */}
            <div className="flex-shrink-0 w-12 h-16 flex items-center justify-center">
              {/* Opening card is now displayed in the center section */}
            </div>
          </div>
        </button>

        {/* Opening Card Section - Center */}
        <div className="w-20 bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg p-2 border-2 border-gray-600/50 flex flex-col justify-center items-center">
          {gameState.selectedOpeningCard ? (
            <div className="relative">
              {/* Card with enhanced styling */}
              <div className={`
                w-12 h-16 rounded-lg shadow-2xl border-2 
                transform transition-all duration-300 hover:scale-105
                ${gameState.selectedOpeningCard.color === 'red' 
                  ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-400' 
                  : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-400'
                }
              `}>
                {/* Card content */}
                <div className="flex flex-col items-center justify-center h-full">
                  <div className={`
                    text-sm font-bold
                    ${gameState.selectedOpeningCard.color === 'red' ? 'text-red-600' : 'text-gray-800'}
                  `}>
                    {gameState.selectedOpeningCard.display}
                  </div>
                  <div className={`
                    text-xs font-semibold
                    ${gameState.selectedOpeningCard.color === 'red' ? 'text-red-500' : 'text-gray-600'}
                  `}>
                    {gameState.selectedOpeningCard.suit?.toUpperCase()}
                  </div>
                </div>
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent rounded-lg" />
              </div>
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-yellow-400/30 rounded-lg blur-sm animate-pulse" />
            </div>
          ) : (
            <div className="w-12 h-16 flex items-center justify-center">
              <div className="text-gray-400 text-xl font-bold">?</div>
            </div>
          )}
          <div className="text-yellow-400 text-xs font-semibold mt-1">Opening Card</div>
        </div>

        {/* Bahar Section */}
        <button
          onClick={() => handleBetClick('bahar')}
          disabled={isBettingDisabled}
          className={`
            flex-1 bg-gradient-to-b from-blue-900 to-blue-950 rounded-lg p-3 
            border-2 transition-all duration-200 active:scale-95 relative
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
          <div className="flex items-center justify-between h-full">
            {/* Left side - Empty space (opening card moved to center) */}
            <div className="flex-shrink-0 w-12 h-16 flex items-center justify-center">
              {/* Opening card is now displayed in the center section */}
            </div>

            {/* Right side - Text and bet info */}
            <div className="flex-1 text-right pl-2">
              <div className="text-white font-bold text-sm mb-2">BAHAR</div>
              
              {/* Show bet amounts */}
              <div>
                <div className="text-white text-xs">
                  Total: ₹{currentRoundBets.bahar.toLocaleString('en-IN')}
                </div>
                {currentPlayerBets.bahar > 0 && (
                  <div className="text-yellow-200 text-xs">
                    You: ₹{currentPlayerBets.bahar.toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </button>
      </div>

    </div>
  );
};

export default BettingStrip;
