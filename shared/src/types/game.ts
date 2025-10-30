// Game-related types used across the application

// Card types
export interface Card {
  id: string;
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string;
  value: number;
  color: 'red' | 'black';
  display: string;
}

export type GamePhase = 'idle' | 'betting' | 'dealing' | 'complete';
export type GameRound = 1 | 2 | 3;
export type GameWinner = 'andar' | 'bahar' | null;

// Betting types
export interface RoundBets {
  andar: number;
  bahar: number;
}

export interface UserBets {
  round1: RoundBets;
  round2: RoundBets;
}