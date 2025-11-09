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

  // ✅ FIX: Add debug logging to track bet updates
  useEffect(() => {
    console.log('🎲 BettingStrip - Player Bets Updated:', {
      round1Andar: gameState.playerRound1Bets.andar,
      round1Bahar: gameState.playerRound1Bets.bahar,
      round2Andar: gameState.playerRound2Bets.andar,
      round2Bahar: gameState.playerRound2Bets.bahar,
      currentRound: gameState.currentRound,
      phase: gameState.phase
    });
  }, [gameState.playerRound1Bets, gameState.playerRound2Bets, gameState.currentRound, gameState.phase]);

  // ✅ FIX: Don't fetch admin settings from player component
  // Bet limits should come from server in game state or use sensible defaults
  // This prevents 403 errors for players trying to access admin endpoints
  useEffect(() => {
    // Use default bet limits - these can be configured server-side
    // and sent in game state if needed
    setMinBet(100);
    setMaxBet(100000);
    console.log('✅ Using default bet limits: ₹100 - ₹100,000');
  }, []);

  // Note: Only use player-specific bet data, never access total bets (gameState.round1Bets/round2Bets)
  // which contain admin data (all players' total bets)

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
              </div>
              
              {/* Show ONLY player's total bets per round (not other players' bets) */}
              <div className="space-y-0.5">
                {(() => {
                  // Calculate total bet amount for Round 1 Andar
                  const r1Andar = Array.isArray(gameState.playerRound1Bets.andar) 
                    ? gameState.playerRound1Bets.andar 
                    : [];
                  const r1AndarTotal = r1Andar.reduce((sum: number, bet: any) => {
                    // ✅ FIX: Handle both number and object, with strict validation
                    let amount = 0;
                    if (typeof bet === 'number') {
                      amount = bet;
                    } else if (typeof bet === 'object' && bet !== null && 'amount' in bet) {
                      amount = typeof bet.amount === 'number' ? bet.amount : 0;
                    }
                    const validAmount = typeof amount === 'number' && !isNaN(amount) && amount >= 0 ? amount : 0;
                    return sum + validAmount;
                  }, 0);
                  
                  console.log(`🎯 ANDAR Button - R1 Bets:`, r1Andar);
                  console.log(`🎯 ANDAR Button - R1 Total: ₹${r1AndarTotal}`);
                  
                  // Calculate total bet amount for Round 2 Andar
                  const r2Andar = Array.isArray(gameState.playerRound2Bets.andar) 
                    ? gameState.playerRound2Bets.andar 
                    : [];
                  const r2AndarTotal = r2Andar.reduce((sum: number, bet: any) => {
                    let amount = 0;
                    if (typeof bet === 'number') {
                      amount = bet;
                    } else if (typeof bet === 'object' && bet !== null && 'amount' in bet) {
                      amount = typeof bet.amount === 'number' ? bet.amount : 0;
                    }
                    const validAmount = typeof amount === 'number' && !isNaN(amount) && amount >= 0 ? amount : 0;
                    return sum + validAmount;
                  }, 0);
                  
                  console.log(`🎯 ANDAR Button - R2 Bets:`, r2Andar);
                  console.log(`🎯 ANDAR Button - R2 Total: ₹${r2AndarTotal}`);
                  
                  return (
                    <>
                      {/* Always show Round 1 - user's own bets only */}
                      <div className="text-yellow-200 text-xs font-medium">
                        Round 1: ₹{r1AndarTotal.toLocaleString('en-IN')}
                      </div>
                      {/* Always show Round 2 when in round 2 or later - user's own bets only */}
                      {gameState.currentRound >= 2 && (
                        <div className="text-yellow-300 text-xs font-medium">
                          Round 2: ₹{r2AndarTotal.toLocaleString('en-IN')}
                        </div>
                      )}
                    </>
                  );
                })()}
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
                <div className="text-white font-bold text-lg">BAHAR</div>
              </div>
              
              {/* Show ONLY player's total bets per round (not other players' bets) */}
              <div className="space-y-0.5">
                {(() => {
                  // Calculate total bet amount for Round 1 Bahar
                  const r1Bahar = Array.isArray(gameState.playerRound1Bets.bahar) 
                    ? gameState.playerRound1Bets.bahar 
                    : [];
                  const r1BaharTotal = r1Bahar.reduce((sum: number, bet: any) => {
                    let amount = 0;
                    if (typeof bet === 'number') {
                      amount = bet;
                    } else if (typeof bet === 'object' && bet !== null && 'amount' in bet) {
                      amount = typeof bet.amount === 'number' ? bet.amount : 0;
                    }
                    const validAmount = typeof amount === 'number' && !isNaN(amount) && amount >= 0 ? amount : 0;
                    return sum + validAmount;
                  }, 0);
                  
                  // Calculate total bet amount for Round 2 Bahar
                  const r2Bahar = Array.isArray(gameState.playerRound2Bets.bahar) 
                    ? gameState.playerRound2Bets.bahar 
                    : [];
                  const r2BaharTotal = r2Bahar.reduce((sum: number, bet: any) => {
                    let amount = 0;
                    if (typeof bet === 'number') {
                      amount = bet;
                    } else if (typeof bet === 'object' && bet !== null && 'amount' in bet) {
                      amount = typeof bet.amount === 'number' ? bet.amount : 0;
                    }
                    const validAmount = typeof amount === 'number' && !isNaN(amount) && amount >= 0 ? amount : 0;
                    return sum + validAmount;
                  }, 0);
                  
                  return (
                    <>
                      {/* Always show Round 1 - user's own bets only */}
                      <div className="text-yellow-200 text-xs font-medium">
                        Round 1: ₹{r1BaharTotal.toLocaleString('en-IN')}
                      </div>
                      {/* Always show Round 2 when in round 2 or later - user's own bets only */}
                      {gameState.currentRound >= 2 && (
                        <div className="text-yellow-300 text-xs font-medium">
                          Round 2: ₹{r2BaharTotal.toLocaleString('en-IN')}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </button>
      </div>

    </div>
  );
};

export default BettingStrip;
