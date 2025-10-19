/**
 * Payout Calculator for Multi-Round Andar Bahar
 * 
 * ROUND 1:
 * - Andar wins: 1:1 (double money)
 * - Bahar wins: 1:0 (refund only)
 * 
 * ROUND 2:
 * - Andar wins: ALL bets (R1+R2) paid 1:1
 * - Bahar wins: R1 bets paid 1:1, R2 bets paid 1:0 (refund)
 * 
 * ROUND 3:
 * - BOTH sides paid 1:1 on total invested amount (R1+R2)
 */

import type { GameRound, BetSide, RoundBets, PayoutResult } from '@/types/game';

export function calculatePayout(
  round: GameRound,
  winner: BetSide,
  playerBets: {
    round1: RoundBets;
    round2: RoundBets;
  }
): PayoutResult {
  let totalPayout = 0;
  let round1Payout = 0;
  let round2Payout = 0;
  let multiplier = 0;
  let breakdown = '';

  if (round === 1) {
    // Round 1 payouts
    if (winner === 'andar') {
      // Andar wins: 1:1 (double money)
      round1Payout = playerBets.round1.andar * 2;
      totalPayout = round1Payout;
      multiplier = 2;
      breakdown = `Andar R1: ${playerBets.round1.andar} × 2 = ${round1Payout}`;
    } else {
      // Bahar wins: 1:0 (refund only)
      round1Payout = playerBets.round1.bahar;
      totalPayout = round1Payout;
      multiplier = 1;
      breakdown = `Bahar R1: ${playerBets.round1.bahar} × 1 (refund) = ${round1Payout}`;
    }
  } else if (round === 2) {
    // Round 2 payouts
    if (winner === 'andar') {
      // Andar wins: ALL bets (R1+R2) paid 1:1
      const totalAndar = playerBets.round1.andar + playerBets.round2.andar;
      totalPayout = totalAndar * 2;
      round1Payout = playerBets.round1.andar * 2;
      round2Payout = playerBets.round2.andar * 2;
      multiplier = 2;
      breakdown = `Andar Total: (${playerBets.round1.andar} + ${playerBets.round2.andar}) × 2 = ${totalPayout}`;
    } else {
      // Bahar wins: R1 bets paid 1:1, R2 bets paid 1:0 (refund)
      round1Payout = playerBets.round1.bahar * 2; // R1 paid 1:1
      round2Payout = playerBets.round2.bahar; // R2 refund only
      totalPayout = round1Payout + round2Payout;
      multiplier = 1.5; // Average
      breakdown = `Bahar R1: ${playerBets.round1.bahar} × 2 = ${round1Payout}, R2: ${playerBets.round2.bahar} × 1 (refund) = ${round2Payout}`;
    }
  } else {
    // Round 3 payouts - BOTH sides paid 1:1
    const totalBet = playerBets.round1[winner] + playerBets.round2[winner];
    totalPayout = totalBet * 2;
    round1Payout = playerBets.round1[winner] * 2;
    round2Payout = playerBets.round2[winner] * 2;
    multiplier = 2;
    breakdown = `${winner.toUpperCase()} Total: (${playerBets.round1[winner]} + ${playerBets.round2[winner]}) × 2 = ${totalPayout}`;
  }

  return {
    totalPayout,
    round1Payout,
    round2Payout,
    multiplier,
    breakdown
  };
}

/**
 * Calculate total amount bet by player across all rounds
 */
export function calculateTotalBet(playerBets: {
  round1: RoundBets;
  round2: RoundBets;
}): number {
  return (
    playerBets.round1.andar +
    playerBets.round1.bahar +
    playerBets.round2.andar +
    playerBets.round2.bahar
  );
}

/**
 * Calculate potential winnings for a side
 */
export function calculatePotentialWinnings(
  round: GameRound,
  side: BetSide,
  playerBets: {
    round1: RoundBets;
    round2: RoundBets;
  }
): number {
  const result = calculatePayout(round, side, playerBets);
  return result.totalPayout;
}

/**
 * Validate if player has sufficient balance for bet
 */
export function canPlaceBet(
  betAmount: number,
  currentBalance: number,
  minBet: number,
  maxBet: number
): { canBet: boolean; reason?: string } {
  if (betAmount < minBet) {
    return { canBet: false, reason: `Minimum bet is ₹${minBet}` };
  }
  
  if (betAmount > maxBet) {
    return { canBet: false, reason: `Maximum bet is ₹${maxBet}` };
  }
  
  if (betAmount > currentBalance) {
    return { canBet: false, reason: 'Insufficient balance' };
  }
  
  return { canBet: true };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Format currency without decimals
 */
export function formatCurrencyShort(amount: number): string {
  if (amount >= 10000000) {
    return '₹' + (amount / 10000000).toFixed(2) + 'Cr';
  } else if (amount >= 100000) {
    return '₹' + (amount / 100000).toFixed(2) + 'L';
  } else if (amount >= 1000) {
    return '₹' + (amount / 1000).toFixed(0) + 'k';
  }
  return '₹' + amount.toLocaleString('en-IN');
}
