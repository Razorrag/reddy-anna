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
  TokenRefreshMessage,
  TokenRefreshedMessage,
  TokenRefreshErrorMessage,
  ActivityPingMessage,
  ActivityPongMessage,
  TokenExpiryWarningMessage,
  TokenExpiredMessage,
  InactivityWarningMessage,
  BetErrorMessage,
  BetConfirmedMessage,
  StartGameMessage,
  DealCardMessage,
  PlaceBetMessage,
} from '../../../shared/src/types/webSocket';
import WebSocketManager, { ConnectionStatus } from '../lib/WebSocketManager';

import { handleComponentError } from '../lib/utils';

// Validate WebSocket message structure
const isValidWebSocketMessage = (data: any): data is WebSocketMessage => {
  return data && typeof data === 'object' && 'type' in data;
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
      case 'authenticated':
        console.log('WebSocket authenticated:', data.data);
        // Handle game state synchronization for new connections
        if (data.data.gameState) {
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
            userBalance,
            canBet,
            isGameActive,
            bettingLocked,
            status
          } = data.data.gameState;
          
          setPhase(phase as any);
          setCountdown(countdownTimer || timer || 0);
          setWinner(winner);
          setCurrentRound(currentRound as any);
          if (openingCard) setSelectedOpeningCard(openingCard);
          clearCards();
          andarCards?.forEach(addAndarCard);
          baharCards?.forEach(addBaharCard);
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
        if(openingCard) setSelectedOpeningCard(openingCard);
        clearCards();
        andarCards.forEach(addAndarCard);
        baharCards.forEach(addBaharCard);
        if(totalBets) updateTotalBets(totalBets);
        if(userBets) {
          updatePlayerRoundBets(1, userBets.round1);
          updatePlayerRoundBets(2, userBets.round2);
        }
        break;
      }
        
      case 'opening_card_confirmed': {
        const { openingCard, phase, round, timer } = (data as OpeningCardConfirmedMessage).data;
        setSelectedOpeningCard(openingCard);
        setPhase(phase);
        setCurrentRound(round);
        setCountdown(timer);
        showNotification(`Opening card: ${openingCard.display} - Round ${round} betting started!`, 'success');
        break;
      }
        
      case 'card_dealt': {
        const { side, card, isWinningCard } = (data as CardDealtMessage).data;
        if (side === 'andar') {
          addAndarCard(card);
        } else {
          addBaharCard(card);
        }
        if (isWinningCard) {
          showNotification(`${side.toUpperCase()} wins with ${card.display}!`, 'success');
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
        const celebrationEvent = new CustomEvent('game-complete-celebration', {
          detail: data.data
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
        console.error('WebSocket authentication error:', message);
        showNotification(message, 'error');
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

      case 'webrtc_offer': {
        const event = new CustomEvent('webrtc_offer_received', { detail: data.data });
        window.dispatchEvent(event);
        break;
      }
      case 'webrtc_answer': {
        const event = new CustomEvent('webrtc_answer_received', { detail: data.data });
        window.dispatchEvent(event);
        break;
      }
      case 'webrtc_ice_candidate': {
        const event = new CustomEvent('webrtc_ice_candidate_received', { detail: data.data });
        window.dispatchEvent(event);
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
    if (webSocketManagerRef.current) return;

    const wsUrl = getWebSocketUrl();
    webSocketManagerRef.current = WebSocketManager.getInstance({
      url: wsUrl,
      tokenProvider: getAuthToken,
      onMessage: (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!isValidWebSocketMessage(data)) {
            console.warn('Received invalid WebSocket message:', data);
            return;
          }
          handleWebSocketMessage(data);
        } catch (parseError) {
          console.error('WebSocket message parsing error:', parseError);
          handleComponentError(parseError, 'WebSocket message parsing');
        }
      },
      onOpen: () => {
        showNotification('Connected to game server', 'success');
      },
      onClose: (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        if (event.code === 1008) {
          console.log('WebSocket auth failed - attempting reconnect');
          // Add reconnect logic here instead of logout
        }
      },
      onError: (error) => {
        console.error('WebSocket connection error:', error);
        // Don't logout on connection errors - just attempt reconnect
      },
    });

    webSocketManagerRef.current.on('statusChange', setConnectionStatus);
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
    if (!authState.user?.role || authState.user?.role !== 'admin') {
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
          openingCard: gameState.selectedOpeningCard,
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
    if (authState.user?.role !== 'admin') {
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
          card: card.rank + card.suit,
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
          round: gameState.currentRound,
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
      initWebSocketManager();
      
      // Always attempt to connect - WebSocketManager will handle authentication
      // This ensures connection is established even if token is initially loading
      webSocketManagerRef.current?.connect();
    };
    
    initializeWebSocket();
    
    return () => {
      webSocketManagerRef.current?.disconnect();
    };
  }, []); // Remove initWebSocketManager from dependencies to prevent reconnection loops

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
