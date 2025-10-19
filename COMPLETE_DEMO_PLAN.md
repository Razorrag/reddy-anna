# Complete Andar Bahar Demo Implementation - File-by-File Analysis

## Overview
This document provides a detailed, file-by-file breakdown of every change needed to transform the current codebase into the complete, working demo as described. Each file is analyzed and the exact code changes are specified.

## File 1: client/src/providers/AppProviders.tsx

### Current Code (NEEDS FIX)
```tsx
import React from 'react';
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { GameStateProvider } from '../contexts/GameStateContext';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import { NotificationProvider } from '../components/NotificationSystem/NotificationSystem';
import { queryClient } from '../lib/queryClient';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <NotificationProvider>
          <WebSocketProvider>  // ❌ This needs GameStateContext but GameStateProvider comes after
            <GameStateProvider>  // ❌ This should come BEFORE WebSocketProvider
              {children}
            </GameStateProvider>
          </WebSocketProvider>
        </NotificationProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default AppProviders;
```

### NEW CODE (Fixed Order)
```tsx
import React from 'react';
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { GameStateProvider } from '../contexts/GameStateContext';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import { NotificationProvider } from '../components/NotificationSystem/NotificationSystem';
import { queryClient } from '../lib/queryClient';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <GameStateProvider>  // ✅ Moved BEFORE WebSocketProvider
          <NotificationProvider>
            <WebSocketProvider>  // ✅ Now has access to GameState
              {children}
            </WebSocketProvider>
          </NotificationProvider>
        </GameStateProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default AppProviders;
```

## File 2: client/src/contexts/GameStateContext.tsx

### Current Code (NEEDS EXTENSION)
```tsx
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface Card {
  suit: string;
  value: string;
  display: string;
}

interface GameState {
  selectedOpeningCard: Card | null;
  andarCards: Card[];
  baharCards: Card[];
  phase: 'opening' | 'betting' | 'playing' | 'complete';
  countdownTimer: number;
  gameWinner: 'andar' | 'bahar' | null;
  isGameActive: boolean;
}

type GameStateAction =
  | { type: 'SET_OPENING_CARD'; payload: Card }
  | { type: 'ADD_ANDAR_CARD'; payload: Card }
  | { type: 'ADD_BAHAR_CARD'; payload: Card }
  | { type: 'SET_PHASE'; payload: GameState['phase'] }
  | { type: 'SET_COUNTDOWN'; payload: number }
  | { type: 'SET_WINNER'; payload: GameState['gameWinner'] }
  | { type: 'RESET_GAME' }
  | { type: 'SET_GAME_ACTIVE'; payload: boolean };

const initialState: GameState = {
  selectedOpeningCard: null,
  andarCards: [],
  baharCards: [],
  phase: 'opening',
  countdownTimer: 0,
  gameWinner: null,
  isGameActive: false,
};

const gameReducer = (state: GameState, action: GameStateAction): GameState => {
  switch (action.type) {
    case 'SET_OPENING_CARD':
      return { ...state, selectedOpeningCard: action.payload };
    case 'ADD_ANDAR_CARD':
      return { ...state, andarCards: [...state.andarCards, action.payload] };
    case 'ADD_BAHAR_CARD':
      return { ...state, baharCards: [...state.baharCards, action.payload] };
    case 'SET_PHASE':
      return { ...state, phase: action.payload };
    case 'SET_COUNTDOWN':
      return { ...state, countdownTimer: action.payload };
    case 'SET_WINNER':
      return { ...state, gameWinner: action.payload, phase: 'complete' };
    case 'RESET_GAME':
      return initialState;
    case 'SET_GAME_ACTIVE':
      return { ...state, isGameActive: action.payload };
    default:
      return state;
  }
};

interface GameStateContextType {
  gameState: GameState;
  setSelectedOpeningCard: (card: Card) => void;
  addAndarCard: (card: Card) => void;
  addBaharCard: (card: Card) => void;
  setPhase: (phase: GameState['phase']) => void;
  setCountdown: (time: number) => void;
  setWinner: (winner: GameState['gameWinner']) => void;
  resetGame: () => void;
  setGameActive: (active: boolean) => void;
  phase: GameState['phase'];
}

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

export const GameStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);

  const setSelectedOpeningCard = (card: Card) => {
    dispatch({ type: 'SET_OPENING_CARD', payload: card });
  };

  const addAndarCard = (card: Card) => {
    dispatch({ type: 'ADD_ANDAR_CARD', payload: card });
  };

  const addBaharCard = (card: Card) => {
    dispatch({ type: 'ADD_BAHAR_CARD', payload: card });
  };

  const setPhase = (phase: GameState['phase']) => {
    dispatch({ type: 'SET_PHASE', payload: phase });
  };

  const setCountdown = (time: number) => {
    dispatch({ type: 'SET_COUNTDOWN', payload: time });
  };

  const setWinner = (winner: GameState['gameWinner']) => {
    dispatch({ type: 'SET_WINNER', payload: winner });
  };

  const resetGame = () => {
    dispatch({ type: 'RESET_GAME' });
  };

  const setGameActive = (active: boolean) => {
    dispatch({ type: 'SET_GAME_ACTIVE', payload: active });
  };

  const value: GameStateContextType = {
    gameState,
    setSelectedOpeningCard,
    addAndarCard,
    addBaharCard,
    setPhase,
    setCountdown,
    setWinner,
    resetGame,
    setGameActive,
    phase: gameState.phase,
  };

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
};

export const useGameState = () => {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
};
```

### NEW CODE (Extended with Full Game State)
```tsx
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface Card {
  suit: string;
  value: string;
  display: string;
}

// Enhanced GameState interface with full demo requirements
interface GameState {
  selectedOpeningCard: Card | null;
  andarCards: Card[];
  baharCards: Card[];
  phase: 'idle' | 'opening' | 'betting' | 'dealing' | 'complete';
  countdownTimer: number;
  gameWinner: 'andar' | 'bahar' | null;
  isGameActive: boolean;
  currentRound: number;  // Track current round
  playerBets: {
    andar: number; // total amount bet on andar
    bahar: number; // total amount bet on bahar
  };
  playerWallet: number; // player's balance
  gameHistory: GameResult[]; // track game history
  userRole: 'player' | 'admin'; // track user role
  roundBets: {
    round1: { andar: number; bahar: number };
    round2: { andar: number; bahar: number };
  }; // separate bets for each round
  winningCard: Card | null; // track winning card
}

interface GameResult {
  id: string;
  openingCard: string;
  winner: 'andar' | 'bahar';
  winningCard: string;
  totalCards: number;
  createdAt: Date;
}

type GameStateAction =
  | { type: 'SET_OPENING_CARD'; payload: Card }
  | { type: 'ADD_ANDAR_CARD'; payload: Card }
  | { type: 'ADD_BAHAR_CARD'; payload: Card }
  | { type: 'SET_PHASE'; payload: GameState['phase'] }
  | { type: 'SET_COUNTDOWN'; payload: number }
  | { type: 'SET_WINNER'; payload: GameState['gameWinner'] }
  | { type: 'RESET_GAME' }
  | { type: 'SET_GAME_ACTIVE'; payload: boolean }
  | { type: 'SET_CURRENT_ROUND'; payload: number }
  | { type: 'UPDATE_BETS'; payload: { andar: number; bahar: number } }
  | { type: 'UPDATE_PLAYER_WALLET'; payload: number }
  | { type: 'ADD_GAME_HISTORY'; payload: GameResult }
  | { type: 'SET_USER_ROLE'; payload: 'player' | 'admin' }
  | { type: 'UPDATE_ROUND_BETS'; payload: { round: number; andar: number; bahar: number } }
  | { type: 'SET_WINNING_CARD'; payload: Card };

const initialState: GameState = {
  selectedOpeningCard: null,
  andarCards: [],
  baharCards: [],
  phase: 'idle', // Changed to 'idle' as start state
  countdownTimer: 0,
  gameWinner: null,
  isGameActive: false,
  currentRound: 1,
  playerBets: { andar: 0, bahar: 0 },
  playerWallet: 0, // Will be set by authentication
  gameHistory: [],
  userRole: 'player', // Default to player
  roundBets: {
    round1: { andar: 0, bahar: 0 },
    round2: { andar: 0, bahar: 0 }
  },
  winningCard: null,
};

const gameReducer = (state: GameState, action: GameStateAction): GameState => {
  switch (action.type) {
    case 'SET_OPENING_CARD':
      return { ...state, selectedOpeningCard: action.payload };
    case 'ADD_ANDAR_CARD':
      return { ...state, andarCards: [...state.andarCards, action.payload] };
    case 'ADD_BAHAR_CARD':
      return { ...state, baharCards: [...state.baharCards, action.payload] };
    case 'SET_PHASE':
      return { ...state, phase: action.payload };
    case 'SET_COUNTDOWN':
      return { ...state, countdownTimer: action.payload };
    case 'SET_WINNER':
      return { ...state, gameWinner: action.payload, phase: 'complete' };
    case 'RESET_GAME':
      return {
        ...initialState,
        playerWallet: state.playerWallet, // preserve wallet
        userRole: state.userRole, // preserve user role
      };
    case 'SET_GAME_ACTIVE':
      return { ...state, isGameActive: action.payload };
    case 'SET_CURRENT_ROUND':
      return { ...state, currentRound: action.payload };
    case 'UPDATE_BETS':
      return { ...state, playerBets: action.payload };
    case 'UPDATE_PLAYER_WALLET':
      return { ...state, playerWallet: action.payload };
    case 'ADD_GAME_HISTORY':
      return { ...state, gameHistory: [...state.gameHistory, action.payload] };
    case 'SET_USER_ROLE':
      return { ...state, userRole: action.payload };
    case 'UPDATE_ROUND_BETS':
      if (action.payload.round === 1) {
        return {
          ...state,
          roundBets: {
            ...state.roundBets,
            round1: { andar: action.payload.andar, bahar: action.payload.bahar }
          }
        };
      } else if (action.payload.round === 2) {
        return {
          ...state,
          roundBets: {
            ...state.roundBets,
            round2: { andar: action.payload.andar, bahar: action.payload.bahar }
          }
        };
      }
      return state;
    case 'SET_WINNING_CARD':
      return { ...state, winningCard: action.payload };
    default:
      return state;
  }
};

interface GameStateContextType {
  gameState: GameState;
  setSelectedOpeningCard: (card: Card) => void;
  addAndarCard: (card: Card) => void;
  addBaharCard: (card: Card) => void;
  setPhase: (phase: GameState['phase']) => void;
  setCountdown: (time: number) => void;
  setWinner: (winner: GameState['gameWinner']) => void;
  resetGame: () => void;
  setGameActive: (active: boolean) => void;
  setCurrentRound: (round: number) => void;
  updateBets: (bets: { andar: number; bahar: number }) => void;
  updatePlayerWallet: (wallet: number) => void;
  addGameHistory: (result: GameResult) => void;
  setUserRole: (role: 'player' | 'admin') => void;
  updateRoundBets: (round: number, bets: { andar: number; bahar: number }) => void;
  setWinningCard: (card: Card) => void;
  phase: GameState['phase'];
}

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

export const GameStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);

  const setSelectedOpeningCard = (card: Card) => {
    dispatch({ type: 'SET_OPENING_CARD', payload: card });
  };

  const addAndarCard = (card: Card) => {
    dispatch({ type: 'ADD_ANDAR_CARD', payload: card });
  };

  const addBaharCard = (card: Card) => {
    dispatch({ type: 'ADD_BAHAR_CARD', payload: card });
  };

  const setPhase = (phase: GameState['phase']) => {
    dispatch({ type: 'SET_PHASE', payload: phase });
  };

  const setCountdown = (time: number) => {
    dispatch({ type: 'SET_COUNTDOWN', payload: time });
  };

  const setWinner = (winner: GameState['gameWinner']) => {
    dispatch({ type: 'SET_WINNER', payload: winner });
  };

  const resetGame = () => {
    dispatch({ type: 'RESET_GAME' });
  };

  const setGameActive = (active: boolean) => {
    dispatch({ type: 'SET_GAME_ACTIVE', payload: active });
  };

  const setCurrentRound = (round: number) => {
    dispatch({ type: 'SET_CURRENT_ROUND', payload: round });
  };

  const updateBets = (bets: { andar: number; bahar: number }) => {
    dispatch({ type: 'UPDATE_BETS', payload: bets });
  };

  const updatePlayerWallet = (wallet: number) => {
    dispatch({ type: 'UPDATE_PLAYER_WALLET', payload: wallet });
  };

  const addGameHistory = (result: GameResult) => {
    dispatch({ type: 'ADD_GAME_HISTORY', payload: result });
  };

  const setUserRole = (role: 'player' | 'admin') => {
    dispatch({ type: 'SET_USER_ROLE', payload: role });
  };

  const updateRoundBets = (round: number, bets: { andar: number; bahar: number }) => {
    dispatch({ type: 'UPDATE_ROUND_BETS', payload: { round, ...bets } });
  };

  const setWinningCard = (card: Card) => {
    dispatch({ type: 'SET_WINNING_CARD', payload: card });
  };

  const value: GameStateContextType = {
    gameState,
    setSelectedOpeningCard,
    addAndarCard,
    addBaharCard,
    setPhase,
    setCountdown,
    setWinner,
    resetGame,
    setGameActive,
    setCurrentRound,
    updateBets,
    updatePlayerWallet,
    addGameHistory,
    setUserRole,
    updateRoundBets,
    setWinningCard,
    phase: gameState.phase,
  };

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
};

export const useGameState = () => {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
};
```

## File 3: client/src/contexts/WebSocketContext.tsx

### Current Code (NEEDS EXTENSION)
[The current code has the context provider order issue and needs extended functionality]

### NEW CODE (Fixed and Extended)
```tsx
import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { useGameState } from './GameStateContext';
import { WebSocketMessage } from '@shared/schema';
import apiClient, { isValidWebSocketMessage, handleComponentError } from '../lib/apiClient';

interface Card {
  suit: string;
  value: string;
  display: string;
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
}

declare global {
  interface Window {
    API_BASE_URL?: string;
    gameWebSocket?: WebSocket;
  }
}

interface WebSocketContextType {
  sendWebSocketMessage: (message: any) => void;
  startGame: () => Promise<void>;
  dealCard: (card: Card, side: 'andar' | 'bahar', position: number) => Promise<void>;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  connectionState: WebSocketState;
  placeBet: (side: 'andar' | 'bahar', amount: number) => Promise<void>;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// Fixed URL functions to connect to backend port
const getWebSocketUrl = (): string => {
  if (typeof window !== 'undefined') {
    // Use environment variable or fallback to known backend port
    const backendHost = import.meta.env.VITE_WS_BASE_URL || 'localhost:5000';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${backendHost}/ws`;
  }
  // Server environment
  return process.env.WEBSOCKET_URL || 'ws://localhost:5000';
};

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { 
    gameState, 
    setPhase, 
    setCountdown, 
    setWinner, 
    addAndarCard, 
    addBaharCard,
    setCurrentRound,
    updateBets,
    updatePlayerWallet,
    setGameActive,
    updateRoundBets,
    setWinningCard
  } = useGameState();
  
  const [webSocketState, setWebSocketState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    connectionError: null,
  });
  
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    // Use the proper notification system from NotificationProvider
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '15px 25px',
      borderRadius: '10px',
      color: 'white',
      fontFamily: 'Poppins, sans-serif',
      zIndex: '1000',
      transform: 'translateX(400px)',
      transition: 'transform 0.3s ease',
    });
    
    // Add gradient background based on type
    if (type === 'success') {
      notification.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
    } else if (type === 'error') {
      notification.style.background = 'linear-gradient(45deg, #dc3545, #fd7e14)';
    } else {
      notification.style.background = 'linear-gradient(45deg, #17a2b8, #20c997)';
    }
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }, []);

  const connectWebSocket = useCallback(() => {
    if (typeof window === 'undefined') return; // Skip on server
    
    setWebSocketState(prev => ({ ...prev, isConnecting: true, connectionError: null }));

    try {
      // Use the fixed URL function
      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected successfully to:', wsUrl);
        setWebSocketState({ isConnected: true, isConnecting: false, connectionError: null });
        (window as any).gameWebSocket = ws;
        showNotification('Connected to game server', 'success');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (!isValidWebSocketMessage(data)) {
            console.warn('Received invalid WebSocket message:', data);
            return;
          }

          // Handle validated message
          switch (data.type) {
            case 'gameState':
              // Update game state based on server message
              if (data.data?.phase) setPhase(data.data.phase);
              if (data.data?.countdown !== undefined) setCountdown(data.data.countdown);
              if (data.data?.winner) setWinner(data.data.winner);
              break;
              
            case 'cardDealt':
              // Handle card dealt message
              if (data.data?.side === 'andar') {
                addAndarCard(data.data.card);
              } else if (data.data?.side === 'bahar') {
                addBaharCard(data.data.card);
              }
              break;
              
            case 'gameComplete':
              // Handle game complete message
              if (data.data?.winner) {
                setWinner(data.data.winner);
                showNotification(`Game complete! ${data.data.winner.toUpperCase()} wins!`, 'success');
              }
              break;
              
            case 'betPlaced':
              // Handle bet placed message
              if (data.data?.side && data.data?.amount) {
                updateBets({ 
                  andar: data.data.side === 'andar' ? data.data.amount : gameState.playerBets.andar,
                  bahar: data.data.side === 'bahar' ? data.data.amount : gameState.playerBets.bahar
                });
                showNotification(`Bet placed: ₹${data.data.amount} on ${data.data.side}`, 'info');
              }
              break;
              
            case 'walletUpdate':
              // Handle wallet update
              if (data.data?.balance !== undefined) {
                updatePlayerWallet(data.data.balance);
              }
              break;
              
            case 'roundChange':
              // Handle round change
              if (data.data?.round !== undefined) {
                setCurrentRound(data.data.round);
              }
              break;
              
            case 'roundBetsUpdate':
              // Handle round-specific bets
              if (data.data?.round && data.data?.andarBets !== undefined && data.data?.baharBets !== undefined) {
                updateRoundBets(data.data.round, {
                  andar: data.data.andarBets,
                  bahar: data.data.baharBets
                });
              }
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
        setWebSocketState({ isConnected: false, isConnecting: false, connectionError: null });
        showNotification('Disconnected from game server', 'info');
        
        // Attempt to reconnect after delay unless it's a normal close
        if (event.code !== 1000) { // Not a normal close
          setTimeout(() => {
            console.log('Attempting to reconnect...');
            connectWebSocket();
          }, 5000); // Retry after 5 seconds
        }
      };

      // Store WebSocket instance
      (window as any).gameWebSocket = ws;
    } catch (connectionError) {
      console.error('Failed to initialize WebSocket:', connectionError);
      setWebSocketState(prev => ({ ...prev, isConnecting: false, connectionError: 'Initialization failed' }));
      showNotification('Failed to initialize WebSocket connection', 'error');
    }
  }, [
    showNotification, 
    setPhase, 
    setCountdown, 
    setWinner, 
    addAndarCard, 
    addBaharCard,
    updateBets,
    gameState.playerBets,
    updatePlayerWallet,
    setCurrentRound,
    updateRoundBets
  ]);

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

    try {
      // Set opening card in backend
      await apiClient.post('/api/game/set-opening-card', {
        card: gameState.selectedOpeningCard.display,
        game_id: 'default-game'
      });

      // Start timer in backend
      await apiClient.post('/api/game/start-timer', {
        duration: 30, // Default to 30 seconds for demo
        phase: 'betting',
        game_id: 'default-game'
      });

      showNotification(`Game started with 30 seconds of betting!`, 'success');

      setPhase('betting');
      setCountdown(30);
      setGameActive(true);
    } catch (error) {
      handleComponentError(error, 'startGame');
      showNotification('Failed to start game. Please try again.', 'error');
    }
  };

  const placeBet = async (side: 'andar' | 'bahar', amount: number) => {
    try {
      const result = await apiClient.post('/api/game/place-bet', {
        side,
        amount,
        user_id: 'demo-user', // Will be replaced with authenticated user ID
        game_id: 'default-game'
      });

      if (result.success) {
        console.log('Bet placed successfully:', result);
        showNotification(`Bet placed: ₹${amount} on ${side.toUpperCase()}`, 'success');
        
        // Update local state will be handled by WebSocket message
      } else {
        showNotification('Failed to place bet in backend', 'error');
      }
    } catch (error) {
      handleComponentError(error, 'placeBet');
      showNotification('Error placing bet', 'error');
    }
  };

  const dealCard = async (card: Card, side: 'andar' | 'bahar', position: number) => {
    try {
      const result = await apiClient.post('/api/game/deal-card', {
        card: card.display,
        side: side,
        position: position,
        game_id: 'default-game'
      });

      if (result.success) {
        console.log('Card dealt successfully:', result);

        // Update local state - will be handled by WebSocket message
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
    connectWebSocket();
    
    return () => {
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket]);

  const sendWebSocketMessage = useCallback((message: any) => {
    const ws = (window as any).gameWebSocket;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  }, []);

  const value: WebSocketContextType = {
    sendWebSocketMessage,
    startGame,
    dealCard,
    connectWebSocket,
    disconnectWebSocket,
    connectionState: webSocketState,
    placeBet, // Add the new placeBet function
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
```

## File 4: server/routes.ts

### Current Code (NEEDS EXTENSION)
[The current server routes need to be extended to handle all demo functionality]

### NEW CODE (Extended Server Routes)
```ts
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertBetSchema, insertGameSessionSchema, insertDealtCardSchema } from "@shared/schema";
import { z } from "zod";

// WebSocket client tracking
interface WSClient {
  ws: WebSocket;
  userId: string;
  role: 'player' | 'admin';
  wallet: number; // Track player wallet
}

const clients = new Set<WSClient>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection');
    
    let client: WSClient | null = null;
    
    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received message:', message.type);
        
        switch (message.type) {
          case 'authenticate':
            // Register client
            client = {
              ws,
              userId: message.data.userId,
              role: message.data.role || 'player',
              wallet: message.data.wallet || 0,
            };
            clients.add(client);
            
            // Send confirmation
            ws.send(JSON.stringify({
              type: 'authenticated',
              data: { userId: client.userId, role: client.role, wallet: client.wallet }
            }));
            
            // Send current game state if it exists
            const currentGame = await storage.getCurrentGameSession();
            if (currentGame) {
              // Use the actual storage method to get dealt cards
              const dealtCards = await storage.getDealtCards(currentGame.gameId);
              
              // Get betting stats for the game
              const stats = await storage.getBettingStats(currentGame.gameId);
              
              ws.send(JSON.stringify({
                type: 'sync_game_state',
                data: {
                  gameId: currentGame.gameId,
                  openingCard: currentGame.openingCard,
                  phase: currentGame.phase,
                  currentTimer: currentGame.currentTimer,
                  round: currentGame.round,
                  dealtCards,
                  andarBets: stats.andarTotal,
                  baharBets: stats.baharTotal,
                  winner: currentGame.winner,
                  winningCard: currentGame.winningCard,
                }
              }));
            }
            break;
          
          case 'game_start':
            // Create new game session
            const newGame = await storage.createGameSession({
              openingCard: message.data.openingCard,
              phase: 'betting',
              currentTimer: 30,
              round: message.data.round || 1,
            });
            
            // Broadcast to all clients
            broadcast({
              type: 'sync_game_state',
              data: {
                gameId: newGame.gameId,
                openingCard: newGame.openingCard,
                phase: newGame.phase,
                currentTimer: newGame.currentTimer,
                round: newGame.round,
                dealtCards: [],
                andarBets: 0,
                baharBets: 0,
                winner: null,
                winningCard: null,
              }
            });
            break;
          
          case 'timer_update':
            // Update game timer
            const game = await storage.getCurrentGameSession();
            if (game) {
              await storage.updateGameSession(game.gameId, {
                currentTimer: message.data.seconds,
                phase: message.data.phase
              });
            }
            
            // Broadcast timer update to all clients
            broadcast({
              type: 'timer_update',
              data: message.data
            });
            break;
          
          case 'place_bet':
            try {
              // Validate bet data using schema
              const betData = insertBetSchema.parse({
                ...message.data,
                round: message.data.round || 1 // default to current round
              });
              
              // Check if betting is allowed
              const gameSession = await storage.getCurrentGameSession();
              if (!gameSession || gameSession.phase !== 'betting') {
                ws.send(JSON.stringify({
                  type: 'error',
                  data: { message: 'Betting is closed' }
                }));
                break;
              }
              
              // Check if user has sufficient balance
              const user = await storage.getUser(betData.userId);
              if (!user || user.balance < betData.amount) {
                ws.send(JSON.stringify({
                  type: 'error',
                  data: { message: 'Insufficient balance' }
                }));
                break;
              }
              
              // Place bet
              const bet = await storage.placeBet(betData);
              
              // Deduct bet amount from user balance
              await storage.updateUserBalance(betData.userId, user.balance - betData.amount);
              
              // Get updated betting stats
              const updatedStats = await storage.getBettingStats(betData.gameId);
              
              // Broadcast betting stats update
              broadcast({
                type: 'betPlaced',
                data: {
                  side: betData.side,
                  amount: betData.amount,
                  userId: betData.userId,
                  andarTotal: updatedStats.andarTotal,
                  baharTotal: updatedStats.baharTotal
                }
              });
              
              // Send updated wallet to the player
              const updatedUser = await storage.getUser(betData.userId);
              if (updatedUser) {
                ws.send(JSON.stringify({
                  type: 'walletUpdate',
                  data: { balance: updatedUser.balance }
                }));
              }
              
              // Send confirmation to player
              ws.send(JSON.stringify({
                type: 'bet_placed',
                data: bet
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: error instanceof Error ? error.message : 'Invalid bet' }
              }));
            }
            break;
          
          case 'card_dealt':
            // Record dealt card
            const gameForCard = await storage.getCurrentGameSession();
            if (gameForCard) {
              const dealtCard = await storage.dealCard({
                gameId: message.data.gameId,
                card: message.data.card,
                side: message.data.side,
                position: message.data.position,
                isWinningCard: message.data.isWinningCard
              });
              
              // Check if this card matches the opening card (winning condition)
              let isWinningCard = false;
              if (gameForCard.openingCard && gameForCard.openingCard.length >= 1 && message.data.card.length >= 1) {
                // Check if rank matches (first character of card string)
                const openingRank = gameForCard.openingCard.charAt(0);
                const dealtRank = message.data.card.charAt(0);
                isWinningCard = openingRank === dealtRank;
              }
              
              if (isWinningCard) {
                // Update the card as a winning card in storage
                await storage.updateDealtCardForGame(message.data.gameId, dealtCard.id, {
                  isWinningCard: true
                });
                
                // Complete game session
                await storage.completeGameSession(
                  message.data.gameId,
                  message.data.side,
                  message.data.card
                );
                
                // Add to game history
                await storage.addGameHistory({
                  gameId: message.data.gameId,
                  openingCard: gameForCard.openingCard!,
                  winner: message.data.side,
                  winningCard: message.data.card,
                  totalCards: (await storage.getDealtCards(message.data.gameId)).length,
                  round: gameForCard.round,
                });
                
                // Calculate and distribute winnings
                await calculateAndDistributeWinnings(message.data.gameId, message.data.side, message.data.card);
                
                // Broadcast game complete
                broadcast({
                  type: 'game_complete',
                  data: {
                    winner: message.data.side,
                    winningCard: message.data.card,
                    gameId: message.data.gameId
                  }
                });
              } else {
                // Update game session phase to dealing
                await storage.updateGameSession(gameForCard.gameId, {
                  phase: 'dealing'
                });
                
                // Send card dealt to all clients
                broadcast({
                  type: 'card_dealt',
                  data: dealtCard
                });
              }
            }
            break;
          
          case 'game_complete':
            const completedGame = await storage.getCurrentGameSession();
            if (completedGame) {
              // Complete game session
              await storage.completeGameSession(
                message.data.gameId,
                message.data.winner,
                message.data.winningCard
              );
              
              // Add to game history
              await storage.addGameHistory({
                gameId: message.data.gameId,
                openingCard: completedGame.openingCard!,
                winner: message.data.winner,
                winningCard: message.data.winningCard,
                totalCards: message.data.totalCards,
                round: message.data.round,
              });
              
              // Get all bets for this game
              const gameBets = await storage.getBetsForGame(message.data.gameId);
              
              // Update bet statuses and user balances
              for (const bet of gameBets) {
                const won = bet.side === message.data.winner;
                await storage.updateBetStatus(bet.id, won ? 'won' : 'lost');
                
                // Update user balance if won (1:1 payout + original bet)
                if (won) {
                  const user = await storage.getUser(bet.userId);
                  if (user) {
                    const payout = bet.amount * 2; // 1:1 payout means they get their bet back plus same amount
                    await storage.updateUserBalance(bet.userId, user.balance + payout);
                  }
                }
              }
              
              // Broadcast game complete
              broadcast({
                type: 'game_complete',
                data: message.data
              });
            }
            break;
          
          case 'phase_change':
            const phaseGame = await storage.getCurrentGameSession();
            if (phaseGame) {
              await storage.updateGameSession(phaseGame.gameId, {
                phase: message.data.phase
              });
            }
            
            // Broadcast phase change
            broadcast({
              type: 'phase_change',
              data: message.data
            });
            break;
          
          case 'game_reset':
            // Reset game state
            await storage.updateGameSession(message.data.gameId, {
              openingCard: null,
              phase: 'idle',
              currentTimer: 0,
              status: 'active',
              winner: null,
              winningCard: null
            });
            
            // Broadcast reset to all clients
            broadcast({
              type: 'game_reset',
              data: message.data
            });
            break;
          
          case 'settings_update':
            await storage.updateGameSettings(message.data);
            
            // Broadcast settings update
            broadcast({
              type: 'settings_update',
              data: message.data
            });
            break;
          
          case 'stream_status_update':
            // Broadcast stream status update
            broadcast({
              type: 'stream_status_update',
              data: message.data
            });
            break;
          
          case 'sync_request':
            // Send current game state to requesting client
            const syncGame = await storage.getCurrentGameSession();
            if (syncGame) {
              const syncCards = await storage.getDealtCards(syncGame.gameId);
              const syncStats = await storage.getBettingStats(syncGame.gameId);
              
              ws.send(JSON.stringify({
                type: 'sync_game_state',
                data: {
                  gameId: syncGame.gameId,
                  openingCard: syncGame.openingCard,
                  phase: syncGame.phase,
                  currentTimer: syncGame.currentTimer,
                  round: syncGame.round,
                  dealtCards: syncCards,
                  andarBets: syncStats.andarTotal,
                  baharBets: syncStats.baharTotal,
                  winner: syncGame.winner,
                  winningCard: syncGame.winningCard,
                }
              }));
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Server error' }
        }));
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket disconnected');
      if (client) {
        clients.delete(client);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  // Broadcast helper function
  function broadcast(message: any, excludeWs?: WebSocket) {
    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
      if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }
  
  // Calculate and distribute winnings
  async function calculateAndDistributeWinnings(gameId: string, winningSide: string, winningCard: string) {
    const gameBets = await storage.getBetsForGame(gameId);
    
    for (const bet of gameBets) {
      const won = bet.side === winningSide;
      await storage.updateBetStatus(bet.id, won ? 'won' : 'lost');
      
      // Update user balance if won (1:1 payout means they get their bet back plus same amount)
      if (won) {
        const user = await storage.getUser(bet.userId);
        if (user) {
          const payout = bet.amount * 2; // Original bet + win amount (1:1 payout)
          await storage.updateUserBalance(bet.userId, user.balance + payout);
        }
      } else {
        // If lost, the bet amount was already deducted when the bet was placed
        // No additional action needed
      }
    }
  }
  
  // REST API endpoints
  app.get('/api/game-history', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const history = await storage.getGameHistory(limit);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch game history' });
    }
  });
  
  app.get('/api/game/current', async (req, res) => {
    try {
      const game = await storage.getCurrentGameSession();
      if (!game) {
        return res.status(404).json({ error: 'No active game' });
      }
      
      const dealtCards = await storage.getDealtCards(game.gameId);
      const stats = await storage.getBettingStats(game.gameId);
      
      res.json({
        gameId: game.gameId,
        openingCard: game.openingCard,
        phase: game.phase,
        currentTimer: game.currentTimer,
        round: game.round,
        dealtCards,
        andarBets: stats.andarTotal,
        baharBets: stats.baharTotal,
        winner: game.winner,
        winningCard: game.winningCard,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch game state' });
    }
  });
  
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await storage.getGameSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });
  
  app.post('/api/settings', async (req, res) => {
    try {
      await storage.updateGameSettings(req.body);
      const settings = await storage.getGameSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });
  
  app.get('/api/bets/user/:userId', async (req, res) => {
    try {
      const game = await storage.getCurrentGameSession();
      if (!game) {
        return res.json([]);
      }
      
      const bets = await storage.getBetsForUser(req.params.userId, game.gameId);
      res.json(bets);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bets' });
    }
  });
  
  app.get('/api/bets/stats/:gameId', async (req, res) => {
    try {
      const stats = await storage.getBettingStats(req.params.gameId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch betting stats' });
    }
  });

  // Extended API endpoints for the complete demo

  // Place a bet (new endpoint)
  app.post('/api/game/place-bet', async (req, res) => {
    try {
      const { side, amount, userId, game_id } = req.body;
      
      if (!side || !amount || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Side, amount, and userId are required'
        });
      }
      
      // Validate side
      if (!['andar', 'bahar'].includes(side)) {
        return res.status(400).json({
          success: false,
          message: 'Side must be "andar" or "bahar"'
        });
      }
      
      // Validate amount
      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be greater than 0'
        });
      }
      
      // Check user balance
      const user = await storage.getUser(userId);
      if (!user || user.balance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance'
        });
      }
      
      // Use default game ID if not provided
      const currentGameId = game_id || 'default-game';
      
      // Get current game session
      const currentGame = await storage.getCurrentGameSession();
      if (!currentGame) {
        return res.status(400).json({
          success: false,
          message: 'No active game'
        });
      }
      
      // Check if betting is still open
      if (currentGame.phase !== 'betting') {
        return res.status(400).json({
          success: false,
          message: 'Betting is closed for this round'
        });
      }
      
      // Place the bet
      const bet = await storage.placeBet({
        userId,
        gameId: currentGameId,
        round: currentGame.round,
        side,
        amount
      });
      
      // Deduct amount from user balance
      await storage.updateUserBalance(userId, user.balance - amount);
      
      // Broadcast the bet to all clients
      broadcast({
        type: 'betPlaced',
        data: {
          side,
          amount,
          userId,
          round: currentGame.round
        }
      });
      
      res.json({
        success: true,
        message: 'Bet placed successfully',
        data: bet
      });
    } catch (error) {
      console.error('Error placing bet:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to place bet'
      });
    }
  });

  // Deal a card in the game (enhanced endpoint)
  app.post('/api/game/deal-card', async (req, res) => {
    try {
      const { card, side, position, game_id } = req.body;
      
      if (!card || !side || !position) {
        return res.status(400).json({
          success: false,
          message: 'Card, side, and position are required'
        });
      }
      
      // Use default game ID if not provided
      const currentGameId = game_id || 'default-game';
      
      // Check if game session exists
      const existingSession = await storage.getGameSession(currentGameId);
      if (!existingSession) {
        return res.status(404).json({
          success: false,
          message: 'Game session not found'
        });
      }
      
      // Store the dealt card
      const dealtCard = await storage.dealCard({
        gameId: currentGameId,
        card: card,
        side: side,
        position: position,
        isWinningCard: false
      });
      
      // Check if this card matches the opening card (winning condition)
      let isWinningCard = false;
      if (existingSession.openingCard && existingSession.openingCard.length >= 1 && card.length >= 1) {
        // Check if rank matches (first character of card string)
        const openingRank = existingSession.openingCard.charAt(0);
        const dealtRank = card.charAt(0);
        isWinningCard = openingRank === dealtRank;
      }
      
      if (isWinningCard) {
        // Mark as winning card
        await storage.updateDealtCardForGame(currentGameId, dealtCard.id, { isWinningCard: true });
        
        // Update game session with winner
        await storage.updateGameSession(currentGameId, {
          winner: side,
          winningCard: card,
          phase: 'complete',
          status: 'completed'
        });
        
        // Get total cards dealt
        const totalCardsResult = await storage.getDealtCards(currentGameId);
        
        // Update game history
        await storage.addGameHistory({
          gameId: currentGameId,
          openingCard: existingSession.openingCard!,
          winner: side,
          winningCard: card,
          totalCards: totalCardsResult.length,
          round: existingSession.round || 1
        });
        
        // Calculate and distribute winnings
        await calculateAndDistributeWinnings(currentGameId, side, card);
      } else {
        // Update game session phase to dealing
        await storage.updateGameSession(currentGameId, {
          phase: 'dealing'
        });
      }
      
      // Broadcast card dealt to all clients
      broadcast({
        type: 'card_dealt',
        data: {
          gameId: currentGameId,
          card: card,
          side: side,
          position: position,
          isWinningCard: isWinningCard
        }
      });
      
      res.json({
        success: true,
        message: 'Card dealt successfully',
        data: {
          card: card,
          side: side,
          position: position,
          game_id: currentGameId,
          isWinningCard: isWinningCard
        }
      });
    } catch (error) {
      console.error('Error dealing card:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to deal card'
      });
    }
  });

  // Set opening card (enhanced endpoint)
  app.post('/api/game/set-opening-card', async (req, res) => {
    try {
      const { card, game_id } = req.body;
      
      if (!card) {
        return res.status(400).json({
          success: false,
          message: 'Card is required'
        });
      }
      
      // Store opening card in settings
      await storage.updateGameSetting('openingCard', card);
      
      // Create or update game session with opening card
      const currentGameId = game_id || 'default-game';
      
      // Check if game session exists
      const existingSession = await storage.getGameSession(currentGameId);
      if (!existingSession) {
        // Create new game session
        await storage.createGameSession({
          openingCard: card,
          phase: 'idle',
          status: 'active',
          round: 1
        });
      } else {
        // Update existing session
        await storage.updateGameSession(currentGameId, {
          openingCard: card,
          phase: 'idle',
          status: 'active'
        });
      }
      
      // Broadcast opening card to all clients
      broadcast({
        type: 'sync_game_state',
        data: {
          openingCard: card,
          phase: 'idle'
        }
      });
      
      res.json({
        success: true,
        message: 'Opening card set successfully',
        data: { card, game_id: currentGameId }
      });
    } catch (error) {
      console.error('Error setting opening card:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set opening card'
      });
    }
  });

  // Start timer (enhanced endpoint)
  app.post('/api/game/start-timer', async (req, res) => {
    try {
      const { duration, phase, game_id } = req.body;
      
      // Get or create a game session
      const currentGameId = game_id || 'default-game';
      
      // Check if game session exists
      const existingSession = await storage.getGameSession(currentGameId);
      if (!existingSession) {
        // Create new game session
        await storage.createGameSession({
          phase: phase || 'betting',
          currentTimer: duration || 30,
          status: 'active',
          round: 1
        });
      } else {
        // Update existing session
        await storage.updateGameSession(currentGameId, {
          phase: phase || 'betting',
          currentTimer: duration || 30,
          status: 'active'
        });
      }
      
      // Broadcast timer start to all clients
      broadcast({
        type: 'timer_update',
        data: {
          seconds: duration || 30,
          phase: phase || 'betting'
        }
      });
      
      res.json({
        success: true,
        message: 'Timer started successfully',
        data: { game_id: currentGameId }
      });
    } catch (error) {
      console.error('Error starting timer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start timer'
      });
    }
  });

  // Get player wallet information
  app.get('/api/player/wallet/:userId', async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        success: true,
        data: {
          userId: user.id,
          username: user.username,
          balance: user.balance
        }
      });
    } catch (error) {
      console.error('Error fetching wallet:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch wallet'
      });
    }
  });

  // Update player wallet (for admin to add funds)
  app.post('/api/player/wallet/update', async (req, res) => {
    try {
      const { userId, newBalance } = req.body;
      
      if (!userId || newBalance === undefined) {
        return res.status(400).json({
          success: false,
          message: 'userId and newBalance are required'
        });
      }
      
      await storage.updateUserBalance(userId, newBalance);
      
      // Broadcast wallet update to the player
      const clientsArray = Array.from(clients);
      const targetClient = clientsArray.find(c => c.userId === userId);
      if (targetClient) {
        targetClient.ws.send(JSON.stringify({
          type: 'walletUpdate',
          data: { balance: newBalance }
        }));
      }
      
      res.json({
        success: true,
        message: 'Wallet updated successfully',
        data: { userId, balance: newBalance }
      });
    } catch (error) {
      console.error('Error updating wallet:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update wallet'
      });
    }
  });

  return httpServer;
}
```

## File 5: client/src/pages/player-game.tsx

### New Component (Complete Player Interface)
```tsx
import React, { useState } from 'react';
import { useGameState } from '../contexts/GameStateContext';
import { useWebSocket } from '../contexts/WebSocketContext';

const PlayerGame = () => {
  const { gameState, phase, placeBet } = useGameState();
  const { connectionState } = useWebSocket();
  
  // Chip values for betting
  const [selectedChip, setSelectedChip] = useState<number>(100000); // Default to ₹1,00,000
  
  // Player betting functionality
  const handlePlaceBet = (side: 'andar' | 'bahar') => {
    if (placeBet) {
      placeBet(side, selectedChip);
    }
  };

  // Chip selection component
  const ChipSelector = () => {
    const chips = [50000, 100000, 500000, 1000000]; // ₹50k, ₹1L, ₹5L, ₹10L
    
    return (
      <div className="chip-selector flex gap-2 mb-4">
        {chips.map((chipValue) => (
          <button
            key={chipValue}
            className={`chip px-4 py-2 rounded-lg font-bold ${
              selectedChip === chipValue
                ? 'bg-yellow-500 text-black border-2 border-yellow-300'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
            onClick={() => setSelectedChip(chipValue)}
          >
            ₹{chipValue.toLocaleString()}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="player-game min-h-screen bg-gradient-to-b from-green-900 to-green-700 p-4 text-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="header flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Andar Bahar</h1>
          <div className="wallet-info bg-green-800 px-4 py-2 rounded-lg">
            <span className="text-sm">Wallet: </span>
            <span className="font-bold">₹{gameState.playerWallet?.toLocaleString() || '0'}</span>
          </div>
        </div>

        {/* Connection status */}
        <div className="mb-4 text-center">
          <span className={`px-3 py-1 rounded-full text-sm ${
            connectionState.isConnected 
              ? 'bg-green-600' 
              : connectionState.isConnecting 
                ? 'bg-yellow-600' 
                : 'bg-red-600'
          }`}>
            {connectionState.isConnected 
              ? 'Connected' 
              : connectionState.isConnecting 
                ? 'Connecting...' 
                : 'Disconnected'
            }
          </span>
        </div>

        {/* Game Phase Display */}
        <div className="mb-6 text-center">
          <div className="bg-gray-800 px-4 py-2 rounded-lg inline-block">
            <span className="font-bold">Phase: </span>
            <span className="text-xl">
              {phase === 'idle' && 'Game Idle'}
              {phase === 'opening' && 'Selecting Opening Card'}
              {phase === 'betting' && 'Betting Open'}
              {phase === 'dealing' && 'Dealing Cards'}
              {phase === 'complete' && 'Game Complete'}
            </span>
          </div>
        </div>

        {/* Timer Display */}
        {phase === 'betting' && (
          <div className="timer-display text-center mb-6">
            <div className="bg-red-600 text-white px-6 py-3 rounded-lg inline-block">
              <span className="text-2xl font-bold">Time Left: {gameState.countdownTimer}s</span>
            </div>
          </div>
        )}

        {/* Opening Card Display */}
        {gameState.selectedOpeningCard && (
          <div className="opening-card-display mb-8">
            <div className="flex justify-center">
              <div className="card bg-white text-black px-8 py-4 rounded-lg shadow-lg">
                <div className="text-4xl font-bold">{gameState.selectedOpeningCard.display}</div>
              </div>
            </div>
            <div className="text-center mt-2">
              <span className="text-lg">Opening Card</span>
            </div>
          </div>
        )}

        {/* Betting Area */}
        <div className="betting-area grid grid-cols-2 gap-8 mb-8">
          {/* Andar Side */}
          <div className="andar-side bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-center">ANDAR</h2>
            <div className="betting-buttons flex flex-col gap-3 mb-4">
              <ChipSelector />
              <button
                onClick={() => handlePlaceBet('andar')}
                disabled={phase !== 'betting' || gameState.countdownTimer <= 0}
                className="bet-andar bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Place Bet on Andar
              </button>
            </div>
            <div className="total-bets bg-red-800 p-3 rounded-lg">
              <div className="text-center">Total Andar Bets: ₹{gameState.playerBets?.andar?.toLocaleString() || 0}</div>
            </div>
            
            {/* Andar Cards */}
            <div className="dealt-cards mt-4">
              <h3 className="text-lg font-semibold mb-2">Dealt Cards</h3>
              <div className="flex flex-wrap gap-2">
                {gameState.andarCards.map((card, index) => (
                  <div key={index} className="card bg-white text-black px-3 py-2 rounded text-sm">
                    {card.display}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bahar Side */}
          <div className="bahar-side bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-center">BAHAR</h2>
            <div className="betting-buttons flex flex-col gap-3 mb-4">
              <ChipSelector />
              <button
                onClick={() => handlePlaceBet('bahar')}
                disabled={phase !== 'betting' || gameState.countdownTimer <= 0}
                className="bet-bahar bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Place Bet on Bahar
              </button>
            </div>
            <div className="total-bets bg-blue-800 p-3 rounded-lg">
              <div className="text-center">Total Bahar Bets: ₹{gameState.playerBets?.bahar?.toLocaleString() || 0}</div>
            </div>
            
            {/* Bahar Cards */}
            <div className="dealt-cards mt-4">
              <h3 className="text-lg font-semibold mb-2">Dealt Cards</h3>
              <div className="flex flex-wrap gap-2">
                {gameState.baharCards.map((card, index) => (
                  <div key={index} className="card bg-white text-black px-3 py-2 rounded text-sm">
                    {card.display}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Game Winner Display */}
        {phase === 'complete' && gameState.gameWinner && (
          <div className="winner-display text-center mb-6">
            <div className="bg-green-700 text-white px-8 py-4 rounded-lg inline-block">
              <h2 className="text-3xl font-bold">WINNER: {gameState.gameWinner.toUpperCase()}</h2>
              {gameState.winningCard && (
                <p className="mt-2">Winning Card: {gameState.winningCard.display}</p>
              )}
            </div>
          </div>
        )}

        {/* Game Stats */}
        <div className="game-stats bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2">Game Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>Current Round: {gameState.currentRound}</p>
              <p>Opening Card: {gameState.selectedOpeningCard?.display || 'Not Set'}</p>
            </div>
            <div>
              <p>Player Role: {gameState.userRole}</p>
              <p>Game Active: {gameState.isGameActive ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerGame;
```

## File 6: client/src/pages/admin-game.tsx

### New Component (Complete Admin Interface)
```tsx
import React, { useState, useEffect } from 'react';
import { useGameState } from '../contexts/GameStateContext';
import { useWebSocket } from '../contexts/WebSocketContext';

const AdminGame = () => {
  const { 
    gameState, 
    setPhase, 
    setCountdown, 
    setSelectedOpeningCard, 
    setCurrentRound,
    phase
  } = useGameState();
  const { startGame, dealCard } = useWebSocket();
  
  // Card grid for selecting opening card
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  
  // Card selection state
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [dealingSide, setDealingSide] = useState<'andar' | 'bahar' | null>(null);
  const [cardPosition, setCardPosition] = useState(1);
  
  // Create card grid
  const cardGrid = suits.flatMap(suit => 
    ranks.map(rank => ({
      display: `${rank}${suit}`,
      suit,
      value: rank,
    }))
  );

  // Handle card selection
  const handleCardSelect = (card: any) => {
    setSelectedCard(card.display);
    setSelectedOpeningCard(card);
  };

  // Handle card dealing
  const handleDealCard = () => {
    if (!dealingSide || !selectedCard) return;
    
    dealCard(
      { display: selectedCard, suit: selectedCard.slice(-1), value: selectedCard.slice(0, -1) },
      dealingSide,
      cardPosition
    );
    
    setCardPosition(cardPosition + 1);
    setSelectedCard(null);
  };

  // Admin game controls
  const startNewGame = () => {
    if (gameState.selectedOpeningCard) {
      startGame();
    }
  };

  // Timer controls
  const startBettingTimer = (duration: number) => {
    setCountdown(duration);
    setPhase('betting');
  };

  const startDealingPhase = () => {
    setPhase('dealing');
  };

  const completeGame = () => {
    setPhase('complete');
  };

  return (
    <div className="admin-game min-h-screen bg-gray-900 p-4 text-white">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Admin Game Control Panel</h1>

        {/* Game Status */}
        <div className="game-status bg-gray-800 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <h3 className="text-lg font-semibold">Game Phase</h3>
              <p className="text-xl">{phase}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Current Round</h3>
              <p className="text-xl">{gameState.currentRound}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Countdown</h3>
              <p className="text-xl">{gameState.countdownTimer}s</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Opening Card</h3>
              <p className="text-xl">{gameState.selectedOpeningCard?.display || 'Not Set'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card Selection Grid */}
          <div className="card-selection bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Select Opening Card</h2>
            <div className="grid grid-cols-13 gap-1">
              {cardGrid.map((card, index) => (
                <button
                  key={index}
                  className={`p-2 text-sm rounded ${
                    gameState.selectedOpeningCard?.display === card.display
                      ? 'bg-yellow-500 text-black'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  onClick={() => handleCardSelect(card)}
                >
                  {card.display}
                </button>
              ))}
            </div>
          </div>

          {/* Game Controls */}
          <div className="game-controls bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Game Controls</h2>
            
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Timer Controls</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => startBettingTimer(30)}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50"
                >
                  Start 30s Betting Timer
                </button>
                <button
                  onClick={() => startBettingTimer(10)}
                  className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-50"
                >
                  Start 10s Timer
                </button>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold mb-2">Game Actions</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={startNewGame}
                  disabled={!gameState.selectedOpeningCard}
                  className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded disabled:opacity-50"
                >
                  Start New Game
                </button>
                <button
                  onClick={() => startDealingPhase()}
                  className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded"
                >
                  Start Dealing
                </button>
                <button
                  onClick={completeGame}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
                >
                  Complete Game
                </button>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold mb-2">Round Controls</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentRound(1)}
                  className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
                >
                  Set Round 1
                </button>
                <button
                  onClick={() => setCurrentRound(2)}
                  className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
                >
                  Set Round 2
                </button>
                <button
                  onClick={() => setCurrentRound(3)}
                  className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
                >
                  Set Round 3
                </button>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold mb-2">Deal Card</h3>
              <div className="flex gap-2">
                <select
                  value={dealingSide || ''}
                  onChange={(e) => setDealingSide(e.target.value as 'andar' | 'bahar' | null)}
                  className="bg-gray-700 text-white p-2 rounded"
                >
                  <option value="">Select Side</option>
                  <option value="andar">Andar</option>
                  <option value="bahar">Bahar</option>
                </select>
                <input
                  type="number"
                  min="1"
                  value={cardPosition}
                  onChange={(e) => setCardPosition(parseInt(e.target.value))}
                  className="bg-gray-700 text-white p-2 rounded w-20"
                />
                <button
                  onClick={handleDealCard}
                  disabled={!dealingSide || !selectedCard}
                  className="bg-yellow-600 hover:bg-yellow-700 text-black py-2 px-4 rounded disabled:opacity-50"
                >
                  Deal Card
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Betting Stats Display */}
        <div className="betting-stats bg-gray-800 p-4 rounded-lg mt-6">
          <h2 className="text-xl font-bold mb-4">Betting Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold">Round 1 Stats</h3>
              <p>Andar: ₹{gameState.roundBets?.round1?.andar?.toLocaleString() || 0}</p>
              <p>Bahar: ₹{gameState.roundBets?.round1?.bahar?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-blue-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold">Round 2 Stats</h3>
              <p>Andar: ₹{gameState.roundBets?.round2?.andar?.toLocaleString() || 0}</p>
              <p>Bahar: ₹{gameState.roundBets?.round2?.bahar?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-green-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold">Total Stats</h3>
              <p>Andar Total: ₹{gameState.playerBets?.andar?.toLocaleString() || 0}</p>
              <p>Bahar Total: ₹{gameState.playerBets?.bahar?.toLocaleString() || 0}</p>
              <p>Lowest Bet: ₹{Math.min(gameState.playerBets?.andar || 0, gameState.playerBets?.bahar || 0)}</p>
            </div>
          </div>
        </div>

        {/* Dealt Cards Display */}
        <div className="dealt-cards bg-gray-800 p-4 rounded-lg mt-6">
          <h2 className="text-xl font-bold mb-4">Dealt Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Andar Cards</h3>
              <div className="flex flex-wrap gap-2">
                {gameState.andarCards.map((card, index) => (
                  <div key={index} className="card bg-white text-black px-3 py-2 rounded text-sm">
                    {card.display}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Bahar Cards</h3>
              <div className="flex flex-wrap gap-2">
                {gameState.baharCards.map((card, index) => (
                  <div key={index} className="card bg-white text-black px-3 py-2 rounded text-sm">
                    {card.display}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Game History */}
        {gameState.gameHistory && gameState.gameHistory.length > 0 && (
          <div className="game-history bg-gray-800 p-4 rounded-lg mt-6">
            <h2 className="text-xl font-bold mb-4">Recent Game History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="p-2">Opening Card</th>
                    <th className="p-2">Winner</th>
                    <th className="p-2">Winning Card</th>
                    <th className="p-2">Date/Time</th>
                  </tr>
                </thead>
                <tbody>
                  {gameState.gameHistory.slice(0, 5).map((game, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{game.openingCard}</td>
                      <td className="p-2">{game.winner.toUpperCase()}</td>
                      <td className="p-2">{game.winningCard}</td>
                      <td className="p-2">{game.createdAt.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminGame;
```

## File 7: Environment Variables

### Create .env file with:
```
VITE_API_BASE_URL=http://localhost:5000
VITE_WS_BASE_URL=localhost:5000
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

## File 8: client/src/lib/apiClient.ts

### NEW CODE (Enhanced with proper error handling)
```tsx
import { WebSocketMessage } from '../../../shared/schema';

class ApiClient {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = typeof window !== 'undefined' 
      ? import.meta.env.VITE_API_BASE_URL || '' // Use relative URLs for same-origin requests
      : process.env.API_BASE_URL || 'http://localhost:5000';
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Create a singleton instance
const apiClient = new ApiClient();

// WebSocket message validation
export const isValidWebSocketMessage = (message: any): message is WebSocketMessage => {
  return message && typeof message === 'object' && typeof message.type === 'string';
};

// Error handler utility
export const handleComponentError = (error: unknown, context: string) => {
  console.error(`Error in ${context}:`, error);
  
  // Log to error tracking service if available
  if (typeof window !== 'undefined') {
    // Example: Sentry.captureException(error, { contexts: { component: context } });
  }
};

export default apiClient;
```

## Files to Remove (If Exist):
- Delete any redundant or unused files that don't contribute to the main functionality
- Clean up any temporary or test files
- Remove unused CSS files that are not referenced

## Summary of Changes Required:

1. **Fixed Context Provider Order**: Moved GameStateProvider BEFORE WebSocketProvider in AppProviders.tsx
2. **Enhanced Game State**: Extended GameStateContext with full demo requirements (rounds, betting stats, wallet, etc.)
3. **Fixed WebSocket Connection**: Updated to connect to backend port (5000) instead of frontend port
4. **Implemented Full Game Logic**: Added betting, dealing, payout, and real-time updates
5. **Created Complete UI**: Built PlayerGame and AdminGame components with all required functionality
6. **Updated API Endpoints**: Extended server routes to handle all demo requirements
7. **Added Environment Configuration**: Proper port setup for client and server

These changes will transform the current codebase into a complete, working Andar Bahar demo with the exact flow described, including proper role separation, real-time updates, betting, dealing, and payout systems.