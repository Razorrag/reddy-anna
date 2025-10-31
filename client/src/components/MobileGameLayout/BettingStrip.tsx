 /**
 * BettingStrip - Andar/Opening Card/Bahar betting interface
 * 
 * Three-segment horizontal betting strip with Andar (left),
 * opening card (center), and Bahar (right) sections.
 * Enhanced with round-specific bet display and asymmetric payout multipliers.
 */

import React, { useState, useEffect } from 'react';
import { useGameState } from '@/contexts/GameStateContext';
import { useNotification } from '@/contexts/NotificationContext';
import { apiClient } from '@/lib/api-client';
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
  
  const [minBet, setMinBet] = useState(1000);
  const [maxBet, setMaxBet] = useState(100000);

  useEffect(() => {
    // Fetch game settings for min/max bet limits
    const fetchSettings = async () => {
      try {
        const response = await apiClient.get<{
          success: boolean;
          settings?: {
            settingsMinBetAmount?: number;
            settingsMaxBetAmount?: number;
          };
        }>('/admin/game-settings');
        
        if (response.success && response.settings) {
          setMinBet(response.settings.settingsMinBetAmount || 1000);
          setMaxBet(response.settings.settingsMaxBetAmount || 100000);
        }
      } catch (error) {
        console.error('Failed to fetch bet limits:', error);
        // Keep defaults if fetch fails
      }
    };
    fetchSettings();
  }, []);

  // Get current round bets
  const currentRoundBets = gameState.currentRound === 1 ? gameState.round1Bets : gameState.round2Bets;
  const currentPlayerBets = gameState.currentRound === 1 ? gameState.playerRound1Bets : gameState.playerRound2Bets;
  
  // Determine which side has less bets (for highlighting)
  const andarTotal = gameState.round1Bets.andar + gameState.round2Bets.andar;
  const baharTotal = gameState.round1Bets.bahar + gameState.round2Bets.bahar;
  const hasLessAndar = andarTotal < baharTotal;
  const hasLessBahar = baharTotal < andarTotal;

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
    // Enhanced betting logic - allow betting in round 2 during 'betting' phase
    if (isPlacingBet || 
        gameState.phase !== 'betting' || 
        gameState.bettingLocked || 
        gameState.countdownTimer <= 0) {
      // Provide more specific feedback for different scenarios
      if (gameState.bettingLocked) {
        showNotification('Betting period has ended. Waiting for cards to be dealt.', 'error');
      } else if (gameState.phase !== 'betting') {
        showNotification(`Betting is not open in ${gameState.phase} phase`, 'error');
      } else if (gameState.countdownTimer <= 0) {
        showNotification('Betting time is up!', 'error');
      } else if (isPlacingBet) {
        showNotification('Please wait, processing your previous bet...', 'info');
      }
      return;
    }

    if (selectedBetAmount === 0) {
      showNotification('Please select a chip first', 'error');
      return;
    }
    
    // Check if player has sufficient balance for the bet (convert to number if needed)
    const currentBalance = typeof gameState.playerWallet === 'string' 
      ? parseFloat(gameState.playerWallet) 
      : Number(gameState.playerWallet);
    
    if (isNaN(currentBalance) || currentBalance < selectedBetAmount) {
      showNotification('Insufficient balance for this bet', 'error');
      return;
    }

    onPlaceBet(position);
  };

  // Enhanced betting disable logic - ensure betting is allowed in round 2 if in betting phase
  // Only disable if timer is 0 AND we're still in betting phase (not during dealing)
  const isBettingDisabled = isPlacingBet ||
                           gameState.phase !== 'betting' ||
                           gameState.bettingLocked ||
                           (gameState.countdownTimer <= 0 && gameState.phase === 'betting');

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Main Betting Strip */}
      <div className="flex gap-2">
        {/* Andar Section */}
        <button
          onClick={() => handleBetClick('andar')}
          disabled={isBettingDisabled}
          className={`
            flex-1 bg-gradient-to-b from-red-900 to-red-950 rounded-lg p-1 
            border-2 transition-all duration-200 active:scale-95 relative
            ${selectedPosition === 'andar' 
              ? 'border-yellow-400 shadow-lg shadow-yellow-400/50' 
              : 'border-red-800/50'
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
              <div className="flex items-center gap-2 mb-1">
                <div className="text-white font-bold text-lg">ANDAR</div>
                {hasLessAndar && (
                  <span className="px-2 py-0.5 bg-yellow-500/80 text-black text-[10px] font-bold rounded animate-pulse">
                    LESS
                  </span>
                )}
              </div>
              
              {/* Show ONLY player's individual bets - NO ADMIN DATA */}
              <div className="space-y-0.5">
                {gameState.playerRound1Bets.andar > 0 && (
                  <div className="text-yellow-200 text-xs font-medium">
                    Your Bet: ₹{gameState.playerRound1Bets.andar.toLocaleString('en-IN')}
                  </div>
                )}
                {gameState.currentRound >= 2 && gameState.playerRound2Bets.andar > 0 && (
                  <div className="text-yellow-300 text-xs font-medium">
                    R2 Bet: ₹{gameState.playerRound2Bets.andar.toLocaleString('en-IN')}
                  </div>
                )}
                {(gameState.playerRound1Bets.andar === 0 && gameState.playerRound2Bets.andar === 0) && (
                  <div className="text-gray-400 text-xs">
                    No bets placed
                  </div>
                )}
              </div>
            </div>

            {/* Right side - Latest Dealt Card ONLY - Show if cards exist for current game */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center gap-1 min-w-[40px]">
              {/* Show ONLY the latest card, not all cards */}
              {gameState.andarCards.length > 0 ? (
                <div className="flex flex-col items-center">
                  {/* Show ONLY the last card (most recent) */}
                  <div className={`text-2xl font-bold transition-all duration-300 ${
                    gameState.andarCards[gameState.andarCards.length - 1].color === 'red' 
                      ? 'text-red-300' 
                      : 'text-yellow-300'
                  }`}>
                    {gameState.andarCards[gameState.andarCards.length - 1].display}
                  </div>
                  {/* Card count indicator - shows total count */}
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    ({gameState.andarCards.length})
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-xs">-</div>
              )}
            </div>
          </div>
        </button>

        {/* Opening Card Section - Center - Enhanced Visibility */}
        <div className="w-20 bg-gradient-to-b from-yellow-900/40 to-yellow-950/40 rounded-lg px-2 py-2 border-2 border-gold/50 flex flex-col justify-center items-center shadow-lg shadow-gold/20">
          {gameState.selectedOpeningCard ? (
            <div className="relative flex flex-col items-center justify-center gap-0.5">
              {/* Symbol - Larger and more visible */}
              <div className={`
                text-2xl font-bold
                text-gold
                transform transition-all duration-300 hover:scale-110
                drop-shadow-lg
              `}>
                {gameState.selectedOpeningCard.display}
              </div>
              {/* Suit - More visible */}
              <div className={`
                text-xs font-bold
                text-gold/90
                transform transition-all duration-300 hover:scale-110
                uppercase
              `}>
                {gameState.selectedOpeningCard.suit}
              </div>
              {/* Enhanced Glow effect */}
              <div className="absolute inset-0 bg-yellow-400/25 rounded-lg blur-md -z-10" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="text-gold/50 text-2xl font-bold">?</div>
              <div className="text-gold/40 text-[10px] font-semibold">OPENING</div>
            </div>
          )}
        </div>

        {/* Bahar Section */}
        <button
          onClick={() => handleBetClick('bahar')}
          disabled={isBettingDisabled}
          className={`
            flex-1 bg-gradient-to-b from-blue-900 to-blue-950 rounded-lg p-1 
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
            {/* Left side - Latest Dealt Card ONLY - Show if cards exist for current game */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center gap-1 min-w-[40px]">
              {/* Show ONLY the latest card, not all cards */}
              {gameState.baharCards.length > 0 ? (
                <div className="flex flex-col items-center">
                  {/* Show ONLY the last card (most recent) */}
                  <div className={`text-2xl font-bold transition-all duration-300 ${
                    gameState.baharCards[gameState.baharCards.length - 1].color === 'red' 
                      ? 'text-red-300' 
                      : 'text-yellow-300'
                  }`}>
                    {gameState.baharCards[gameState.baharCards.length - 1].display}
                  </div>
                  {/* Card count indicator - shows total count */}
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    ({gameState.baharCards.length})
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-xs">-</div>
              )}
            </div>

            {/* Right side - Text and bet info */}
            <div className="flex-1 text-right pl-2">
              <div className="flex items-center justify-end gap-2 mb-1">
                {hasLessBahar && (
                  <span className="px-2 py-0.5 bg-yellow-500/80 text-black text-[10px] font-bold rounded animate-pulse">
                    LESS
                  </span>
                )}
                <div className="text-white font-bold text-lg">BAHAR</div>
              </div>
              
              {/* Show ONLY player's individual bets - NO ADMIN DATA */}
              <div className="space-y-0.5">
                {gameState.playerRound1Bets.bahar > 0 && (
                  <div className="text-yellow-200 text-xs font-medium">
                    Your Bet: ₹{gameState.playerRound1Bets.bahar.toLocaleString('en-IN')}
                  </div>
                )}
                {gameState.currentRound >= 2 && gameState.playerRound2Bets.bahar > 0 && (
                  <div className="text-yellow-300 text-xs font-medium">
                    R2 Bet: ₹{gameState.playerRound2Bets.bahar.toLocaleString('en-IN')}
                  </div>
                )}
                {(gameState.playerRound1Bets.bahar === 0 && gameState.playerRound2Bets.bahar === 0) && (
                  <div className="text-gray-400 text-xs">
                    No bets placed
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
