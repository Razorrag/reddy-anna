/**
 * GameLogic - Core game logic with backend's exact payout calculation
 * 
 * This file contains the exact same payout logic as the backend
 * to ensure frontend calculations match backend perfectly.
 */

import type { Card, BetSide, RoundBets } from '../../types/game';

export interface UserBets {
  round1: RoundBets;
  round2: RoundBets;
}

// Define PlayerBets interface (extends UserBets with currentBet)
export interface PlayerBets {
  round1: RoundBets;
  round2: RoundBets;
  currentBet: number;
}

export interface GameState {
  id: string;
  openingCard: Card | null;
  phase: 'idle' | 'betting' | 'dealing' | 'complete';
  currentRound: 1 | 2 | 3;
  countdown: number;
  andarCards: Card[];
  baharCards: Card[];
  winner: BetSide | null;
  winningCard: Card | null;
  totalBets: RoundBets;
  round1Bets: RoundBets;
  round2Bets: RoundBets;
  playerRound1Bets: RoundBets;
  playerRound2Bets: RoundBets;
  bettingLocked: boolean;
}

/**
 * Calculate payout based on backend's exact logic
 * This must match the calculatePayout function in routes.ts exactly
 */
export function calculatePayout(
  round: number,
  winner: BetSide,
  playerBets: UserBets
): number {
  if (round === 1) {
    if (winner === 'andar') {
      // 1:1 payout on andar bets
      return playerBets.round1.andar * 2;
    } else {
      // 1:0 refund on bahar bets
      return playerBets.round1.bahar;
    }
  } else if (round === 2) {
    if (winner === 'andar') {
      // 1:1 on total andar bets (round 1 + round 2)
      const totalAndar = playerBets.round1.andar + playerBets.round2.andar;
      return totalAndar * 2;
    } else {
      // Mixed payout: 1:1 on round 1 bahar, 1:0 refund on round 2 bahar
      const round1Payout = playerBets.round1.bahar * 2;
      const round2Refund = playerBets.round2.bahar;
      return round1Payout + round2Refund;
    }
  } else {
    // Round 3: 1:1 on total bets for winning side
    const totalBet = playerBets.round1[winner] + playerBets.round2[winner];
    return totalBet * 2;
  }
}

/**
 * Get payout multiplier for display purposes
 */
export function getPayoutMultiplier(round: number, side: BetSide, winner: BetSide | null): number {
  if (!winner) return 0;
  
  if (round === 1) {
    return winner === side ? 2 : (side === 'bahar' ? 1 : 0);
  } else if (round === 2) {
    if (winner === 'andar') {
      return side === 'andar' ? 2 : 0;
    } else {
      return side === 'bahar' ? 2 : 0;
    }
  } else {
    return winner === side ? 2 : 0;
  }
}

/**
 * Check if a card matches the opening card
 */
export function checkWinner(card: Card, openingCard: Card): boolean {
  const cardRank = card.value;
  const openingRank = openingCard.value;
  
  return cardRank === openingRank;
}

/**
 * Get round-specific betting rules
 */
export function getRoundRules(round: number) {
  switch (round) {
    case 1:
      return {
        title: 'Round 1',
        description: 'First card dealt',
        andarMultiplier: '1:1',
        baharMultiplier: '1:0 (Refund)',
        maxCards: 1
      };
    case 2:
      return {
        title: 'Round 2',
        description: 'Second card dealt',
        andarMultiplier: '1:1 (Total)',
        baharMultiplier: '1:1 (R1) + 1:0 (R2)',
        maxCards: 2
      };
    case 3:
      return {
        title: 'Round 3',
        description: 'Continuous draw until match',
        andarMultiplier: '1:1 (Total)',
        baharMultiplier: '1:1 (Total)',
        maxCards: 'Unlimited'
      };
    default:
      return {
        title: 'Unknown Round',
        description: '',
        andarMultiplier: '',
        baharMultiplier: '',
        maxCards: 0
      };
  }
}

/**
 * Initialize game state
 */
export function initializeGameState(): GameState {
  return {
    id: '',
    openingCard: null,
    phase: 'idle',
    currentRound: 1,
    countdown: 0,
    andarCards: [],
    baharCards: [],
    winner: null,
    winningCard: null,
    totalBets: { andar: 0, bahar: 0 },
    round1Bets: { andar: 0, bahar: 0 },
    round2Bets: { andar: 0, bahar: 0 },
    playerRound1Bets: { andar: 0, bahar: 0 },
    playerRound2Bets: { andar: 0, bahar: 0 },
    bettingLocked: false
  };
}

/**
 * Validate bet amount
 */
export function validateBetAmount(amount: number): { isValid: boolean; error?: string } {
  if (!amount || amount < 1000) {
    return { isValid: false, error: 'Minimum bet is ₹1,000' };
  }
  
  if (amount > 100000) {
    return { isValid: false, error: 'Maximum bet is ₹1,00,000' };
  }
  
  return { isValid: true };
}

/**
 * Calculate total player investment
 */
export function calculatePlayerInvestment(playerBets: UserBets): number {
  return playerBets.round1.andar + playerBets.round1.bahar + 
         playerBets.round2.andar + playerBets.round2.bahar;
}

/**
 * Get potential payout for current bets
 */
export function getPotentialPayout(
  playerBets: UserBets,
  currentRound: number,
  side: BetSide
): number {
  const testBets: UserBets = {
    round1: { ...playerBets.round1 },
    round2: { ...playerBets.round2 }
  };
  
  return calculatePayout(currentRound, side, testBets);
}

// Additional utility functions for GameContext compatibility
export function generateRandomCard(): Card {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  
  const randomSuit = suits[Math.floor(Math.random() * suits.length)];
  const randomRank = ranks[Math.floor(Math.random() * ranks.length)];
  const randomValue = values[Math.floor(Math.random() * values.length)];
  
  return {
    id: `${randomSuit}-${randomRank}`,
    suit: randomSuit,
    rank: randomRank,
    value: randomValue,
    color: randomSuit === 'hearts' || randomSuit === 'diamonds' ? 'red' : 'black',
    display: `${randomRank}${randomSuit === 'hearts' ? '♥' : randomSuit === 'diamonds' ? '♦' : randomSuit === 'clubs' ? '♣' : '♠'}`
  };
}

export function getRoundPhase(round: number): 'idle' | 'betting' | 'dealing' | 'complete' {
  if (round === 1) return 'betting';
  if (round === 2) return 'betting';
  if (round === 3) return 'dealing';
  return 'idle';
}

export function dealCardToSide(state: GameState, side: BetSide): GameState {
  const newCard = generateRandomCard();
  
  return {
    ...state,
    [side === 'andar' ? 'andarCards' : 'baharCards']: [
      ...(side === 'andar' ? state.andarCards : state.baharCards),
      newCard
    ]
  };
}

export function validateBet(amount: number): { isValid: boolean; error?: string } {
  return validateBetAmount(amount);
}

export function getRoundMultiplier(round: number, side: BetSide): string {
  if (round === 1) {
    return side === 'andar' ? '1:1' : '1:0';
  } else if (round === 2) {
    return side === 'andar' ? '1:1' : '1:1';
  } else {
    return '1:1';
  }
}

export function formatIndianCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(amount);
}
