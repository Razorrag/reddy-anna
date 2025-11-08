import React, { createContext, useContext, useCallback, useEffect, useState, useRef, ReactNode } from 'react';
import { useGameState } from './GameStateContext';
import { useNotification } from './NotificationContext';
import { useAuth } from './AuthContext';
import { apiClient } from '../lib/api-client';
import type { Card, BetSide } from '../types/game';
import {
  WebSocketMessage,
  GameStateSyncMessage,
  OpeningCardConfirmedMessage,
  CardDealtMessage,
  TimerUpdateMessage,
  BettingStatsMessage,
  GameCompleteMessage,
  GameResetMessage,
  PhaseChangeMessage,
  BalanceUpdateMessage,
  UserBetsUpdateMessage,
  BetSuccessMessage,
  AuthErrorMessage,
  StreamStatusMessage,
  NotificationMessage,
  WebRTCSignalMessage,
  PayoutReceivedMessage,
} from '../../../shared/src/types/webSocket';
import WebSocketManager, { ConnectionStatus } from '../lib/WebSocketManager';

import { handleComponentError } from '../lib/utils';

// Validate WebSocket message structure
const isValidWebSocketMessage = (data: any): data is WebSocketMessage => {
  return data && typeof data === 'object' && 'type' in data;
};

// Helper: parse a display string like "A♠" or "10♥" into a Card object
const parseDisplayCard = (display: string): Card => {
  const suitSymbol = display.slice(-1);
  const rankPart = display.slice(0, display.length - 1);
  const suitMap: Record<string, { name: Card['suit']; color: 'red' | 'black' }> = {
    '♠': { name: 'spades', color: 'black' },
    '♥': { name: 'hearts', color: 'red' },
    '♦': { name: 'diamonds', color: 'red' },
    '♣': { name: 'clubs', color: 'black' },
  };
  const valueMap: Record<string, number> = {
    A: 1, J: 11, Q: 12, K: 13,
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  };
  const suitInfo = suitMap[suitSymbol] || { name: 'spades', color: 'black' };
  const value = (valueMap[rankPart] ?? parseInt(rankPart, 10)) || 0;
  return {
    id: `${rankPart}-${suitInfo.name}`,
    suit: suitInfo.name,
    rank: rankPart as any,
    value,
    color: suitInfo.color,
    display,
  } as Card;
};

// Helper: Calculate total bet amount from RoundBets (handles arrays or numbers)
const getTotalBetAmount = (bets: number | number[] | any[] | undefined, side: 'andar' | 'bahar'): number => {
  if (!bets) return 0;
  if (typeof bets === 'number') return bets;
  if (Array.isArray(bets)) {
    return bets.reduce((sum: number, bet: any) => {
      const amount = typeof bet === 'number' ? bet : (bet?.amount || 0);
      return sum + amount;
    }, 0);
  }
  return 0;
};

// Helper: Calculate payout using the same logic as server's calculatePayout function
const calculatePayout = (
  round: number,
  winner: 'andar' | 'bahar',
  playerBets: { round1: { andar: number; bahar: number }, round2: { andar: number; bahar: number } }
): number => {
  if (round === 1) {
    // Round 1: Andar wins 1:1 (double), Bahar wins 1:0 (refund only)
    if (winner === 'andar') {
      return playerBets.round1.andar * 2; // 1:1 payout (stake + profit)
    } else {
      return playerBets.round1.bahar; // 1:0 payout (refund only)
    }
  } else if (round === 2) {
    // Round 2: Andar wins 1:1 on all Andar bets, Bahar wins mixed (1:1 on R1, 1:0 on R2)
    if (winner === 'andar') {
      const totalAndar = playerBets.round1.andar + playerBets.round2.andar;
      return totalAndar * 2; // 1:1 on all Andar bets
    } else {
      const round1Payout = playerBets.round1.bahar * 2; // 1:1 on Round 1 Bahar
      const round2Refund = playerBets.round2.bahar; // 1:0 on Round 2 Bahar
      return round1Payout + round2Refund;
    }
  } else {
    // Round 3 (Continuous Draw): Both sides win 1:1 on total combined bets
    const totalBet = playerBets.round1[winner] + playerBets.round2[winner];
    return totalBet * 2; // 1:1 payout on total investment
  }
};

declare global {
  interface Window {
    API_BASE_URL?: string;
  }
}

interface WebSocketContextType {
  sendWebSocketMessage: (message: Omit<WebSocketMessage, 'timestamp'>) => void;
  startGame: (timerDuration?: number) => Promise<void>;
  dealCard: (card: Card, side: BetSide, position: number) => Promise<void>;
  placeBet: (side: BetSide, amount: number) => Promise<void>;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  connectionStatus: ConnectionStatus;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

const getWebSocketUrl = (): string => {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }
  return process.env.WEBSOCKET_URL || 'ws://localhost:5000/ws';
};

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { 
    gameState,
    setGameId,
    setPhase, 
    setCountdown, 
    setWinner, 
    addAndarCard, 
    addBaharCard,
    setSelectedOpeningCard,
    updateTotalBets,
    setCurrentRound,
    updatePlayerRoundBets,
    updateRoundBets,
    clearCards,
    resetGame,
    updatePlayerWallet,
    setScreenSharing,
    setWinningCard,
    removeLastBet,
    clearRoundBets,
    setBettingLocked, // ✅ FIX: Add missing setBettingLocked
  } = useGameState();
  const { showNotification } = useNotification();
  const { state: authState, logout, refreshAccessToken } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [isWebSocketAuthenticated, setIsWebSocketAuthenticated] = useState(false);

  const getAuthToken = useCallback(async () => {
    let currentToken = authState.token;

    const isTokenExpired = (token: string) => {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        if (decoded && decoded.exp) {
          const currentTime = Date.now() / 1000;
          // Add 30 second buffer to prevent premature expiration
          return decoded.exp < (currentTime - 30);
        }
      } catch (e) {
        console.error('Error decoding token for expiration check:', e);
        // Don't assume expired if we can't decode - might be a different format
        return false;
      }
      return false;
    };

    if (currentToken) {
      if (isTokenExpired(currentToken)) {
        console.log('Access token expired, attempting to refresh...');
        const newToken = await refreshAccessToken();
        if (newToken) {
          currentToken = newToken;
          console.log('Token refreshed successfully.');
        } else {
          console.error('Failed to refresh token, logging out.');
          logout();
          showNotification('Session expired, please login again.', 'error');
          return null;
        }
      }
    } else {
      console.log('No token found in auth state - this is normal during initial load');
      // Don't automatically logout - let ProtectedRoute handle the redirect
      return null;
    }
    return currentToken;
  }, [authState.token, refreshAccessToken, logout, showNotification]);

  const webSocketManagerRef = useRef<WebSocketManager | null>(null);

  const handleWebSocketMessage = useCallback(async (data: WebSocketMessage) => {
    if (data.type === 'error') {
      const errorData = data.data;
      const errorMessage = errorData.message || 'Operation failed';
      
      // Suppress authentication errors during the authentication process or if user is not authenticated
      const isAuthError = errorMessage.toLowerCase().includes('authentication') || 
                         errorMessage.toLowerCase().includes('auth required');
      
      // Suppress auth errors if:
      // 1. User is not authenticated (expected), OR
      // 2. WebSocket is not yet authenticated (happening during auth process)
      if (isAuthError && (!authState.isAuthenticated || !isWebSocketAuthenticated)) {
        console.log('⚠️ WebSocket auth error suppressed (auth in progress or user not authenticated):', errorMessage);
        return;
      }
      
      console.error('WebSocket error:', errorData);
      showNotification(errorMessage, 'error');
      return;
    }

    switch (data.type) {
      case 'authenticated': {
        console.log('✅ WebSocket authenticated successfully:', data.data);
        setIsWebSocketAuthenticated(true); // Mark as authenticated
        const gameState = data.data.gameState;
        const bufferedEvents = data.data.bufferedEvents;
        
        if (gameState) {
          console.log('📊 Received game state sync:', {
            phase: gameState.phase,
            round: gameState.currentRound,
            hasOpeningCard: !!gameState.openingCard
          });
          
          const {
            gameId,
            phase,
            countdownTimer,
            timer,
            winner,
            currentRound,
            openingCard,
            andarCards,
            baharCards,
            round1Bets,
            round2Bets,
            userBets,
            playerRound1Bets,
            playerRound2Bets,
            userBalance,
            bettingLocked
          } = gameState;
          
          // ✅ FIX: Set gameId from server
          if (gameId) setGameId(gameId);
          setPhase(phase as any);
          setCountdown(countdownTimer || timer || 0);
          setWinner(winner);
          setCurrentRound(currentRound as any);
          // Handle betting locked state
          if (bettingLocked !== undefined) setBettingLocked(bettingLocked);
          // Clear cards first, then set opening card so it doesn't get cleared
          clearCards();
          if (openingCard) {
            const parsed = typeof openingCard === 'string' ? parseDisplayCard(openingCard) : openingCard;
            setSelectedOpeningCard(parsed);
          }
          andarCards?.forEach((c: any) => addAndarCard(typeof c === 'string' ? parseDisplayCard(c) : c));
          baharCards?.forEach((c: any) => addBaharCard(typeof c === 'string' ? parseDisplayCard(c) : c));
          // CRITICAL: round1Bets/round2Bets are total bets from all players (admin only)
          // Do NOT update player bets with total bets - only use playerRound1Bets/playerRound2Bets
          // REMOVED: if (round1Bets) updateTotalBets(round1Bets); - total bets should not be sent to players
          // REMOVED: if (round2Bets) updateTotalBets(round2Bets); - total bets should not be sent to players
          if (userBets) {
            const r1Bets = {
              andar: Array.isArray(userBets.round1?.andar) ? userBets.round1.andar : [],
              bahar: Array.isArray(userBets.round1?.bahar) ? userBets.round1.bahar : []
            };
            const r2Bets = {
              andar: Array.isArray(userBets.round2?.andar) ? userBets.round2.andar : [],
              bahar: Array.isArray(userBets.round2?.bahar) ? userBets.round2.bahar : []
            };
            updatePlayerRoundBets(1, r1Bets);
            updatePlayerRoundBets(2, r2Bets);
          }
          if (playerRound1Bets) updatePlayerRoundBets(1, playerRound1Bets);
          if (playerRound2Bets) updatePlayerRoundBets(2, playerRound2Bets);
          if (userBalance !== undefined) updatePlayerWallet(userBalance);
          
          // Replay buffered events if any (filter out user-specific events)
          if (bufferedEvents && Array.isArray(bufferedEvents) && bufferedEvents.length > 0) {
            // Filter out user-specific events that shouldn't be replayed to other users
            const filteredEvents = bufferedEvents.filter((event: any) => {
              // Skip bet_confirmed and user_bets_update - these are user-specific
              if (event.type === 'bet_confirmed' || event.type === 'user_bets_update') {
                // Only replay if it's for the current user
                if (event.data?.userId && authState.user?.id && event.data.userId !== authState.user.id) {
                  return false;
                }
              }
              return true;
            });
            
            // ✅ FIX: Sort buffered events by timestamp/sequence before replaying
            const sortedEvents = filteredEvents.sort((a: any, b: any) => {
              const timeA = a.timestamp || a.data?.timestamp || 0;
              const timeB = b.timestamp || b.data?.timestamp || 0;
              return timeA - timeB;
            });
            
            console.log(`🔄 Replaying ${sortedEvents.length} buffered events in order (filtered ${bufferedEvents.length - filteredEvents.length} user-specific events)`);
            // Events will be handled by their respective handlers
            sortedEvents.forEach((event: any, index: number) => {
              // Process buffered events in sequence with proper timing
              setTimeout(() => {
                handleWebSocketMessage({ type: event.type, data: event.data } as any);
              }, index * 100); // Stagger events to prevent overwhelming
            });
          }
          
          // Fetch fresh data from API to ensure consistency
          setTimeout(async () => {
            try {
              // Fetch balance
              const balanceRes = await apiClient.get<{success: boolean, balance: number}>('/user/balance');
              if (balanceRes.success && balanceRes.balance !== undefined) {
                updatePlayerWallet(balanceRes.balance);
              }
            } catch (error) {
              console.error('Error fetching data after WebSocket sync:', error);
            }
          }, 500);
        }
        break;
      }

      case 'buffered_event': {
        // Handle individual buffered events sent separately
        console.log('📦 Received buffered event:', data.data);
        const event = data.data;
        if (event && event.type) {
          handleWebSocketMessage({ type: event.type, data: event.data } as any);
        }
        break;
      }
        
      case 'token_refreshed':
        console.log('WebSocket token refreshed:', data.data);
        // Token was refreshed successfully, no action needed
        break;
        
      case 'token_refresh_error':
        console.error('WebSocket token refresh error:', data.data);
        showNotification(data.data.message || 'Token refresh failed', 'error');
        logout();
        break;
        
      case 'token_expiry_warning':
        console.warn('Token expiry warning:', data.data);
        showNotification(data.data.message || 'Token will expire soon', 'warning');
        break;
        
      case 'token_expired':
        console.error('Token expired:', data.data);
        showNotification(data.data.message || 'Session expired', 'error');
        logout();
        break;
        
      case 'activity_pong':
        // Update last activity timestamp from server
        console.log('Activity pong received:', data.data);
        break;
        
      case 'inactivity_warning':
        console.warn('Inactivity warning:', data.data);
        showNotification(data.data.message || 'You have been inactive', 'warning');
        break;
        
      case 'bet_error':
        console.error('Bet error:', data.data);
        const errorMessage = data.data.message || 'Bet failed';
        const errorType = data.data.code || 'BET_ERROR';
        
        // Show specific error messages based on error code
        switch (errorType) {
          case 'AUTH_REQUIRED':
            showNotification('Authentication required. Please log in again.', 'error');
            break;
          case 'MISSING_FIELDS':
            showNotification(`Missing required field: ${data.data.field || 'unknown'}`, 'error');
            break;
          case 'INVALID_SIDE':
            showNotification('Invalid betting side. Please select Andar or Bahar.', 'error');
            break;
          case 'INVALID_AMOUNT':
            showNotification(`Invalid bet amount: ${data.data.message || 'Please check your bet amount.'}`, 'error');
            break;
          case 'INVALID_ROUND':
            showNotification(`Invalid round: ${data.data.message || 'Please wait for the correct round.'}`, 'error');
            break;
          case 'BETTING_CLOSED':
            showNotification(`Betting is closed: ${data.data.message || 'Please wait for the next betting phase.'}`, 'error');
            break;
          case 'BETTING_LOCKED':
            showNotification('Betting period has ended. Waiting for cards to be dealt.', 'error');
            break;
          case 'TIME_EXPIRED':
            showNotification('Betting time is up!', 'error');
            break;
          case 'INVALID_ROUND_FOR_GAME':
            showNotification(`Cannot place bet for this round. Current round: ${data.data.currentRound || 'unknown'}`, 'error');
            break;
          case 'MIN_BET_VIOLATION':
            showNotification(`Minimum bet is ₹${data.data.minAmount || 1000}`, 'error');
            break;
          case 'MAX_BET_VIOLATION':
            showNotification(`Maximum bet is ₹${data.data.maxAmount || 100000}`, 'error');
            break;
          case 'INSUFFICIENT_BALANCE':
            showNotification(`Insufficient balance. You have ₹${data.data.currentBalance || 0}, but bet is ₹${data.data.required || 0}`, 'error');
            break;
          case 'DUPLICATE_BET':
            showNotification(`You have already placed a bet on ${data.data.side?.toUpperCase() || 'this side'} for round ${data.data.round || 'this round'}`, 'error');
            break;
          case 'BALANCE_ERROR':
            showNotification(`Balance error: ${data.data.message || 'Please check your balance.'}`, 'error');
            break;
          case 'BET_PROCESSING_ERROR':
            showNotification(`Bet processing error: ${data.data.message || 'Please try again.'}`, 'error');
            break;
          default:
            showNotification(errorMessage, 'error');
        }
        break;
        
      case 'bet_confirmed':
        // CRITICAL: Only process bet_confirmed if it's for the current user
        // This prevents other users' bets from being displayed
        if (data.data.userId && authState.user?.id && data.data.userId !== authState.user.id) {
          console.log(`⚠️ Ignoring bet_confirmed for different user: ${data.data.userId} (current: ${authState.user.id})`);
          break;
        }
        
        console.log('Bet confirmed:', data.data);
        // ❌ REMOVED: Redundant notification - User already sees bet in UI and balance update
        // showNotification(`Bet placed: ₹${data.data.amount} on ${data.data.side}`, 'success');
        
        // Immediately update balance from WebSocket (highest priority)
        const betBalance = data.data.newBalance;
        if (betBalance !== undefined && betBalance !== null) {
          updatePlayerWallet(betBalance);
          // Dispatch balance event for other contexts to update immediately
          const balanceEvent = new CustomEvent('balance-websocket-update', {
            detail: { 
              balance: betBalance, 
              amount: -data.data.amount, // Negative for bet deduction
              type: 'bet', 
              timestamp: Date.now() 
            }
          });
          window.dispatchEvent(balanceEvent);
        }
        
        // ✅ FIX: Add new bet to array as BetInfo object with proper normalization
        console.log('✅ Bet confirmed:', data.data);
        
        const currentBets = data.data.round === 1 ? gameState.playerRound1Bets : gameState.playerRound2Bets;
        const currentSideBets = Array.isArray(currentBets[data.data.side as keyof typeof currentBets])
          ? (currentBets[data.data.side as keyof typeof currentBets] as any[])
          : [];
        
        // ✅ FIX: Normalize existing bets to BetInfo format
        const normalizedCurrentBets = currentSideBets.map((bet: any) => 
          typeof bet === 'number' 
            ? { amount: bet, betId: `legacy-${Date.now()}`, timestamp: Date.now() }
            : bet
        );
        
        // Create BetInfo object with actual bet ID from server
        const betInfo = {
          amount: data.data.amount,
          betId: data.data.betId || `bet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: data.data.timestamp || Date.now()
        };
        
        // ✅ CRITICAL FIX: Check for duplicate betId before adding (prevents accumulation bug)
        const existingBetIndex = normalizedCurrentBets.findIndex(
          (b: any) => b.betId === betInfo.betId
        );
        
        if (existingBetIndex === -1) {
          // Only add if bet doesn't exist
          const newBets = {
            ...currentBets,
            [data.data.side]: [...normalizedCurrentBets, betInfo],
          };
          
          console.log('📊 Updated bets:', newBets);
          updatePlayerRoundBets(data.data.round as any, newBets);
        } else {
          console.log('⚠️ Duplicate bet_confirmed ignored:', betInfo.betId);
        }
        break;

      case 'bet_undo_success':
        // Handle bet undo confirmation from server
        // Only process if it's for the current user
        if (data.data.userId && authState.user?.id && data.data.userId !== authState.user.id) {
          console.log(`⚠️ Ignoring bet_undo_success for different user: ${data.data.userId} (current: ${authState.user.id})`);
          break;
        }
        
        console.log('✅ BET UNDO SUCCESS:', data.data);
        
        // Update balance if provided
        if (data.data.newBalance !== undefined && data.data.newBalance !== null) {
          updatePlayerWallet(data.data.newBalance);
          // Dispatch balance event for other contexts
          const balanceEvent = new CustomEvent('balance-websocket-update', {
            detail: { 
              balance: data.data.newBalance, 
              amount: data.data.refundedAmount,
              type: 'bet_refund', 
              timestamp: Date.now() 
            }
          });
          window.dispatchEvent(balanceEvent);
        }
        
        // Clear bets for the round
        if (data.data.round) {
          clearRoundBets(data.data.round as 1 | 2);
        }
        break;

      case 'bet_cancelled':
        // Legacy handler for single bet cancellation
        // Only process bet_cancelled if it's for the current user
        if (data.data.userId && authState.user?.id && data.data.userId !== authState.user.id) {
          console.log(`⚠️ Ignoring bet_cancelled for different user: ${data.data.userId} (current: ${authState.user.id})`);
          break;
        }
        
        console.log('Bet cancelled:', data.data);
        
        // Update balance if provided
        if (data.data.newBalance !== undefined && data.data.newBalance !== null) {
          updatePlayerWallet(data.data.newBalance);
          // Dispatch balance event for other contexts to update immediately
          const balanceEvent = new CustomEvent('balance-websocket-update', {
            detail: { 
              balance: data.data.newBalance, 
              amount: data.data.amount, // Positive for refund
              type: 'bet_refund', 
              timestamp: Date.now() 
            }
          });
          window.dispatchEvent(balanceEvent);
        }
        
        // Remove the cancelled bet from local state
        const cancelledRound = parseInt(data.data.round || '1') as 1 | 2;
        const cancelledSide = data.data.side as BetSide;
        removeLastBet(cancelledRound, cancelledSide);
        
        // ✅ KEEP: Important notification - User needs to know bet was cancelled
        showNotification(
          `Bet cancelled: ₹${data.data.amount?.toLocaleString('en-IN') || 0} on ${data.data.side?.toUpperCase() || ''}`,
          'info'
        );
        break;

      case 'sync_game_state':
      case 'game_state':
      case 'game:state':
      case 'game_state_sync': {
        const gameStateData = (data as any).data;
        
        // Handle null/undefined game state gracefully
        if (!gameStateData) {
          console.log('📊 Received null game state - no active game');
          return;
        }
        
        const {
          gameId,
          phase,
          countdown,
          countdownTimer,
          timer,
          winner,
          currentRound,
          openingCard,
          andarCards,
          baharCards,
          totalBets,
          round1Bets,
          round2Bets,
          userBets,
          playerRound1Bets,
          playerRound2Bets,
          userBalance,
          bettingLocked
        } = gameStateData;
        
        // ✅ FIX: Set gameId from game_state for late-joining players
        if (gameId) {
          setGameId(gameId);
          console.log(`✅ Game ID set from game_state: ${gameId}`);
        }
        
        if (phase) setPhase(phase as any);
        if (countdown !== undefined) setCountdown(countdown);
        if (countdownTimer !== undefined || timer !== undefined) setCountdown(countdownTimer || timer || 0);
        if (winner !== undefined) setWinner(winner);
        if (currentRound !== undefined) setCurrentRound(currentRound as any);
        // Handle betting locked state
        if (bettingLocked !== undefined) setBettingLocked(bettingLocked);
        
        // Clear cards first, then set opening card so it doesn't get cleared
        if (andarCards || baharCards || openingCard) {
          clearCards();
        }
        if (openingCard) {
          const parsed = typeof openingCard === 'string' ? parseDisplayCard(openingCard) : openingCard;
          setSelectedOpeningCard(parsed);
        }
        if (andarCards || baharCards) {
          andarCards?.forEach((c: any) => addAndarCard(typeof c === 'string' ? parseDisplayCard(c) : c));
          baharCards?.forEach((c: any) => addBaharCard(typeof c === 'string' ? parseDisplayCard(c) : c));
        }
        // CRITICAL: round1Bets/round2Bets are total bets from all players (admin only)
        // Do NOT use them for player bets - only use playerRound1Bets/playerRound2Bets
        // Total bets are only for admin displays, not for player buttons
        if (totalBets) updateTotalBets(totalBets);
        // ✅ FIX: Update round bets for admin dashboard (game_state_sync includes these)
        // Create new objects to ensure React detects the change
        if (round1Bets) {
          const newRound1Bets = {
            andar: round1Bets.andar || 0,
            bahar: round1Bets.bahar || 0
          };
          updateRoundBets(1, newRound1Bets);
        }
        if (round2Bets) {
          const newRound2Bets = {
            andar: round2Bets.andar || 0,
            bahar: round2Bets.bahar || 0
          };
          updateRoundBets(2, newRound2Bets);
        }
        // Ensure arrays are properly formatted when initializing from userBets
        if (userBets) {
          const r1Bets = {
            andar: Array.isArray(userBets.round1?.andar) ? userBets.round1.andar : [],
            bahar: Array.isArray(userBets.round1?.bahar) ? userBets.round1.bahar : []
          };
          const r2Bets = {
            andar: Array.isArray(userBets.round2?.andar) ? userBets.round2.andar : [],
            bahar: Array.isArray(userBets.round2?.bahar) ? userBets.round2.bahar : []
          };
          updatePlayerRoundBets(1, r1Bets);
          updatePlayerRoundBets(2, r2Bets);
        }
        // Ensure arrays are properly formatted when initializing from game state
        if (playerRound1Bets) {
          const r1Bets = {
            andar: Array.isArray(playerRound1Bets?.andar) ? playerRound1Bets.andar : [],
            bahar: Array.isArray(playerRound1Bets?.bahar) ? playerRound1Bets.bahar : []
          };
          updatePlayerRoundBets(1, r1Bets);
        }
        if (playerRound2Bets) {
          const r2Bets = {
            andar: Array.isArray(playerRound2Bets?.andar) ? playerRound2Bets.andar : [],
            bahar: Array.isArray(playerRound2Bets?.bahar) ? playerRound2Bets.bahar : []
          };
          updatePlayerRoundBets(2, r2Bets);
        }
        if (userBalance !== undefined) updatePlayerWallet(userBalance);
        
        console.log('✅ Game state synced on reconnect', {
          phase,
          round: currentRound,
          bettingLocked,
          andarCardsCount: andarCards?.length || 0,
          baharCardsCount: baharCards?.length || 0
        });
        break;
      }
        
      case 'opening_card_confirmed': {
        const { gameId, openingCard, phase, round, timer } = (data as OpeningCardConfirmedMessage).data;
        const parsed = typeof openingCard === 'string' ? parseDisplayCard(openingCard) : openingCard;
        
        // ✅ FIX: Set gameId from broadcast so players can place bets
        if (gameId) {
          setGameId(gameId);
          console.log(`✅ Game ID set from opening_card_confirmed: ${gameId}`);
        }
        
        setSelectedOpeningCard(parsed);
        setPhase(phase);
        setCurrentRound(round);
        setCountdown(timer);
        // ❌ REMOVED: Redundant notification - Opening card is visible in UI, timer shows betting started
        // showNotification(`Opening card: ${parsed.display} - Round ${round} betting started!`, 'success');
        break;
      }

      // Server confirmation just for admin; state is driven by opening_card_confirmed
      case 'game_started': {
        // No-op to avoid console warnings
        break;
      }
        
      case 'card_dealt': {
        const { side, card, isWinningCard } = (data as CardDealtMessage).data;
        const parsedCard = typeof card === 'string' ? parseDisplayCard(card) : card;
        if (side === 'andar') {
          addAndarCard(parsedCard);
        } else {
          addBaharCard(parsedCard);
        }
        if (isWinningCard) {
          // ❌ REMOVED: showNotification - Duplicate, shown in VideoArea overlay
          // Trigger celebration event (will be handled by game_complete message)
          // Note: game_complete message will be sent separately with full payout calculation
        }
        break;
      }

      case 'timer_update': {
        const { seconds, phase, round, bettingLocked } = (data as TimerUpdateMessage).data;
        setCountdown(seconds);
        setPhase(phase);
        if (round) {
          setCurrentRound(round);
        }
        
        // NEW: Update betting locked state from timer update
        if (bettingLocked !== undefined) {
          setBettingLocked(bettingLocked);
        } else {
          // Calculate from seconds if not provided
          setBettingLocked(seconds <= 0);
        }
        break;
      }

      case 'betting_stats': {
        // ✅ FIX: betting_stats is now only sent to other users, not the bettor
        // This prevents duplicate updates for the user who placed the bet
        // The bettor already has bet_confirmed and user_bets_update
        const { andarTotal, baharTotal, round1Bets, round2Bets } = (data as BettingStatsMessage).data;
        updateTotalBets({ andar: andarTotal, bahar: baharTotal });
        // Update round-specific bets (only for display, not user's own bets)
        if (round1Bets) {
          updateRoundBets(1, round1Bets);
        }
        if (round2Bets) {
          updateRoundBets(2, round2Bets);
        }
        break;
      }

      case 'game_complete': {
        // ✅ FIX: Validate data before processing
        const gameCompleteData = (data as GameCompleteMessage).data;
        if (!gameCompleteData) {
          console.error('❌ game_complete message missing data');
          break;
        }
        
        const { winner, winningCard, message, round, totalBets, totalPayouts } = gameCompleteData;
        
        // ✅ FIX: Validate required fields
        if (!winner || !winningCard) {
          console.error('❌ game_complete message missing required fields:', { winner, winningCard });
          break;
        }
        
        setPhase('complete');
        setWinner(winner);
        
        // ✅ FIX: Extract and set winningCard - parse if it's a string, use as-is if it's already a Card object
        try {
          if (winningCard) {
            const card = typeof winningCard === 'string' 
              ? parseDisplayCard(winningCard) 
              : winningCard;
            setWinningCard(card);
          }
        } catch (error) {
          console.error('❌ Error parsing winning card:', error);
          // Still set winner even if card parsing fails
        }
        
        // ❌ REMOVED: showNotification(message, 'success'); - Duplicate, shown in VideoArea overlay
        
        // Calculate actual payout amount (not just bet amount) using server's payout logic
        const round1Andar = getTotalBetAmount(gameState.playerRound1Bets?.andar, 'andar');
        const round1Bahar = getTotalBetAmount(gameState.playerRound1Bets?.bahar, 'bahar');
        const round2Andar = getTotalBetAmount(gameState.playerRound2Bets?.andar, 'andar');
        const round2Bahar = getTotalBetAmount(gameState.playerRound2Bets?.bahar, 'bahar');
        
        const playerBets = {
          round1: { andar: round1Andar, bahar: round1Bahar },
          round2: { andar: round2Andar, bahar: round2Bahar }
        };
        
        const totalBetAmount = round1Andar + round1Bahar + round2Andar + round2Bahar;
        const localWinAmount = calculatePayout(gameState.currentRound, winner, playerBets);
        
        // Determine result: win (payout > bet), loss (payout < bet or 0), no_bet (no bets)
        let result: 'win' | 'loss' | 'no_bet';
        if (totalBetAmount === 0) {
          result = 'no_bet';
        } else if (localWinAmount > totalBetAmount) {
          result = 'win'; // User won (payout exceeds bet)
        } else {
          result = 'loss'; // User lost or got refund only
        }
        
        const celebrationEvent = new CustomEvent('game-complete-celebration', {
          detail: { 
            ...data.data, 
            localWinAmount,
            totalBetAmount,
            result,
            round: gameState.currentRound,
            playerBets // Include bet breakdown for mixed bet detection
          }
        });
        window.dispatchEvent(celebrationEvent);
        break;
      }

      case 'game_reset': {
        const { message } = (data as GameResetMessage).data;
        resetGame();
        // ❌ REMOVED: Redundant notification - Game reset is visible in UI state change
        // showNotification(message || 'Game reset', 'info');
        console.log('🔄 Game reset:', message);
        break;
      }

      case 'game_return_to_opening': {
        console.log('🔄 Returning to opening card panel');
        const { gameState, message } = (data as any).data;
        setPhase('idle');
        setCurrentRound(1);
        clearCards();
        setSelectedOpeningCard(null);
        setWinner(null);
        setWinningCard(null);
        // ❌ REMOVED: Redundant notification - UI already shows game is ready
        // showNotification(message || 'Game completed. Ready for new game!', 'info');
        console.log('🔄 Game return to opening:', message);
        break;
      }

      case 'phase_change': {
        const { phase, round, message, bettingLocked } = (data as PhaseChangeMessage).data;
        setPhase(phase);
        setCurrentRound(round);
        
        // NEW: Properly update betting locked state
        if (bettingLocked !== undefined) {
          setBettingLocked(bettingLocked);
        } else {
          // For backward compatibility, calculate betting status based on phase
          const isBettingPhase = phase === 'betting';
          const isBettingLocked = !isBettingPhase || gameState.countdownTimer <= 0;
          setBettingLocked(isBettingLocked);
        }
        
        // ❌ REMOVED: Redundant phase change notifications - UI already reflects phase changes
        // if (message) {
        //   showNotification(message, 'info');
        // }
        if (message) {
          console.log('🔄 Phase change:', message);
        }
        break;
      }

      case 'balance_update': {
        // ✅ FIX: Only process balance_update if it's NOT from bet_confirmed
        // bet_confirmed already handles balance updates, so this prevents duplicates
        // Check if we recently received a bet_confirmed to avoid duplicate updates
        const { balance, amount, type } = (data as BalanceUpdateMessage).data;
        
        // Skip if this is a bet-related balance update (already handled by bet_confirmed)
        if (type === 'bet') {
          console.log('⚠️ Skipping duplicate balance_update from bet - already handled by bet_confirmed');
          break;
        }
        
        // ✅ NEW: Immediately update wallet for game_complete_refresh (instant balance after game)
        if (type === 'game_complete_refresh' && balance !== undefined && balance !== null) {
          updatePlayerWallet(balance);
          console.log(`✅ Instant balance refresh after game complete: ₹${balance}`);
        }
        
        const balanceEvent = new CustomEvent('balance-websocket-update', {
          detail: { balance, amount, type, timestamp: Date.now() }
        });
        window.dispatchEvent(balanceEvent);
        updatePlayerWallet(balance);
        break;
      }

      // ✅ FIX #4: Balance correction handler
      case 'balance_correction': {
        const wsData = (data as any).data;
        console.log('💰 Balance correction received:', wsData);
        
        // Update balance from server correction (highest priority)
        if (wsData.balance !== undefined && wsData.balance !== null) {
          updatePlayerWallet(wsData.balance);
          
          // Dispatch balance event for other contexts to update immediately
          const balanceEvent = new CustomEvent('balance-websocket-update', {
            detail: { 
              balance: wsData.balance, 
              amount: 0, // Correction, not a transaction
              type: 'correction', 
              reason: wsData.reason || 'Balance correction',
              timestamp: wsData.timestamp || Date.now() 
            }
          });
          window.dispatchEvent(balanceEvent);
          
          // Show notification if reason is provided and it's not the default verification message
          if (wsData.reason && wsData.reason !== 'Balance correction after verification') {
            showNotification(`Balance corrected: ₹${wsData.balance.toLocaleString('en-IN')}`, 'info');
          }
        }
        break;
      }

      // Payout error handler
      case 'payout_error': {
        const wsData = (data as any).data;
        console.error('❌ Payout error:', wsData);
        showNotification(wsData.message || 'Payout processing error. Please contact support.', 'error');
        break;
      }

      // Payment request notifications
      case 'admin_payment_notification': {
        const { message, reason, timestamp } = (data as any).data;
        showNotification(message, 'success');
        
        // Refresh balance after payment approval
        const balanceEvent = new CustomEvent('refresh-balance', {
          detail: { source: 'payment-notification' }
        });
        window.dispatchEvent(balanceEvent);
        
        // Update profile if on profile page
        const profileUpdateEvent = new CustomEvent('payment-request-updated', {
          detail: { message, reason, timestamp }
        });
        window.dispatchEvent(profileUpdateEvent);
        break;
      }

      // User status change notifications
      case 'status_update': {
        const { userId, status, reason, timestamp } = (data as any).data;
        if (userId === authState.user?.id) {
          showNotification(`Account status changed to ${status}. ${reason || ''}`, 'warning');
          
          // Redirect to login if banned/suspended
          if (status === 'banned' || status === 'suspended') {
            setTimeout(() => {
              webSocketManagerRef.current?.disconnect();
              logout();
              window.location.href = '/login';
            }, 3000);
          }
        }
        break;
      }
      
      // Admin dashboards: real-time bet updates
      case 'admin_bet_update': {
        const betData = (data as any).data;
        
        console.log('📨 Received admin_bet_update:', betData);
        
        // ✅ FIX: Update GameState context with new bet totals so admin dashboard displays them
        // Create new objects to ensure React detects the change
        if (betData.round1Bets) {
          const round1Bets = {
            andar: betData.round1Bets.andar || 0,
            bahar: betData.round1Bets.bahar || 0
          };
          console.log('🔄 Updating round1Bets:', round1Bets);
          updateRoundBets(1, round1Bets);
        }
        if (betData.round2Bets) {
          const round2Bets = {
            andar: betData.round2Bets.andar || 0,
            bahar: betData.round2Bets.bahar || 0
          };
          console.log('🔄 Updating round2Bets:', round2Bets);
          updateRoundBets(2, round2Bets);
        }
        
        // Also dispatch event for other components that may listen
        const event = new CustomEvent('admin_bet_update', {
          detail: betData
        });
        window.dispatchEvent(event);
        
        console.log('✅ Admin bet totals updated via WebSocket:', {
          round1: betData.round1Bets,
          round2: betData.round2Bets,
          totalAndar: betData.totalAndar,
          totalBahar: betData.totalBahar
        });
        
        // ✅ CRITICAL: Force a re-render by dispatching a custom event
        // This ensures admin components update even if React doesn't detect the change
        window.dispatchEvent(new CustomEvent('gameStateUpdated', {
          detail: {
            round1Bets: betData.round1Bets,
            round2Bets: betData.round2Bets
          }
        }));
        break;
      }

      // Analytics dashboard: real-time aggregate updates
      case 'analytics_update': {
        const wsData = (data as any).data;
        
        // Check if this is a typed analytics update (daily/monthly/yearly)
        if (wsData?.type && (wsData.type === 'daily' || wsData.type === 'monthly' || wsData.type === 'yearly')) {
          // Preserve the type for typed updates (daily/monthly/yearly)
          const analyticsEvent = new CustomEvent('analytics-update', {
            detail: {
              type: wsData.type,
              data: wsData.data
            }
          });
          window.dispatchEvent(analyticsEvent);
        } else {
          // For real-time stats updates (no inner type - has currentGame, todayStats, etc.)
          const analyticsEvent = new CustomEvent('realtime-analytics-update', {
            detail: wsData
          });
          window.dispatchEvent(analyticsEvent);
          
          // Also emit generic analytics-update for backward compatibility
          const genericEvent = new CustomEvent('analytics-update', {
            detail: { type: 'realtime', data: wsData }
          });
          window.dispatchEvent(genericEvent);
        }
        break;
      }

      // Game history update for ALL users (basic data)
      case 'game_history_update' as any: {
        const event = new CustomEvent('game_history_update', {
          detail: (data as any).data
        });
        window.dispatchEvent(event);
        break;
      }

      // ✅ FIX #5: Admin-specific game history update (detailed analytics)
      case 'game_history_update_admin' as any: {
        // Admin-specific detailed game history update
        const adminEvent = new CustomEvent('game_history_update_admin', {
          detail: (data as any).data
        });
        window.dispatchEvent(adminEvent);
        
        // Also emit the regular game_history_update for backward compatibility
        const regularEvent = new CustomEvent('game_history_update', {
          detail: (data as any).data
        });
        window.dispatchEvent(regularEvent);
        break;
      }

      // Admin notifications (requests, status changes)
      case 'admin_notification': {
        const adminEvent = new CustomEvent('admin_notification', {
          detail: (data as any)
        });
        window.dispatchEvent(adminEvent);
        break;
      }

      // Bonus updates (e.g., claim, grant)
      case 'bonus_update': {
        const bonusEvent = new CustomEvent('bonus_update', {
          detail: (data as any).data
        });
        window.dispatchEvent(bonusEvent);
        break;
      }

      // Conditional bonus applied notification
      case 'conditional_bonus_applied': {
        const { message } = (data as any).data;
        showNotification(message, 'success');
        
        // Refresh balance after bonus
        const balanceEvent = new CustomEvent('refresh-balance', {
          detail: { source: 'conditional-bonus' }
        });
        window.dispatchEvent(balanceEvent);
        break;
      }

      // Payout received after game completion
      case 'payout_received': {
        const { amount, balance, winner, round } = (data as PayoutReceivedMessage).data;
        
        // ✅ Store the payout amount for celebration display
        console.log(`💰 Payout received: ₹${amount}, Winner: ${winner}, Round: ${round}`);
        
        // Immediately update balance from the message (no API delay)
        if (balance !== undefined && balance !== null) {
          updatePlayerWallet(balance);
          // Also dispatch event for other components that listen to balance updates
          const balanceEvent = new CustomEvent('balance-websocket-update', {
            detail: { balance, amount, type: amount > 0 ? 'win' : 'loss', timestamp: Date.now() }
          });
          window.dispatchEvent(balanceEvent);
        }
        
        // ✅ Dispatch payout event so celebration can use the exact server amount
        const payoutEvent = new CustomEvent('payout-received-event', {
          detail: { amount, winner, round, balance }
        });
        window.dispatchEvent(payoutEvent);
        
        console.log(`✅ Payout event dispatched: ₹${amount}`);
        break;
      }
      
      case 'user_bets_update': {
        // ✅ FIX: user_bets_update is sent after DB fetch, but bet_confirmed already updated local state
        // This is a refresh from DB to ensure consistency, but we should avoid duplicate notifications
        // CRITICAL: user_bets_update should only be received by the user who placed the bet
        // This is sent directly from server, but double-check it's not for another user
        // Server sends individual bets as arrays instead of cumulative totals
        const { round1Bets, round2Bets } = (data as UserBetsUpdateMessage).data;
        // Ensure arrays are properly formatted
        const r1Bets = {
          andar: Array.isArray(round1Bets?.andar) ? round1Bets.andar : [],
          bahar: Array.isArray(round1Bets?.bahar) ? round1Bets.bahar : []
        };
        const r2Bets = {
          andar: Array.isArray(round2Bets?.andar) ? round2Bets.andar : [],
          bahar: Array.isArray(round2Bets?.bahar) ? round2Bets.bahar : []
        };
        // ✅ FIX: Silently update bets without showing notification (bet_confirmed already showed it)
        // This is just a refresh from DB to ensure consistency
        updatePlayerRoundBets(1, r1Bets);
        updatePlayerRoundBets(2, r2Bets);
        break;
      }

      case 'bet_success': {
        // ✅ FIX: bet_success is a legacy/duplicate handler - bet_confirmed is the primary handler
        // This should not be sent from server anymore, but handle it gracefully if it arrives
        console.warn('⚠️ Received bet_success message - this is deprecated. Use bet_confirmed instead.');
        const { side, amount, round, newBalance, message } = (data as BetSuccessMessage).data;
        // Don't show notification - bet_confirmed already showed it (if it was sent)
        // Only update if bet_confirmed wasn't already processed
        updatePlayerWallet(newBalance);
        // Add new bet to array instead of cumulative total
        const currentBets = round === 1 ? gameState.playerRound1Bets : gameState.playerRound2Bets;
        const currentSideBets = Array.isArray(currentBets[side as keyof typeof currentBets]) 
          ? (currentBets[side as keyof typeof currentBets] as number[])
          : [];
        const newBets = {
          ...currentBets,
          [side]: [...currentSideBets, amount],
        };
        updatePlayerRoundBets(round, newBets);
        break;
      }

      case 'auth_error': {
        const { message, redirectTo } = (data as AuthErrorMessage).data;
        console.error('❌ WebSocket authentication error:', message);
        console.error('Auth state at error time:', {
          isAuthenticated: authState.isAuthenticated,
          hasToken: !!authState.token,
          hasUser: !!authState.user,
          userRole: authState.user?.role
        });
        showNotification(`Authentication failed: ${message}`, 'error');
        
        // Disconnect WebSocket before logout
        webSocketManagerRef.current?.disconnect();
        
        logout();
        if (redirectTo) {
          setTimeout(() => {
            window.location.href = redirectTo;
          }, 2000);
        }
        break;
      }

      case 'stream_status': {
        const { status, method, url } = (data as StreamStatusMessage).data;
        const event = new CustomEvent('stream_status', {
          detail: { status, method, url }
        });
        window.dispatchEvent(event);
        break;
      }

      case 'webrtc:signal': {
        const signalData = data as WebRTCSignalMessage;
        if (signalData.data) {
          console.log('📡 WebRTC signal received:', signalData.data.type);
          switch (signalData.data.type) {
            case 'stream-start':
              // Set global state to TRUE
              setScreenSharing(true);
              console.log('✅ Screen sharing started - UI updated');
              // Dispatch event for WebRTCPlayer to initialize connection
              window.dispatchEvent(new CustomEvent('webrtc_stream_start', { detail: signalData.data }));
              break;
            case 'stream-stop':
              // Set global state to FALSE
              setScreenSharing(false);
              console.log('⏹️ Screen sharing stopped - UI updated');
              // Dispatch event for WebRTCPlayer to cleanup connection
              window.dispatchEvent(new CustomEvent('webrtc_stream_stop', { detail: signalData.data }));
              break;
            case 'stream-pause':
              // Fire event for WebRTCPlayer to show paused overlay
              console.log('⏸️ Stream paused - dispatching to WebRTCPlayer');
              window.dispatchEvent(new CustomEvent('webrtc_stream_pause', { detail: signalData.data }));
              break;
            case 'stream-resume':
              // Fire event for WebRTCPlayer to hide paused overlay
              console.log('▶️ Stream resumed - dispatching to WebRTCPlayer');
              window.dispatchEvent(new CustomEvent('webrtc_stream_resume', { detail: signalData.data }));
              break;
            case 'offer':
              // Fire event for WebRTCPlayer to pick up
              console.log('📡 WebRTC offer received - dispatching to WebRTCPlayer');
              window.dispatchEvent(new CustomEvent('webrtc_offer_received', { detail: signalData.data }));
              break;
            case 'answer':
              // Fire event for WebRTCPlayer to pick up
              console.log('📡 WebRTC answer received - dispatching to WebRTCPlayer');
              window.dispatchEvent(new CustomEvent('webrtc_answer_received', { detail: signalData.data }));
              break;
            case 'ice-candidate':
              // Fire event for WebRTCPlayer to pick up
              console.log('🧊 WebRTC ICE candidate received - dispatching to WebRTCPlayer');
              window.dispatchEvent(new CustomEvent('webrtc_ice_candidate_received', { detail: signalData.data }));
              break;
          }
        }
        break;
      }
      
      case 'notification': {
          const { message, type } = (data as NotificationMessage).data;
          showNotification(message, type);
          break;
      }

      default:
        console.log('Unknown message type:', data.type);
    }
  }, [addAndarCard, addBaharCard, clearCards, gameState.playerRound1Bets, gameState.playerRound2Bets, logout, resetGame, setCurrentRound, setCountdown, setPhase, setSelectedOpeningCard, setWinner, setWinningCard, showNotification, updatePlayerRoundBets, updateTotalBets, updatePlayerWallet, authState.user?.id, authState.isAuthenticated, isWebSocketAuthenticated]);

  const initWebSocketManager = useCallback(() => {
    if (webSocketManagerRef.current) {
      console.log('WebSocketManager already initialized');
      return;
    }

    const wsUrl = getWebSocketUrl();
    console.log('🔧 Initializing WebSocketManager with URL:', wsUrl);
    
    webSocketManagerRef.current = WebSocketManager.getInstance({
      url: wsUrl,
      tokenProvider: getAuthToken,
      onMessage: (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!isValidWebSocketMessage(data)) {
            console.warn('⚠️ Received invalid WebSocket message:', data);
            return;
          }
          handleWebSocketMessage(data);
        } catch (parseError) {
          console.error('❌ WebSocket message parsing error:', parseError);
          handleComponentError(parseError, 'WebSocket message parsing');
        }
      },
      onOpen: () => {
        console.log('✅ WebSocket opened - showing notification');
        showNotification('Connected to game server', 'success');
      },
      onClose: (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        
        // Handle different close codes
        if (event.code === 1008 || event.code === 4008) {
          console.log('⚠️ WebSocket auth failed (code ' + event.code + ')');
          showNotification('Authentication failed. Reconnecting...', 'warning');
          // WebSocketManager will handle reconnection automatically
        } else if (event.code === 1000) {
          console.log('✅ WebSocket closed normally');
        } else {
          console.log('⚠️ WebSocket closed with code:', event.code);
          showNotification('Connection lost. Reconnecting...', 'warning');
        }
      },
      onError: (error) => {
        console.error('❌ WebSocket connection error:', error);
        showNotification('Connection error. Please check your network.', 'error');
        // Don't logout on connection errors - WebSocketManager handles reconnection
      },
    });

    webSocketManagerRef.current.on('statusChange', (status) => {
      console.log('📡 WebSocket status changed to:', status);
      setConnectionStatus(status);
    });
    
    console.log('✅ WebSocketManager initialized successfully');
  }, [getAuthToken, handleWebSocketMessage, showNotification]);

  const connectWebSocket = useCallback(() => {
    setIsWebSocketAuthenticated(false); // Reset auth state when reconnecting
    initWebSocketManager();
    webSocketManagerRef.current?.connect();
  }, [initWebSocketManager]);

  const disconnectWebSocket = useCallback(() => {
    setIsWebSocketAuthenticated(false); // Reset auth state on disconnect
    webSocketManagerRef.current?.disconnect();
  }, []);

  const sendWebSocketMessage = useCallback((message: Omit<WebSocketMessage, 'timestamp'>) => {
    const messageWithTimestamp = {
      ...message,
      timestamp: new Date().toISOString()
    };
    
    // Enhanced connection state check before sending
    if (!webSocketManagerRef.current) {
      console.error('WebSocketManager: Cannot send message, manager not initialized', message);
      return;
    }
    
    const currentStatus = webSocketManagerRef.current.getStatus();
    if (currentStatus !== ConnectionStatus.CONNECTED) {
      console.error(`WebSocketManager: Cannot send message, not connected. Status: ${currentStatus}`, message);
      showNotification('Connection to game server lost. Please refresh the page.', 'error');
      return;
    }
    
    webSocketManagerRef.current.send(messageWithTimestamp);
  }, [showNotification]);

  const startGame = async (timerDuration?: number) => {
    if (!gameState.selectedOpeningCard) {
      showNotification('Please select an opening card first!', 'error');
      return;
    }

    // DEBUG: Log current auth state
    console.log('🎮 START GAME REQUEST - Auth state:', {
      userId: authState.user?.id,
      userRole: authState.user?.role,
      token: authState.token ? 'present' : 'missing',
      isAuthenticated: authState.isAuthenticated
    });

    // Check if we have a proper role before sending admin commands
    if (!authState.user?.role || (authState.user.role !== 'admin' && authState.user.role !== 'super_admin')) {
      showNotification(`Only admins can start games. Current role: ${authState.user?.role || 'unknown'}. Please login as admin.`, 'error');
      return;
    }

    // Wait for WebSocket to be authenticated before sending
    if (connectionStatus !== ConnectionStatus.CONNECTED) {
      showNotification('Connecting to game server... Please wait.', 'warning');
      return;
    }

    try {
      console.log('🎮 Starting game with opening card:', gameState.selectedOpeningCard);
      sendWebSocketMessage({
        type: 'start_game',
        data: {
          openingCard: gameState.selectedOpeningCard.display,
          timerDuration: timerDuration || 30,
        }
      });

      showNotification('Game started! Betting phase is open.', 'success');
    } catch (error) {
      handleComponentError(error, 'startGame');
      showNotification('Failed to start game. Please try again.', 'error');
      console.error('startGame error:', error);
    }
  };

  const dealCard = async (card: Card, side: BetSide, position: number) => {
    // Check if we have admin role before sending admin commands
    if (authState.user?.role !== 'admin' && authState.user?.role !== 'super_admin') {
      showNotification('Only admins can deal cards.', 'error');
      return;
    }

    // Wait for WebSocket to be connected before sending
    if (connectionStatus !== ConnectionStatus.CONNECTED) {
      showNotification('Connecting to game server... Please wait.', 'warning');
      return;
    }

    try {
      console.log(`🃏 Dealing card: ${card.display} on ${side} at position ${position}`);
      sendWebSocketMessage({
        type: 'deal_card',
        data: {
          gameId: gameState.gameId || 'default-game',
          card: card.display,
          side: side,
          position: position
        }
      });

      showNotification(`Dealt ${card.display} on ${side.toUpperCase()}`, 'success');
    } catch (error) {
      handleComponentError(error, 'dealCard');
      showNotification('Error dealing card', 'error');
      console.error('dealCard error:', error);
    }
  };

  const placeBet = async (side: BetSide, amount: number) => {
    try {
      // ✅ FIX: Validate gameId before sending bet
      if (!gameState.gameId || gameState.gameId === 'default-game') {
        console.error('❌ Cannot place bet: No valid gameId', {
          gameId: gameState.gameId,
          phase: gameState.phase,
          round: gameState.currentRound
        });
        showNotification('Game session not ready. Please wait for admin to start the game.', 'error');
        return;
      }
      
      console.log('📝 Placing bet:', {
        gameId: gameState.gameId,
        side,
        amount,
        round: gameState.currentRound
      });
      
      // Add gameId to bet message
      sendWebSocketMessage({
        type: 'place_bet',
        data: {
          gameId: gameState.gameId,
          side,
          amount,
          round: gameState.currentRound, // ✅ FIX: Send as number, not string
        }
      });
    } catch (error) {
      console.error('Failed to place bet:', error);
      showNotification(
        error instanceof Error ? error.message : 'Failed to place bet',
        'error'
      );
    }
  };

  useEffect(() => {
    const initializeWebSocket = async () => {
      // Wait for auth to be checked before initializing WebSocket
      if (!authState.authChecked) {
        console.log('🔄 Waiting for auth check to complete before WebSocket init...');
        return;
      }

      // Only connect if user is authenticated
      if (!authState.isAuthenticated) {
        console.log('⏸️ User not authenticated - disconnecting WebSocket');
        setIsWebSocketAuthenticated(false);
        webSocketManagerRef.current?.disconnect();
        return;
      }

      // If no token yet, wait for it
      if (!authState.token) {
        console.log('⏸️ No token available yet - waiting...');
        return;
      }

      // If WebSocket is already connected, don't reconnect (WebSocketManager handles token updates automatically)
      if (webSocketManagerRef.current && webSocketManagerRef.current.getStatus() !== ConnectionStatus.DISCONNECTED) {
        console.log('✅ WebSocket already connected - token updates handled automatically');
        return;
      }

      console.log('🚀 Initializing WebSocket with authenticated user:', authState.user?.role);
      setIsWebSocketAuthenticated(false); // Reset auth state before connecting
      initWebSocketManager();
      
      // Connect and authenticate immediately with available token
      webSocketManagerRef.current?.connect();
    };
    
    initializeWebSocket();
    
    // Only disconnect on unmount or when authentication is lost
    return () => {
      if (!authState.isAuthenticated) {
        console.log('🔌 Auth lost - disconnecting WebSocket on cleanup');
        setIsWebSocketAuthenticated(false);
        webSocketManagerRef.current?.disconnect();
      }
    };
  }, [authState.authChecked, authState.isAuthenticated, authState.token, initWebSocketManager]); // Depend on auth state

  // ✅ FIX: Subscribe to game state immediately after WebSocket authentication
  useEffect(() => {
    if (connectionStatus === ConnectionStatus.CONNECTED && isWebSocketAuthenticated && webSocketManagerRef.current) {
      console.log('✅ WebSocket authenticated - subscribing to game state');
      
      // ✅ FIX: Subscribe immediately (no delay) for faster state sync
      const subscribeToGameState = () => {
        sendWebSocketMessage({
          type: 'game_subscribe',
          data: {}
        });
        
        console.log('📡 Game state subscription sent');
      };
      
      // ✅ FIX: Subscribe immediately after auth, but also fetch via REST API as fallback
      subscribeToGameState();
      
      // ✅ FIX: Also fetch game state via REST API as fallback for faster sync
      const fetchGameStateFallback = async () => {
        try {
          // Fetch current game state via REST API for immediate display
          const response = await apiClient.get('/api/game/current-state');
          if (response && response.phase && response.phase !== 'idle') {
            console.log('📊 Fallback: Fetched game state via REST API:', response);
            // Update state from REST API response
            if (response.openingCard) {
              const parsed = typeof response.openingCard === 'string' ? parseDisplayCard(response.openingCard) : response.openingCard;
              setSelectedOpeningCard(parsed);
            }
            if (response.phase) setPhase(response.phase as any);
            if (response.currentRound) setCurrentRound(response.currentRound as any);
            if (response.timer !== undefined) setCountdown(response.timer);
            if (response.bettingLocked !== undefined) setBettingLocked(response.bettingLocked);
          }
        } catch (error) {
          console.error('⚠️ Fallback game state fetch failed (non-critical):', error);
          // Non-critical, WebSocket subscription will handle it
        }
      };
      
      // Fetch fallback state after a short delay
      const fallbackTimer = setTimeout(fetchGameStateFallback, 100);
      
      return () => clearTimeout(fallbackTimer);
    } else if (connectionStatus === ConnectionStatus.DISCONNECTED) {
      console.log('⏸️ WebSocket disconnected');
      setIsWebSocketAuthenticated(false); // Reset auth state on disconnect
    } else if (connectionStatus === ConnectionStatus.ERROR) {
      console.error('❌ WebSocket connection error');
      setIsWebSocketAuthenticated(false); // Reset auth state on error
    }
  }, [connectionStatus, isWebSocketAuthenticated, sendWebSocketMessage]);

  const value: WebSocketContextType = {
      sendWebSocketMessage,
      startGame,
      dealCard,
      placeBet,
      connectWebSocket,
      disconnectWebSocket,
      connectionStatus,
    };
  
    return (
      <WebSocketContext.Provider value={value}>
        {children}
      </WebSocketContext.Provider>
    );
  };

  export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (context === undefined) {
      throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
  };
