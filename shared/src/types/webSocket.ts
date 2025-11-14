
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
  bettingLocked?: boolean;
}>;

export type TimerUpdateMessage = WebSocketMessageBase<'timer_update', {
  seconds: number;
  phase: GamePhase;
  round?: GameRound;
  bettingLocked?: boolean;
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

export type GameReturnToOpeningMessage = WebSocketMessageBase<'game_return_to_opening', {
  message: string;
  gameState?: {
    phase: GamePhase;
    currentRound: GameRound;
    openingCard: Card | null;
    andarCards: Card[];
    baharCards: Card[];
    winner: GameWinner | null;
    winningCard: Card | null;
    gameId: string;
  };
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

export type StartGameMessage = WebSocketMessageBase<'start_game', {
  openingCard: Card;
}>;

export type DealCardMessage = WebSocketMessageBase<'deal_card', {
  gameId: string;
  card: string;
  side: 'andar' | 'bahar';
  position: number;
}>;

export type PlaceBetMessage = WebSocketMessageBase<'place_bet', {
  gameId: string;
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
  gameState?: {
    gameId: string;
    phase: any;
    currentRound: number;
    timer: number;
    countdownTimer: number;
    openingCard: any;
    andarCards: any[];
    baharCards: any[];
    winner: any;
    winningCard: any;
    round1Bets: any;
    round2Bets: any;
    totalBets: any;
    userBets: {
      round1: any;
      round2: any;
    };
    playerRound1Bets: any;
    playerRound2Bets: any;
    userBalance: number;
    canJoin: boolean;
    canBet: boolean;
    isGameActive: boolean;
    bettingLocked: boolean;
    status: string;
    message: string;
  };
}>;

export type AuthErrorMessage = WebSocketMessageBase<'auth_error', {
  message: string;
  error: 'TOKEN_EXPIRED' | 'TOKEN_INVALID' | 'AUTH_REQUIRED';
  redirectTo?: string;
}>;

export type TokenRefreshMessage = WebSocketMessageBase<'token_refresh', {
  refreshToken: string;
}>;

export type TokenRefreshedMessage = WebSocketMessageBase<'token_refreshed', {
  token: string;
  refreshToken: string;
  expiresIn: number;
}>;

export type TokenRefreshErrorMessage = WebSocketMessageBase<'token_refresh_error', {
  message: string;
  code: string;
}>;

export type ActivityPingMessage = WebSocketMessageBase<'activity_ping', {}>;

export type ActivityPongMessage = WebSocketMessageBase<'activity_pong', {
  timestamp: number;
  tokenExpiry?: number;
}>;

export type TokenExpiryWarningMessage = WebSocketMessageBase<'token_expiry_warning', {
  expiresIn: number;
  message: string;
}>;

export type TokenExpiredMessage = WebSocketMessageBase<'token_expired', {
  message: string;
}>;

export type InactivityWarningMessage = WebSocketMessageBase<'inactivity_warning', {
  inactiveFor: number;
  message: string;
}>;

export type BetErrorMessage = WebSocketMessageBase<'bet_error', {
  message: string;
  code: string;
  field?: string;
  currentBalance?: number;
  required?: number;
  minAmount?: number;
  maxAmount?: number;
  timeToWait?: number;
  maxBets?: number;
  windowSeconds?: number;
  phase?: string;
  locked?: boolean;
  currentRound?: number;
  status?: string;
  error?: string;
  side?: string;
  round?: number;
}>;

export type BetConfirmedMessage = WebSocketMessageBase<'bet_confirmed', {
  betId: string;
  userId: string;
  round: number;
  side: string;
  amount: number;
  newBalance: number;
  timestamp: number;
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

export type WebRTCSignalMessage = WebSocketMessageBase<'webrtc:signal', {
  type: 'stream-start' | 'stream-stop' | 'stream-pause' | 'stream-resume' | 'offer' | 'answer' | 'ice-candidate';
  from?: string;
  to?: string;
  streamId?: string;
  roomId?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}>;

export type RequestStreamMessage = WebSocketMessageBase<'request_stream', {
  roomId: string;
}>;

export type WebRTCOfferMessageNew = WebSocketMessageBase<'webrtc_offer', {
  offer: RTCSessionDescriptionInit;
  roomId: string;
}>;

export type WebRTCAnswerMessageNew = WebSocketMessageBase<'webrtc_answer', {
  answer: RTCSessionDescriptionInit;
  roomId: string;
}>;

export type WebRTCIceCandidateMessageNew = WebSocketMessageBase<'webrtc_ice_candidate', {
  candidate: RTCIceCandidateInit;
  roomId: string;
}>;

export type StreamViewerJoinMessage = WebSocketMessageBase<'stream_viewer_join', {
  roomId: string;
}>;

export type StreamViewerLeaveMessage = WebSocketMessageBase<'stream_viewer_leave', {
  roomId: string;
}>;

export type StreamJoinResponseMessage = WebSocketMessageBase<'stream_join_response', {
  success: boolean;
  streamId?: string;
  adminId?: string;
  message?: string;
}>;

export type AdminPaymentNotificationMessage = WebSocketMessageBase<'admin_payment_notification', {
  message: string;
  reason: string;
  timestamp: string;
}>;

export type StatusUpdateMessage = WebSocketMessageBase<'status_update', {
  userId: string;
  status: string;
  reason: string;
  timestamp: string;
}>;

export type AdminBetUpdateMessage = WebSocketMessageBase<'admin_bet_update', {
  userId: string;
  side: string;
  amount: number;
  round: number;
  timestamp: string;
}>;

export type AnalyticsUpdateMessage = WebSocketMessageBase<'analytics_update', {
  type: string;
  data: any;
}>;

export type GameHistoryUpdateMessage = WebSocketMessageBase<'game_history_update', {
  gameId: string;
  openingCard: string;
  winner: string;
  winningCard: string;
  round: number;
  totalCards: number;
  createdAt: string;
}>;

export type GameHistoryUpdateAdminMessage = WebSocketMessageBase<'game_history_update_admin', {
  gameId: string;
  openingCard: string;
  winner: string;
  winningCard: string;
  totalBets: number;
  totalPayouts: number;
  andarTotalBet: number;
  baharTotalBet: number;
  totalPlayers: number;
  totalCards: number;
  round: number;
  createdAt: string;
}>;

export type AdminNotificationMessage = WebSocketMessageBase<'admin_notification', {
  type: string;
  data: any;
}>;

export type BonusUpdateMessage = WebSocketMessageBase<'bonus_update', {
  type: string;
  amount: number;
  userId: string;
}>;

export type ConditionalBonusAppliedMessage = WebSocketMessageBase<'conditional_bonus_applied', {
  message: string;
}>;

export type PayoutReceivedMessage = WebSocketMessageBase<'payout_received', {
  amount: number;
  balance: number;
  totalBetAmount: number;
  netProfit: number;
  winner: string;
  round: number;
  result: 'win' | 'loss' | 'no_bet';
  betAmount?: number;
  payoutBreakdown?: {
    winningBets: number;
    multiplier: number;
  };
}>;

export type GameStartedMessage = WebSocketMessageBase<'game_started', {
  gameId: string;
}>;

export type GameStateMessage = WebSocketMessageBase<'game_state', {
  gameId: string;
  phase: string;
  currentRound: number;
  timer: number;
}>;

export type GameColonStateMessage = WebSocketMessageBase<'game:state', {
  gameId: string;
  phase: string;
  currentRound: number;
  timer: number;
}>;

export type GameSubscribeMessageOld = WebSocketMessageBase<'game_subscribe', {}>;

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
  | GameReturnToOpeningMessage
  | GameStateMessage
  | GameStartedMessage
  | GameColonStateMessage
  | GameSubscribeMessageOld
  // Card and Betting
  | OpeningCardConfirmedMessage
  | CardDealtMessage
  | StartGameMessage
  | DealCardMessage
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
  // Token and Activity Management
  | TokenRefreshMessage
  | TokenRefreshedMessage
  | TokenRefreshErrorMessage
  | ActivityPingMessage
  | ActivityPongMessage
  | TokenExpiryWarningMessage
  | TokenExpiredMessage
  | InactivityWarningMessage
  | BetErrorMessage
  | BetConfirmedMessage
  // Streaming
  | StreamStatusMessage
  | WebRTCOfferMessage
  | WebRTCAnswerMessage
  | WebRTCIceCandidateMessage
  | WebRTCSignalMessage
  | RequestStreamMessage
  | WebRTCOfferMessageNew
  | WebRTCAnswerMessageNew
  | WebRTCIceCandidateMessageNew
  | StreamViewerJoinMessage
  | StreamViewerLeaveMessage
  | StreamJoinResponseMessage
  // Admin and System Messages
  | AdminPaymentNotificationMessage
  | StatusUpdateMessage
  | AdminBetUpdateMessage
  | AnalyticsUpdateMessage
  | GameHistoryUpdateMessage
  | GameHistoryUpdateAdminMessage
  | AdminNotificationMessage
  | BonusUpdateMessage
  | ConditionalBonusAppliedMessage
  | PayoutReceivedMessage
  // General
  | ErrorMessage
  | NotificationMessage;
