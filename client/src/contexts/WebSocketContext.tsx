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
          return decoded.exp < currentTime;
        }
      } catch (e) {
        console.error('Error decoding token for expiration check:', e);
      }
      return true; // Assume expired if cannot decode
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
      console.log('No token found, logging out.');
      logout();
      showNotification('Authentication required, please login.', 'error');
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
    webSocketManagerRef.current?.send(messageWithTimestamp);
  }, []);

  const startGame = async () => {
    if (!gameState.selectedOpeningCard) {
      showNotification('Please select an opening card first!', 'error');
      return;
    }

    const customTime = 30;

    try {
      sendWebSocketMessage({
        type: 'game_start',
        data: {
          openingCard: gameState.selectedOpeningCard,
          timer: customTime,
        }
      });

      showNotification(`Game started with ${customTime} seconds!`, 'success');
    } catch (error) {
      handleComponentError(error, 'startGame');
      showNotification('Failed to start game. Please try again.', 'error');
    }
  };

  const dealCard = async (card: Card, side: BetSide, position: number) => {
    try {
      sendWebSocketMessage({
        type: 'card_dealt',
        data: {
          card: card,
          side: side,
          position: position,
          isWinningCard: false // This will be determined by the server
        }
      });
    } catch (error) {
      handleComponentError(error, 'dealCard');
      showNotification('Error dealing card', 'error');
    }
  };

  const placeBet = async (side: BetSide, amount: number) => {
    try {
      sendWebSocketMessage({
        type: 'place_bet',
        data: {
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
      // Only connect if we have a valid token
      const token = await getAuthToken();
      if (token) {
        webSocketManagerRef.current?.connect();
      }
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
