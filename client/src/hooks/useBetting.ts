/**
 * CUSTOM HOOK: useBetting
 * 
 * Extracts betting logic from player-game.tsx
 * Manages bet amounts, validation, and placement
 */

import { useState, useCallback } from 'react';
import { usePlaceBet, useUserBalance } from './useGameQuery';

interface BetState {
  andarAmount: number;
  baharAmount: number;
  round: string;
}

export function useBetting(currentRound: string, minBet: number = 1000, maxBet: number = 100000) {
  const [betState, setBetState] = useState<BetState>({
    andarAmount: 0,
    baharAmount: 0,
    round: currentRound,
  });

  const { data: balance } = useUserBalance();
  const placeBetMutation = usePlaceBet();

  // Update bet amount
  const updateBet = useCallback((side: 'andar' | 'bahar', amount: number) => {
    setBetState(prev => ({
      ...prev,
      [`${side}Amount`]: amount,
    }));
  }, []);

  // Validate bet
  const validateBet = useCallback((side: 'andar' | 'bahar', amount: number): { valid: boolean; error?: string } => {
    if (amount < minBet) {
      return { valid: false, error: `Minimum bet is ₹${minBet}` };
    }

    if (amount > maxBet) {
      return { valid: false, error: `Maximum bet is ₹${maxBet}` };
    }

    if (balance && amount > balance) {
      return { valid: false, error: 'Insufficient balance' };
    }

    const totalBet = (side === 'andar' ? amount : betState.andarAmount) + 
                     (side === 'bahar' ? amount : betState.baharAmount);

    if (balance && totalBet > balance) {
      return { valid: false, error: 'Total bets exceed balance' };
    }

    return { valid: true };
  }, [balance, betState, minBet, maxBet]);

  // Place bet
  const placeBet = useCallback(async (side: 'andar' | 'bahar') => {
    const amount = side === 'andar' ? betState.andarAmount : betState.baharAmount;

    // Validate
    const validation = validateBet(side, amount);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Place bet
    await placeBetMutation.mutateAsync({
      side,
      amount,
      round: currentRound,
    });

    // Clear bet after successful placement
    updateBet(side, 0);
  }, [betState, currentRound, validateBet, placeBetMutation, updateBet]);

  // Quick bet amounts
  const quickBet = useCallback((side: 'andar' | 'bahar', multiplier: number) => {
    const amount = minBet * multiplier;
    updateBet(side, amount);
  }, [minBet, updateBet]);

  // Clear all bets
  const clearBets = useCallback(() => {
    setBetState({
      andarAmount: 0,
      baharAmount: 0,
      round: currentRound,
    });
  }, [currentRound]);

  // Reset bets when round changes
  useState(() => {
    if (betState.round !== currentRound) {
      clearBets();
    }
  });

  return {
    betState,
    updateBet,
    validateBet,
    placeBet,
    quickBet,
    clearBets,
    isPlacingBet: placeBetMutation.isPending,
    betError: placeBetMutation.error,
  };
}
