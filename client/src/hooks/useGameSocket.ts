/**
 * CUSTOM HOOK: useGameSocket
 * 
 * Extracts WebSocket logic from player-game.tsx
 * Handles all real-time game updates via WebSocket
 */

import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './useGameQuery';

interface GameSocketMessage {
  type: string;
  data?: any;
}

export function useGameSocket(gameId: string | null) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!gameId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ Game WebSocket connected');
      
      // Authenticate
      const token = localStorage.getItem('token');
      if (token) {
        ws.send(JSON.stringify({
          type: 'auth',
          token
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message: GameSocketMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      // Attempt reconnect after 3 seconds
      setTimeout(connect, 3000);
    };

    return () => {
      ws.close();
    };
  }, [gameId]);

  // Handle incoming messages
  const handleMessage = useCallback((message: GameSocketMessage) => {
    switch (message.type) {
      case 'game:update':
        // Invalidate game query to trigger refetch
        queryClient.invalidateQueries({ queryKey: queryKeys.currentGame });
        break;

      case 'game:phase-change':
        console.log('📢 Phase changed:', message.data.phase);
        queryClient.invalidateQueries({ queryKey: queryKeys.currentGame });
        break;

      case 'game:card-dealt':
        console.log('🃏 Card dealt:', message.data);
        queryClient.invalidateQueries({ queryKey: queryKeys.currentGame });
        break;

      case 'game:round-complete':
        console.log('🏁 Round complete:', message.data);
        queryClient.invalidateQueries({ queryKey: queryKeys.currentGame });
        queryClient.invalidateQueries({ queryKey: queryKeys.userBalance });
        break;

      case 'balance:update':
        // Update user balance
        queryClient.setQueryData(queryKeys.userBalance, message.data.balance);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }, [queryClient]);

  // Send message
  const sendMessage = useCallback((message: GameSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return {
    sendMessage,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
