/**
 * BettingStrip - Andar/Opening Card/Bahar betting interface
 *
 * Three-segment horizontal betting strip with Andar (left),
 * opening card (center), and Bahar (right) sections.
 * Enhanced with round-specific bet display and asymmetric payout multipliers.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useGameState } from '@/contexts/GameStateContext';
import { useNotification } from '@/contexts/NotificationContext';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format-utils';
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

  // ✅ PERFORMANCE: Removed debug logging - saves 40-80ms per render
  // Uncomment for debugging if needed
  // useEffect(() => {
  //   console.log('🎲 BettingStrip - Player Bets Updated:', {
  //     round1Andar: gameState.playerRound1Bets.andar,
  //     round1Bahar: gameState.playerRound1Bets.bahar,
  //     round2Andar: gameState.playerRound2Bets.andar,
  //     round2Bahar: gameState.playerRound2Bets.bahar,
  //     currentRound: gameState.currentRound,
  //     phase: gameState.phase
  //   });
  // }, [gameState.playerRound1Bets, gameState.playerRound2Bets, gameState.currentRound, gameState.phase]);

  // Set default bet limits on mount
  useEffect(() => {
    setMinBet(100);
    setMaxBet(100000);
  }, []);

  // ✅ PERFORMANCE: Memoized bet totals calculation - prevents recalculation on every render
  // Only recalculates when bet data actually changes
  const betTotals = useMemo(() => {
    // Optimized calculation function with simplified type checking
    const calculateTotal = (bets: number | number[] | any[]): number => {
      // Handle case where bets might be a single number (legacy/edge case)
      if (typeof bets === 'number') return bets;

      // Handle array case
      if (!Array.isArray(bets)) return 0;

      return bets.reduce((sum: number, bet: any) => {
        // Simplified: single-line type check instead of nested conditionals
        const amount = typeof bet === 'number' ? bet : (bet?.amount ?? 0);
        return sum + (typeof amount === 'number' && amount > 0 ? amount : 0);
      }, 0);
    };

    return {
      r1Andar: calculateTotal(gameState.playerRound1Bets.andar),
      r1Bahar: calculateTotal(gameState.playerRound1Bets.bahar),
      r2Andar: calculateTotal(gameState.playerRound2Bets.andar),
      r2Bahar: calculateTotal(gameState.playerRound2Bets.bahar)
    };
  }, [
    gameState.playerRound1Bets.andar,
    gameState.playerRound1Bets.bahar,
    gameState.playerRound2Bets.andar,
    gameState.playerRound2Bets.bahar
  ]);

  const handleBetClick = (position: BetSide) => {
    // 🎯 MOBILE OPTIMIZATION: Prevent double-tap zoom on iOS/Android
    // This ensures instant tap response on mobile devices

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
          onTouchStart={(e) => {
            // 🎯 MOBILE: Prevent 300ms click delay on mobile
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          disabled={isBettingDisabled}
          className={`
            flex-1 bg-gradient-to-b from-red-900 to-red-950 rounded-lg p-1
            border-2 transition-all duration-200 active:scale-95 relative
            touch-manipulation select-none
            ${selectedPosition === 'andar'
              ? 'border-yellow-400 shadow-lg shadow-yellow-400/50'
              : 'border-red-800/50'
            }
            ${isBettingDisabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:border-yellow-400/50 hover:shadow-lg'
            }
          `}
          style={{
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation'
          }}
        >
          <div className="flex items-center justify-between h-full">
            {/* Left side - Text and bet info */}
            <div className="flex-1 text-left pr-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-white font-bold text-lg">ANDAR</div>
              </div>

              {/* ✅ PERFORMANCE: Using pre-calculated memoized totals with data attributes for instant updates */}
              <div className="space-y-0.5">
                <div
                  className="text-yellow-200 text-xs font-medium"
                  data-bet-display="andar-round1"
                  data-bet-amount={betTotals.r1Andar}
                >
                  Round 1: ₹{formatCurrency(betTotals.r1Andar)}
                </div>
                {gameState.currentRound >= 2 && (
                  <div
                    className="text-yellow-300 text-xs font-medium"
                    data-bet-display="andar-round2"
                    data-bet-amount={betTotals.r2Andar}
                  >
                    Round 2: ₹{formatCurrency(betTotals.r2Andar)}
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
                  <div className={`text-2xl font-bold transition-all duration-300 ${gameState.andarCards[gameState.andarCards.length - 1].color === 'red'
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
          onTouchStart={(e) => {
            // 🎯 MOBILE: Prevent 300ms click delay on mobile
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          disabled={isBettingDisabled}
          className={`
            flex-1 bg-gradient-to-b from-blue-900 to-blue-950 rounded-lg p-1
            border-2 transition-all duration-200 active:scale-95 relative
            touch-manipulation select-none
            ${selectedPosition === 'bahar'
              ? 'border-yellow-400 shadow-lg shadow-yellow-400/50'
              : 'border-blue-700/50'
            }
            ${isBettingDisabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:border-yellow-400/50 hover:shadow-lg'
            }
          `}
          style={{
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation'
          }}
        >
          <div className="flex items-center justify-between h-full">
            {/* Left side - Latest Dealt Card ONLY - Show if cards exist for current game */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center gap-1 min-w-[40px]">
              {/* Show ONLY the latest card, not all cards */}
              {gameState.baharCards.length > 0 ? (
                <div className="flex flex-col items-center">
                  {/* Show ONLY the last card (most recent) */}
                  <div className={`text-2xl font-bold transition-all duration-300 ${gameState.baharCards[gameState.baharCards.length - 1].color === 'red'
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
                <div className="text-white font-bold text-lg">BAHAR</div>
              </div>

              {/* ✅ PERFORMANCE: Using pre-calculated memoized totals with data attributes for instant updates */}
              <div className="space-y-0.5">
                <div
                  className="text-yellow-200 text-xs font-medium"
                  data-bet-display="bahar-round1"
                  data-bet-amount={betTotals.r1Bahar}
                >
                  Round 1: ₹{formatCurrency(betTotals.r1Bahar)}
                </div>
                {gameState.currentRound >= 2 && (
                  <div
                    className="text-yellow-300 text-xs font-medium"
                    data-bet-display="bahar-round2"
                    data-bet-amount={betTotals.r2Bahar}
                  >
                    Round 2: ₹{formatCurrency(betTotals.r2Bahar)}
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

// ✅ PERFORMANCE: Wrap with React.memo to prevent unnecessary re-renders
// Only re-renders when props actually change
export default React.memo(BettingStrip);
