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
  placeBet: (side: BetSide, amount: number) => Promise<void>;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  connectionState: ConnectionState;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// Fixed URL function to use proxy in development
const getWebSocketUrl = (): string => {
  if (typeof window !== 'undefined') {
    // In development, use the same host (proxy will forward to backend)
    // In production, use the actual WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // Uses current host (localhost:3000 in dev)
    return `${protocol}//${host}/ws`;
  }
  // Server environment
  return process.env.WEBSOCKET_URL || 'ws://localhost:5000/ws';
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
    updatePlayerWallet,
    updatePlayerRoundBets,
    updateRoundBets
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
        
        // Send authentication message
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            ws.send(JSON.stringify({
              type: 'authenticate',
              data: {
                userId: user.id,
                username: user.username,
                role: user.role || 'player'
              },
              timestamp: Date.now()
            }));
            console.log('Authentication message sent');
          } catch (error) {
            console.error('Failed to parse user data for authentication:', error);
          }
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
              // Sync complete game state with user-specific data
              if (data.data?.phase) setPhase(data.data.phase);
              if (data.data?.countdown !== undefined) setCountdown(data.data.countdown);
              if (data.data?.winner) setWinner(data.data.winner);
              if (data.data?.currentRound) setCurrentRound(data.data.currentRound);
              
              // Convert opening card string to Card object
              if (data.data?.openingCard) {
                const openingCard = typeof data.data.openingCard === 'string'
                  ? {
                      display: data.data.openingCard,
                      value: data.data.openingCard.replace(/[♠♥♦♣]/g, ''),
                      suit: data.data.openingCard.match(/[♠♥♦♣]/)?.[0] || ''
                    }
                  : data.data.openingCard;
                setSelectedOpeningCard(openingCard);
              }
              
              // Sync dealt cards
              if (data.data?.andarCards && Array.isArray(data.data.andarCards)) {
                data.data.andarCards.forEach((cardStr: string) => {
                  const card = typeof cardStr === 'string'
                    ? {
                        display: cardStr,
                        value: cardStr.replace(/[♠♥♦♣]/g, ''),
                        suit: cardStr.match(/[♠♥♦♣]/)?.[0] || ''
                      }
                    : cardStr;
                  addAndarCard(card);
                });
              }
              if (data.data?.baharCards && Array.isArray(data.data.baharCards)) {
                data.data.baharCards.forEach((cardStr: string) => {
                  const card = typeof cardStr === 'string'
                    ? {
                        display: cardStr,
                        value: cardStr.replace(/[♠♥♦♣]/g, ''),
                        suit: cardStr.match(/[♠♥♦♣]/)?.[0] || ''
                      }
                    : cardStr;
                  addBaharCard(card);
                });
              }
              
              // Update total bets
              if (data.data?.andarTotal !== undefined && data.data?.baharTotal !== undefined) {
                updateTotalBets({ andar: data.data.andarTotal, bahar: data.data.baharTotal });
              }
              
              // Update user's individual bets from previous rounds
              if (data.data?.userRound1Bets) {
                updatePlayerRoundBets(1, data.data.userRound1Bets);
              }
              if (data.data?.userRound2Bets) {
                updatePlayerRoundBets(2, data.data.userRound2Bets);
              }
              break;

            case 'opening_card_set':
            case 'opening_card_confirmed':
              if (data.data?.openingCard) {
                // Convert string to Card object if needed
                const openingCard = typeof data.data.openingCard === 'string'
                  ? {
                      display: data.data.openingCard,
                      value: data.data.openingCard.replace(/[♠♥♦♣]/g, ''),
                      suit: data.data.openingCard.match(/[♠♥♦♣]/)?.[0] || ''
                    }
                  : data.data.openingCard;
                
                setSelectedOpeningCard(openingCard);
                setPhase('betting'); // Update phase to betting
                if (data.data.round) setCurrentRound(data.data.round);
                showNotification(`Opening card: ${openingCard.display} - Round ${data.data.round || 1} betting started!`, 'success');
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
              
              // Update round 1 locked bets display
              if (data.data?.round1Bets) {
                updateRoundBets(1, data.data.round1Bets);
              }
              
              showNotification(
                data.data?.message || 'Round 2 betting started! Your Round 1 bets are locked.',
                'success'
              );
              break;

            case 'start_final_draw':
              setCurrentRound(3);
              setPhase('dealing');
              setCountdown(0);
              
              // Update locked bets from both rounds
              if (data.data?.round1Bets) {
                updateRoundBets(1, data.data.round1Bets);
              }
              if (data.data?.round2Bets) {
                updateRoundBets(2, data.data.round2Bets);
              }
              
              showNotification(
                data.data?.message || 'Round 3: Continuous draw! All bets locked.',
                'warning'
              );
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
            
            case 'user_bets_update':
              // Update user's locked bets from previous rounds
              if (data.data?.round1Bets) {
                updatePlayerRoundBets(1, data.data.round1Bets);
              }
              if (data.data?.round2Bets) {
                updatePlayerRoundBets(2, data.data.round2Bets);
              }
              break;
            
            case 'payout_received':
              // Show payout notification
              if (data.data?.amount > 0) {
                showNotification(`You won ₹${data.data.amount.toLocaleString()}!`, 'success');
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
      // Send WebSocket message to start game (backend handles this)
      sendWebSocketMessage({
        type: 'game_start',
        data: {
          openingCard: gameState.selectedOpeningCard,
          timer: customTime,
          gameId: 'default-game'
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
      // Send WebSocket message to deal card
      sendWebSocketMessage({
        type: 'deal_card',
        data: {
          card: card,
          side: side,
          position: position,
          gameId: 'default-game'
        }
      });

      console.log('Card dealt message sent:', card.display, side);
    } catch (error) {
      handleComponentError(error, 'dealCard');
      showNotification('Error dealing card', 'error');
    }
  };

  const placeBet = async (side: BetSide, amount: number) => {
    try {
      // Send WebSocket message to place bet
      sendWebSocketMessage({
        type: 'bet_placed',
        data: {
          side: side,
          amount: amount,
          round: gameState.currentRound,
          gameId: 'default-game'
        }
      });

      console.log('Bet placed message sent:', side, amount);
    } catch (error) {
      handleComponentError(error, 'placeBet');
      showNotification('Error placing bet', 'error');
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
    placeBet,
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
