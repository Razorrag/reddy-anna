import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { useGameState } from './GameStateContext';
import { useNotification } from '../components/NotificationSystem/NotificationSystem';
import type { Card, WebSocketMessage, ConnectionState, BetSide, DealtCard } from '@/types/game';
import apiClient, { handleComponentError } from '../lib/apiClient';

// Validate WebSocket message structure
const isValidWebSocketMessage = (data: any): data is WebSocketMessage => {
  return data && typeof data === 'object' && 'type' in data;
};

declare global {
  interface Window {
    API_BASE_URL?: string;
    gameWebSocket?: WebSocket;
  }
}

interface WebSocketContextType {
  sendWebSocketMessage: (message: WebSocketMessage) => void;
  startGame: () => Promise<void>;
  dealCard: (card: Card, side: BetSide, position: number) => Promise<void>;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  connectionState: ConnectionState;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// Fixed URL function to use backend port only
const getWebSocketUrl = (): string => {
  if (typeof window !== 'undefined') {
    // Use environment variable or fallback to known backend port
    const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || `localhost:${import.meta.env.PORT || '5000'}`;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${wsBaseUrl}/ws`;
  }
  // Server environment
  return process.env.WEBSOCKET_URL || 'ws://localhost:5000';
};

const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // Use the same origin as the frontend
    return '';
  }
  // Server environment
  return process.env.API_BASE_URL || 'http://localhost:5000';
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
    addDealtCard,
    updatePlayerWallet
  } = useGameState();
  const { showNotification } = useNotification();
  const [webSocketState, setWebSocketState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    connectionError: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
  });
  const [reconnectTimeout, setReconnectTimeout] = useState<NodeJS.Timeout | null>(null);

  const connectWebSocket = useCallback(() => {
    if (typeof window === 'undefined') return; // Skip on server
    
    // Prevent multiple connections
    const existingWs = (window as any).gameWebSocket;
    if (existingWs && (existingWs.readyState === WebSocket.CONNECTING || existingWs.readyState === WebSocket.OPEN)) {
      console.log('WebSocket already connected or connecting, skipping...');
      return;
    }
    
    setWebSocketState(prev => ({ ...prev, isConnecting: true, connectionError: null }));

    try {
      // Use the dynamic URL function
      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setWebSocketState({
          isConnected: true,
          isConnecting: false,
          connectionError: null,
          reconnectAttempts: 0,
          maxReconnectAttempts: 5,
        });
        (window as any).gameWebSocket = ws;
        
        // Clear any pending reconnection timeout
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          setReconnectTimeout(null);
        }
        
        showNotification('Connected to game server', 'success');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (!isValidWebSocketMessage(data)) {
            console.warn('Received invalid WebSocket message:', data);
            return;
          }

          // Handle validated message with standardized types
          switch (data.type) {
            case 'connection':
              console.log('WebSocket connection established:', data.data);
              break;

            case 'authenticated':
              console.log('WebSocket authenticated:', data.data);
              break;

            case 'sync_game_state':
              // Sync complete game state
              if (data.data?.phase) setPhase(data.data.phase);
              if (data.data?.countdown !== undefined) setCountdown(data.data.countdown);
              if (data.data?.winner) setWinner(data.data.winner);
              if (data.data?.openingCard) setSelectedOpeningCard(data.data.openingCard);
              if (data.data?.currentRound) setCurrentRound(data.data.currentRound);
              break;

            case 'opening_card_set':
            case 'opening_card_confirmed':
              if (data.data?.openingCard) {
                setSelectedOpeningCard(data.data.openingCard);
                showNotification(`Opening card set: ${data.data.openingCard.display}`, 'info');
              }
              break;
              
            case 'card_dealt':
              // Handle card dealt message
              const dealtCard: DealtCard = {
                card: data.data.card,
                side: data.data.side,
                position: data.data.position,
                isWinningCard: data.data.isWinningCard,
                timestamp: Date.now()
              };
              addDealtCard(dealtCard);
              
              if (data.data.side === 'andar') {
                addAndarCard(data.data.card);
              } else {
                addBaharCard(data.data.card);
              }
              break;

            case 'timer_start':
            case 'timer_update':
              if (data.data?.seconds !== undefined) {
                setCountdown(data.data.seconds);
              }
              if (data.data?.phase) {
                setPhase(data.data.phase);
              }
              break;

            case 'timer_stop':
              setCountdown(0);
              break;

            case 'betting_stats':
              if (data.data?.andarTotal !== undefined && data.data?.baharTotal !== undefined) {
                updateTotalBets({ andar: data.data.andarTotal, bahar: data.data.baharTotal });
              }
              break;

            case 'start_round_2':
              setCurrentRound(2);
              setPhase('betting');
              if (data.data?.timer) setCountdown(data.data.timer);
              showNotification('Round 2 betting started!', 'info');
              break;

            case 'start_final_draw':
              setCurrentRound(3);
              setPhase('dealing');
              setCountdown(0);
              showNotification('Round 3: Continuous draw started!', 'warning');
              break;
              
            case 'game_complete':
              // Handle game complete message
              if (data.data?.winner) {
                setWinner(data.data.winner);
                setPhase('complete');
                showNotification(`Game complete! ${data.data.winner.toUpperCase()} wins!`, 'success');
              }
              break;

            case 'game_reset':
              setPhase('opening');
              setCurrentRound(1);
              setCountdown(0);
              showNotification('Game has been reset', 'info');
              break;

            case 'phase_change':
              if (data.data?.phase) {
                setPhase(data.data.phase);
              }
              if (data.data?.message) {
                showNotification(data.data.message, 'info');
              }
              break;

            case 'balance_update':
              // Update player wallet from backend
              if (data.data?.balance !== undefined) {
                updatePlayerWallet(data.data.balance);
              }
              break;

            case 'error':
              showNotification(data.data?.message || 'An error occurred', 'error');
              break;
              
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (parseError) {
          handleComponentError(parseError, 'WebSocket message parsing');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWebSocketState(prev => ({ ...prev, isConnected: false, isConnecting: false, connectionError: 'Connection failed' }));
        showNotification('WebSocket connection failed', 'error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setWebSocketState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          connectionError: event.code !== 1000 ? 'Connection closed unexpectedly' : null,
        }));
        
        if (event.code === 1000) {
          // Normal close, no reconnection
          showNotification('Disconnected from game server', 'info');
          return;
        }
        
        // Attempt to reconnect with exponential backoff
        setWebSocketState(prev => {
          if (prev.reconnectAttempts >= prev.maxReconnectAttempts) {
            showNotification('Failed to reconnect. Please refresh the page.', 'error');
            return { ...prev, connectionError: 'Max reconnection attempts reached' };
          }
          
          const delay = Math.min(1000 * Math.pow(2, prev.reconnectAttempts), 30000);
          showNotification(`Reconnecting in ${delay / 1000} seconds...`, 'info');
          
          const timeout = setTimeout(() => {
            console.log(`Reconnection attempt ${prev.reconnectAttempts + 1}/${prev.maxReconnectAttempts}`);
            connectWebSocket();
          }, delay);
          
          setReconnectTimeout(timeout);
          
          return {
            ...prev,
            reconnectAttempts: prev.reconnectAttempts + 1,
          };
        });
      };

      // Store WebSocket instance
      (window as any).gameWebSocket = ws;
    } catch (connectionError) {
      console.error('Failed to initialize WebSocket:', connectionError);
      setWebSocketState(prev => ({ ...prev, isConnecting: false, connectionError: 'Initialization failed' }));
      showNotification('Failed to initialize WebSocket connection', 'error');
    }
  }, [setPhase, setCountdown, setWinner, addAndarCard, addBaharCard, setSelectedOpeningCard, updateTotalBets, setCurrentRound, addDealtCard, showNotification]);

  const disconnectWebSocket = useCallback(() => {
    const ws = (window as any).gameWebSocket;
    if (ws) {
      ws.close();
      delete (window as any).gameWebSocket;
    }
  }, []);

  const startGame = async () => {
    if (!gameState.selectedOpeningCard) {
      showNotification('Please select an opening card first!', 'error');
      return;
    }

    // Show start game popup logic would go here
    const customTime = 30; // Default for demo

    try {
      // Use API client with proper error handling
      
      // Set opening card in backend
      await apiClient.post('/api/game/set-opening-card', {
        card: gameState.selectedOpeningCard.display,
        game_id: 'default-game'
      });

      // Start timer in backend
      await apiClient.post('/api/game/start-timer', {
        duration: customTime,
        phase: 'betting',
        game_id: 'default-game'
      });

      showNotification(`Game started with ${customTime} seconds!`, 'success');

      setPhase('betting');
      setCountdown(customTime);
    } catch (error) {
      handleComponentError(error, 'startGame');
      showNotification('Failed to start game. Please try again.', 'error');
    }
  };

  const dealCard = async (card: Card, side: BetSide, position: number) => {
    try {
      const result = await apiClient.post('/api/game/deal-card', {
        card: card.display,
        side: side,
        position: position,
        game_id: 'default-game'
      });

      if (result.success) {
        console.log('Card dealt successfully:', result);

        // Update local state
        if (side === 'andar') {
          addAndarCard(card);
        } else {
          addBaharCard(card);
        }

        if (result.data.isWinningCard) {
          showNotification(`Game complete! ${side.toUpperCase()} wins with ${card.display}!`, 'success');
          setWinner(side);
          setPhase('complete');
        }
      } else {
        showNotification('Failed to deal card in backend', 'error');
      }
    } catch (error) {
      handleComponentError(error, 'dealCard');
      showNotification('Error dealing card', 'error');
    }
  };

  useEffect(() => {
    // Only connect once on mount
    connectWebSocket();
    
    // Cleanup on unmount or HMR
    return () => {
      console.log('Cleaning up WebSocket connection...');
      const ws = (window as any).gameWebSocket;
      if (ws) {
        ws.close(1000, 'Component unmounting'); // Normal close
        delete (window as any).gameWebSocket;
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []); // Empty deps - only run once on mount

  const sendWebSocketMessage = useCallback((message: WebSocketMessage) => {
    const ws = (window as any).gameWebSocket;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const messageWithTimestamp: WebSocketMessage = {
        ...message,
        timestamp: message.timestamp || Date.now()
      };
      ws.send(JSON.stringify(messageWithTimestamp));
      console.log('Sent WebSocket message:', messageWithTimestamp.type);
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
      showNotification('Not connected to server', 'warning');
    }
  }, [showNotification]);

  const value: WebSocketContextType = {
    sendWebSocketMessage,
    startGame,
    dealCard,
    connectWebSocket,
    disconnectWebSocket,
    connectionState: webSocketState,
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
