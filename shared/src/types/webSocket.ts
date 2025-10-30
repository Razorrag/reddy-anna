
// =================================================================================
// WebSocket Message-Type Definitions
//
// This file defines the standardized types for all WebSocket messages.
// It serves as the single source of truth for both the client and server.
// =================================================================================

import type { Card, GamePhase, GameRound, GameWinner, RoundBets } from './game';

// Base interface for all WebSocket messages
export interface WebSocketMessageBase<T extends string, D> {
  type: T;
  data: D;
  timestamp: string;
}

// ---------------------------------------------------------------------------------
// Game State and Flow Messages
// ---------------------------------------------------------------------------------

export type GameStateSyncMessage = WebSocketMessageBase<'sync_game_state', {
  gameId: string;
  phase: GamePhase;
  currentRound: GameRound;
  countdown: number;
  openingCard: Card | null;
  andarCards: Card[];
  baharCards: Card[];
  winner: GameWinner;
  winningCard: Card | null;
  bettingLocked: boolean;
  totalBets: RoundBets;
  userBets: {
    round1: RoundBets;
    round2: RoundBets;
  };
}>;

export type PhaseChangeMessage = WebSocketMessageBase<'phase_change', {
  phase: GamePhase;
  round: GameRound;
  message?: string;
}>;

export type TimerUpdateMessage = WebSocketMessageBase<'timer_update', {
  seconds: number;
  phase: GamePhase;
}>;

export type GameStartMessage = WebSocketMessageBase<'game_start', {
  openingCard: Card;
  timer: number;
}>;

export type GameCompleteMessage = WebSocketMessageBase<'game_complete', {
  winner: GameWinner;
  winningCard: Card;
  message: string;
  payoutMessage: string;
  round: GameRound;
  andarTotal: number;
  baharTotal: number;
}>;

export type GameResetMessage = WebSocketMessageBase<'game_reset', {
  message: string;
}>;

// ---------------------------------------------------------------------------------
// Card and Betting Messages
// ---------------------------------------------------------------------------------

export type OpeningCardConfirmedMessage = WebSocketMessageBase<'opening_card_confirmed', {
  openingCard: Card;
  phase: GamePhase;
  round: GameRound;
  timer: number;
}>;

export type CardDealtMessage = WebSocketMessageBase<'card_dealt', {
  card: Card;
  side: 'andar' | 'bahar';
  position: number;
  isWinningCard: boolean;
}>;

export type PlaceBetMessage = WebSocketMessageBase<'place_bet', {
  side: 'andar' | 'bahar';
  amount: number;
  round: GameRound;
}>;

export type BetSuccessMessage = WebSocketMessageBase<'bet_success', {
  side: 'andar' | 'bahar';
  amount: number;
  round: GameRound;
  newBalance: number;
  message: string;
}>;

export type BettingStatsMessage = WebSocketMessageBase<'betting_stats', {
  andarTotal: number;
  baharTotal: number;
  round1Bets: RoundBets;
  round2Bets: RoundBets;
}>;

export type UserBetsUpdateMessage = WebSocketMessageBase<'user_bets_update', {
  round1Bets: RoundBets;
  round2Bets: RoundBets;
}>;

// ---------------------------------------------------------------------------------
// Game Control Messages (Player and Admin)
// ---------------------------------------------------------------------------------

export type PlayerBetMessage = WebSocketMessageBase<'player:bet', {
  gameId: string;
  side: 'andar' | 'bahar';
  amount: number;
  round: string;
}>;

export type AdminStartGameMessage = WebSocketMessageBase<'admin:start-game', {
  openingCard: string;
}>;

export type AdminDealCardMessage = WebSocketMessageBase<'admin:deal-card', {
  gameId: string;
  card: string;
  side: 'andar' | 'bahar';
  position: number;
}>;

export type GameSubscribeMessage = WebSocketMessageBase<'game:subscribe', {}>;

export type GameBetPlacedMessage = WebSocketMessageBase<'game:bet-placed', {
  userId: string;
  side: 'andar' | 'bahar';
  amount: number;
  round: string;
}>;

// ---------------------------------------------------------------------------------
// User and Authentication Messages
// ---------------------------------------------------------------------------------

export type AuthenticateMessage = WebSocketMessageBase<'authenticate', {
  token: string;
}>;

export type AuthenticatedMessage = WebSocketMessageBase<'authenticated', {
  userId: string;
  role: 'player' | 'admin';
  balance: number;
}>;

export type AuthErrorMessage = WebSocketMessageBase<'auth_error', {
  message: string;
  error: 'TOKEN_EXPIRED' | 'TOKEN_INVALID' | 'AUTH_REQUIRED';
  redirectTo?: string;
}>;

export type BalanceUpdateMessage = WebSocketMessageBase<'balance_update', {
  balance: number;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'win' | 'loss' | 'bet';
}>;

// ---------------------------------------------------------------------------------
// Streaming Messages (WebRTC and RTMP)
// ---------------------------------------------------------------------------------

export type StreamStatusMessage = WebSocketMessageBase<'stream_status', {
  status: 'online' | 'offline' | 'connecting';
  method?: 'webrtc' | 'rtmp';
  url?: string;
}>;

export type WebRTCOfferMessage = WebSocketMessageBase<'webrtc_offer', {
  offer: RTCSessionDescriptionInit;
  adminId: string;
}>;

export type WebRTCAnswerMessage = WebSocketMessageBase<'webrtc_answer', {
  answer: RTCSessionDescriptionInit;
  playerId: string;
}>;

export type WebRTCIceCandidateMessage = WebSocketMessageBase<'webrtc_ice_candidate', {
  candidate: RTCIceCandidateInit;
  fromPlayer?: string;
  fromAdmin?: boolean;
}>;

// ---------------------------------------------------------------------------------
// General and Error Messages
// ---------------------------------------------------------------------------------

export type ErrorMessage = WebSocketMessageBase<'error', {
  message: string;
  errorCode?: string;
}>;

export type NotificationMessage = WebSocketMessageBase<'notification', {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}>;

// ---------------------------------------------------------------------------------
// Union of all possible WebSocket messages
// ---------------------------------------------------------------------------------

export type WebSocketMessage =
  // Game State and Flow
  | GameStateSyncMessage
  | PhaseChangeMessage
  | TimerUpdateMessage
  | GameStartMessage
  | GameCompleteMessage
  | GameResetMessage
  // Card and Betting
  | OpeningCardConfirmedMessage
  | CardDealtMessage
  | PlaceBetMessage
  | BetSuccessMessage
  | BettingStatsMessage
  | UserBetsUpdateMessage
  // Game Control (Player and Admin)
  | PlayerBetMessage
  | AdminStartGameMessage
  | AdminDealCardMessage
  | GameSubscribeMessage
  | GameBetPlacedMessage
  // User and Authentication
  | AuthenticateMessage
  | AuthenticatedMessage
  | AuthErrorMessage
  | BalanceUpdateMessage
  // Streaming
  | StreamStatusMessage
  | WebRTCOfferMessage
  | WebRTCAnswerMessage
  | WebRTCIceCandidateMessage
  // General
  | ErrorMessage
  | NotificationMessage;

