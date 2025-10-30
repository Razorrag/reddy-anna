import React, { createContext, useContext, useCallback, useEffect, useState, useRef, ReactNode } from 'react';
import { useGameState } from './GameStateContext';
import { useNotification } from './NotificationContext';
import { useAuth } from './AuthContext';
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

declare global {
  interface Window {
    API_BASE_URL?: string;
  }
}

interface WebSocketContextType {
  sendWebSocketMessage: (message: Omit<WebSocketMessage, 'timestamp'>) => void;
  startGame: () => Promise<void>;
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
    setPhase, 
    setCountdown, 
    setWinner, 
    addAndarCard, 
    addBaharCard,
    setSelectedOpeningCard,
    updateTotalBets,
    setCurrentRound,
    updatePlayerRoundBets,
    clearCards,
    resetGame,
    updatePlayerWallet,
    setScreenSharing,
  } = useGameState();
  const { showNotification } = useNotification();
  const { state: authState, logout, refreshAccessToken } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);

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
      console.error('WebSocket error:', errorData);
      showNotification(errorData.message || 'Operation failed', 'error');
      return;
    }

    switch (data.type) {
      case 'authenticated': {
        console.log('✅ WebSocket authenticated successfully:', data.data);
        const gameState = data.data.gameState;
        if (gameState) {
          console.log('📊 Received game state sync:', {
            phase: gameState.phase,
            round: gameState.currentRound,
            hasOpeningCard: !!gameState.openingCard
          });
          
          const {
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
            userBalance
          } = gameState;
          
          setPhase(phase as any);
          setCountdown(countdownTimer || timer || 0);
          setWinner(winner);
          setCurrentRound(currentRound as any);
          if (openingCard && typeof openingCard === 'string') setSelectedOpeningCard(parseDisplayCard(openingCard));
          clearCards();
          andarCards?.forEach((c: any) => addAndarCard(typeof c === 'string' ? parseDisplayCard(c) : c));
          baharCards?.forEach((c: any) => addBaharCard(typeof c === 'string' ? parseDisplayCard(c) : c));
          if (round1Bets) updateTotalBets(round1Bets);
          if (round2Bets) updateTotalBets(round2Bets);
          if (userBets) {
            updatePlayerRoundBets(1, userBets.round1);
            updatePlayerRoundBets(2, userBets.round2);
          }
          if (playerRound1Bets) updatePlayerRoundBets(1, playerRound1Bets);
          if (playerRound2Bets) updatePlayerRoundBets(2, playerRound2Bets);
          if (userBalance !== undefined) updatePlayerWallet(userBalance);
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
        console.log('Bet confirmed:', data.data);
        showNotification(`Bet placed: ₹${data.data.amount} on ${data.data.side}`, 'success');
        updatePlayerWallet(data.data.newBalance);
        const currentBets = data.data.round === 1 ? gameState.playerRound1Bets : gameState.playerRound2Bets;
        const newBets = {
          ...currentBets,
          [data.data.side]: currentBets[data.data.side as keyof typeof currentBets] + data.data.amount,
        };
        updatePlayerRoundBets(data.data.round as any, newBets);
        break;

      case 'sync_game_state': {
        const {
          phase,
          countdown,
          winner,
          currentRound,
          openingCard,
          andarCards,
          baharCards,
          totalBets,
          userBets
        } = (data as GameStateSyncMessage).data;
        setPhase(phase);
        setCountdown(countdown);
        setWinner(winner);
        setCurrentRound(currentRound);
        if (openingCard) setSelectedOpeningCard(typeof openingCard === 'string' ? parseDisplayCard(openingCard) : openingCard);
        clearCards();
        andarCards.forEach((c: any) => addAndarCard(typeof c === 'string' ? parseDisplayCard(c) : c));
        baharCards.forEach((c: any) => addBaharCard(typeof c === 'string' ? parseDisplayCard(c) : c));
        if(totalBets) updateTotalBets(totalBets);
        if(userBets) {
          updatePlayerRoundBets(1, userBets.round1);
          updatePlayerRoundBets(2, userBets.round2);
        }
        break;
      }
        
      case 'opening_card_confirmed': {
        const { openingCard, phase, round, timer } = (data as OpeningCardConfirmedMessage).data;
        const parsed = typeof openingCard === 'string' ? parseDisplayCard(openingCard) : openingCard;
        setSelectedOpeningCard(parsed);
        setPhase(phase);
        setCurrentRound(round);
        setCountdown(timer);
        showNotification(`Opening card: ${parsed.display} - Round ${round} betting started!`, 'success');
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
          showNotification(`${side.toUpperCase()} wins with ${parsedCard.display}!`, 'success');
          // Trigger celebration event
          const celebrationEvent = new CustomEvent('game-complete-celebration', {
            detail: { winner: side, winningCard: parsedCard, round: gameState.currentRound }
          });
          window.dispatchEvent(celebrationEvent);
        }
        break;
      }

      case 'timer_update': {
        const { seconds, phase } = (data as TimerUpdateMessage).data;
        setCountdown(seconds);
        setPhase(phase);
        break;
      }

      case 'betting_stats': {
        const { andarTotal, baharTotal } = (data as BettingStatsMessage).data;
        updateTotalBets({ andar: andarTotal, bahar: baharTotal });
        break;
      }

      case 'game_complete': {
        const { winner, message } = (data as GameCompleteMessage).data;
        setPhase('complete');
        setWinner(winner);
        showNotification(message, 'success');
        // Compute local user's potential win for dynamic celebration
        const r1 = gameState.playerRound1Bets?.[winner as 'andar' | 'bahar'] || 0;
        const r2 = gameState.playerRound2Bets?.[winner as 'andar' | 'bahar'] || 0;
        const localWinAmount = (r1 || 0) + (r2 || 0);
        const celebrationEvent = new CustomEvent('game-complete-celebration', {
          detail: { ...data.data, localWinAmount }
        });
        window.dispatchEvent(celebrationEvent);
        break;
      }

      case 'game_reset': {
        const { message } = (data as GameResetMessage).data;
        resetGame();
        showNotification(message || 'Game reset', 'info');
        break;
      }

      case 'phase_change': {
        const { phase, round, message } = (data as PhaseChangeMessage).data;
        setPhase(phase);
        setCurrentRound(round);
        if (message) {
          showNotification(message, 'info');
        }
        break;
      }

      case 'balance_update': {
        const { balance, amount, type } = (data as BalanceUpdateMessage).data;
        const balanceEvent = new CustomEvent('balance-websocket-update', {
          detail: { balance, amount, type, timestamp: Date.now() }
        });
        window.dispatchEvent(balanceEvent);
        updatePlayerWallet(balance);
        break;
      }
      
      // Admin dashboards: real-time bet updates
      case 'admin_bet_update': {
        const event = new CustomEvent('admin_bet_update', {
          detail: (data as any).data
        });
        window.dispatchEvent(event);
        break;
      }

      // Analytics dashboard: real-time aggregate updates
      case 'analytics_update': {
        const analyticsEvent = new CustomEvent('realtime-analytics-update', {
          detail: (data as any).data
        });
        window.dispatchEvent(analyticsEvent);
        // Also emit a generic analytics-update in case specific handlers exist
        const genericEvent = new CustomEvent('analytics-update', {
          detail: { type: 'realtime', data: (data as any).data }
        });
        window.dispatchEvent(genericEvent);
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
      
      case 'user_bets_update': {
        const { round1Bets, round2Bets } = (data as UserBetsUpdateMessage).data;
        updatePlayerRoundBets(1, round1Bets);
        updatePlayerRoundBets(2, round2Bets);
        break;
      }

      case 'bet_success': {
        const { side, amount, round, newBalance, message } = (data as BetSuccessMessage).data;
        showNotification(message, 'success');
        updatePlayerWallet(newBalance);
        const currentBets = round === 1 ? gameState.playerRound1Bets : gameState.playerRound2Bets;
        const newBets = {
          ...currentBets,
          [side]: currentBets[side as keyof typeof currentBets] + amount,
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
              break;
            case 'stream-stop':
              // Set global state to FALSE
              setScreenSharing(false);
              console.log('⏹️ Screen sharing stopped - UI updated');
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
  }, [addAndarCard, addBaharCard, clearCards, gameState.playerRound1Bets, gameState.playerRound2Bets, logout, resetGame, setCurrentRound, setCountdown, setPhase, setSelectedOpeningCard, setWinner, showNotification, updatePlayerRoundBets, updateTotalBets, updatePlayerWallet]);

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
    initWebSocketManager();
    webSocketManagerRef.current?.connect();
  }, [initWebSocketManager]);

  const disconnectWebSocket = useCallback(() => {
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

  const startGame = async () => {
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
      // Add gameId to bet message (FIX: Missing gameId was causing server to reject bets)
      sendWebSocketMessage({
        type: 'place_bet',
        data: {
          gameId: gameState.gameId || 'default-game',
          side,
          amount,
          round: String(gameState.currentRound),
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
      if (!authState.isAuthenticated || !authState.token) {
        console.log('⏸️ Skipping WebSocket connection - user not authenticated');
        return;
      }

      console.log('🚀 Initializing WebSocket with authenticated user:', authState.user?.role);
      initWebSocketManager();
      
      // Connect and authenticate immediately with available token
      webSocketManagerRef.current?.connect();
    };
    
    initializeWebSocket();
    
    return () => {
      webSocketManagerRef.current?.disconnect();
    };
  }, [authState.authChecked, authState.isAuthenticated, authState.token]); // Depend on auth state

  // Note: Authentication is now handled by WebSocketManager automatically after connection
  // This effect is kept for monitoring purposes only
  useEffect(() => {
    if (connectionStatus === ConnectionStatus.CONNECTED) {
      console.log('✅ WebSocket connected - authentication should be automatic via WebSocketManager');
    } else if (connectionStatus === ConnectionStatus.DISCONNECTED) {
      console.log('⏸️ WebSocket disconnected');
    } else if (connectionStatus === ConnectionStatus.ERROR) {
      console.error('❌ WebSocket connection error');
    }
  }, [connectionStatus]);

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
