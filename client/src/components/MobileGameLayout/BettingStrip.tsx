/**
 * BettingStrip - Andar/Opening Card/Bahar betting interface
 * 
 * Three-segment horizontal betting strip with Andar (left),
 * opening card (center), and Bahar (right) sections.
 * Enhanced with round-specific bet display and asymmetric payout multipliers.
 */

import React from 'react';
import { useGameState } from '@/contexts/GameStateContext';
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
    if (isPlacingBet || gameState.phase !== 'betting' || gameState.countdownTimer <= 0 || gameState.bettingLocked) {
      return;
    }
    
    if (selectedBetAmount === 0) {
      // Show toast or notification to select chip first
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
            <div className="text-yellow-300 text-sm font-semibold">{getPayoutMultiplier('andar')}</div>
            <div className="text-white text-xs mt-2">
              Total: ₹{currentRoundBets.andar.toLocaleString('en-IN')}
            </div>
            {currentPlayerBets.andar > 0 && (
              <div className="text-yellow-200 text-xs">
                You: ₹{currentPlayerBets.andar.toLocaleString('en-IN')}
              </div>
            )}
          </div>
        </button>

        {/* Opening Card Section */}
        <div className="flex-1 bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg p-4 border-2 border-gray-600/50">
          <div className="flex justify-center items-center h-full">
            {gameState.selectedOpeningCard ? (
              <div className="text-center">
                <div className="text-yellow-400 text-xs font-semibold mb-2">Opening Card</div>
                <div className="bg-white rounded-lg p-3 shadow-lg border-2 border-yellow-500/50">
                  <div className="text-2xl font-bold text-black">
                    {gameState.selectedOpeningCard.display}
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
            <div className="text-yellow-300 text-sm font-semibold">{getPayoutMultiplier('bahar')}</div>
            <div className="text-white text-xs mt-2">
              Total: ₹{currentRoundBets.bahar.toLocaleString('en-IN')}
            </div>
            {currentPlayerBets.bahar > 0 && (
              <div className="text-yellow-200 text-xs">
                You: ₹{currentPlayerBets.bahar.toLocaleString('en-IN')}
              </div>
            )}
          </div>
        </button>
      </div>

    </div>
  );
};

export default BettingStrip;
