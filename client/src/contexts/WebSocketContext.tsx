import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { useGameState } from './GameStateContext';
import { useNotification } from './NotificationContext';
import type { Card, WebSocketMessage, ConnectionState, BetSide } from '@/types/game';
import { handleComponentError } from '../lib/utils';

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
    updateRoundBets,
    resetBettingData,
    clearCards
  } = useGameState();
  const { showNotification } = useNotification();
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    connected: false,
    connecting: false,
    isConnected: false,
    isConnecting: false,
    connectionError: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5
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
    
    setConnectionState(prev => ({ ...prev, connecting: true, isConnecting: true, connectionError: null }));

    try {
      // Use the dynamic URL function
      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setConnectionState({
          connected: true,
          connecting: false,
          isConnected: true,
          isConnecting: false,
          connectionError: null,
          reconnectAttempts: 0,
          maxReconnectAttempts: 5
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
              if (data.data?.phase) setPhase(data.data.phase);
              if (data.data?.countdown !== undefined) setCountdown(data.data.countdown);
              if (data.data?.winner) setWinner(data.data.winner);
              if (data.data?.currentRound) setCurrentRound(data.data.currentRound);
              if (data.data?.openingCard) setSelectedOpeningCard(data.data.openingCard);
              // Clear existing cards and sync new ones
              if (data.data?.andarCards || data.data?.baharCards) {
                clearCards();
                if (data.data?.andarCards && Array.isArray(data.data.andarCards)) {
                  data.data.andarCards.forEach((card: Card) => addAndarCard(card));
                }
                if (data.data?.baharCards && Array.isArray(data.data.baharCards)) {
                  data.data.baharCards.forEach((card: Card) => addBaharCard(card));
                }
              }
              // Ensure ALL state properties are synchronized
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
                
                console.log('Opening card received:', openingCard);
                setSelectedOpeningCard(openingCard);
                setPhase('betting');
                if (data.data.round) setCurrentRound(data.data.round);
                console.log('Opening card set in state, phase updated to betting');
                showNotification(`Opening card: ${openingCard.display} - Round ${data.data.round || 1} betting started!`, 'success');
              }
              break;
              
            case 'card_dealt':
              // Update card display based on WebSocket data
              if (data.data.side === 'andar') {
                addAndarCard(data.data.card);
              } else {
                addBaharCard(data.data.card);
              }
              // Check if this is the winning card
              if (data.data.isWinningCard) {
                setWinner(data.data.side);
              }
              break;

            case 'timer_start':
            case 'timer_update':
              // Update timer consistently
              setCountdown(data.data.seconds);
              if (data.data.phase) setPhase(data.data.phase);
              break;

            case 'timer_stop':
              setCountdown(0);
              break;

            case 'betting_stats':
              // Update total bets for display
              updateTotalBets({ 
                andar: data.data.andarTotal, 
                bahar: data.data.baharTotal 
              });
              // Update individual round bets
              if (data.data.round1Bets) updateRoundBets(1, data.data.round1Bets);
              if (data.data.round2Bets) updateRoundBets(2, data.data.round2Bets);
              break;

            case 'start_round_2':
              setCurrentRound(data.data.round);
              setPhase('betting');
              if (data.data.timer) setCountdown(data.data.timer);
              if (data.data.round1Bets) updateRoundBets(1, data.data.round1Bets);
              showNotification(data.data.message || 'Round 2 betting started!', 'success');
              break;

            case 'start_final_draw':
              setCurrentRound(3);
              setPhase('dealing');
              setCountdown(0);
              if (data.data.round1Bets) updateRoundBets(1, data.data.round1Bets);
              if (data.data.round2Bets) updateRoundBets(2, data.data.round2Bets);
              showNotification(data.data.message || 'Round 3: Continuous draw started!', 'warning');
              break;
              
            case 'game_complete':
              setWinner(data.data.winner);
              setPhase('complete');
              setCurrentRound(1);
              showNotification(data.data.message || 'Game completed!', 'success');
              break;

            case 'game_reset':
              // Reset all game state
              setPhase('idle');
              setCurrentRound(1);
              setCountdown(0);
              clearCards();
              setWinner(null);
              resetBettingData();
              showNotification(data.data.message || 'Game reset', 'info');
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
              // Update individual user's locked bets
              if (data.data.round1Bets) updatePlayerRoundBets(1, data.data.round1Bets);
              if (data.data.round2Bets) updatePlayerRoundBets(2, data.data.round2Bets);
              break;
            
            case 'payout_received':
              // Show payout notification
              if (data.data?.amount && data.data.amount > 0) {
                showNotification(`You won ₹${data.data.amount.toLocaleString()}!`, 'success');
              }
              break;

            case 'betting_locked':
              // Handle betting locked state
              if (data.data?.locked !== undefined) {
                // This would be handled by GameStateContext
                console.log('Betting locked state:', data.data.locked);
                if (data.data.locked) {
                  showNotification('Betting locked for this round', 'warning');
                }
              }
              break;

            case 'round_complete':
              // Handle round completion
              if (data.data?.round && data.data?.winner) {
                showNotification(`Round ${data.data.round} complete! ${data.data.winner} wins!`, 'info');
              }
              break;

            case 'card_animation':
              // Handle card animation triggers
              if (data.data?.card && data.data?.target) {
                console.log('Card animation triggered:', data.data);
                // This would trigger animations in the UI
              }
              break;

            case 'confetti_trigger':
              // Handle confetti animation for wins
              console.log('Confetti animation triggered');
              // This would trigger confetti animation
              break;

            case 'haptic_feedback':
              // Handle haptic feedback for mobile devices
              if (data.data?.type && 'vibrate' in navigator) {
                const pattern = data.data.type === 'win' ? [200, 100, 200] : [100];
                navigator.vibrate(pattern);
              }
              break;

            case 'accessibility_update':
              // Handle accessibility announcements
              if (data.data?.message && 'speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(data.data.message);
                speechSynthesis.speak(utterance);
              }
              break;

            case 'error':
              showNotification(data.data?.message || 'An error occurred', 'error');
              console.error('WebSocket error received:', data.data);
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
        setConnectionState(prev => ({ 
          ...prev, 
          connected: false, 
          connecting: false, 
          isConnected: false, 
          isConnecting: false, 
          connectionError: 'Connection failed' 
        }));
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        
        setConnectionState(prev => {
          const reconnectAttempts = prev.reconnectAttempts ?? 0;
          const maxReconnectAttempts = prev.maxReconnectAttempts ?? 5;
          const shouldReconnect = event.code !== 1000 && reconnectAttempts < maxReconnectAttempts;
          
          if (shouldReconnect) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff, max 30s
            
            console.log(`Attempting to reconnect in ${delay}ms...`);
            
            const timeout = setTimeout(() => {
              console.log(`Reconnection attempt ${reconnectAttempts + 1}/${maxReconnectAttempts}`);
              connectWebSocket();
            }, delay);
            
            setReconnectTimeout(timeout);
          } else {
            showNotification('Disconnected from game server', 'error');
          }
          
          return {
            ...prev,
            connected: false,
            connecting: false,
            isConnected: false,
            isConnecting: false,
            reconnectAttempts: shouldReconnect ? reconnectAttempts + 1 : reconnectAttempts,
          };
        });
      };

      // Store WebSocket instance
      (window as any).gameWebSocket = ws;
    } catch (connectionError) {
      console.error('Failed to initialize WebSocket:', connectionError);
      setConnectionState(prev => ({ 
        ...prev, 
        connecting: false, 
        isConnecting: false, 
        connectionError: 'Initialization failed' 
      }));
      showNotification('Failed to initialize WebSocket connection', 'error');
    }
  }, [setPhase, setCountdown, setWinner, addAndarCard, addBaharCard, setSelectedOpeningCard, updateTotalBets, setCurrentRound, addDealtCard, showNotification, reconnectTimeout]);

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
        timestamp: message.timestamp || new Date()
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
    connectionState,
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
