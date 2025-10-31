/**
 * Stream WebSocket Handler
 * 
 * Manages WebSocket connections for real-time streaming updates
 * Integrates with both the stream system and game state
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import WebSocketManager, { ConnectionStatus } from '../lib/WebSocketManager';

interface StreamWebSocketHandlerProps {
  onStreamStatusChange?: (status: string) => void;
  onViewerCountChange?: (count: number) => void;
  onGameEvent?: (event: any) => void;
  token?: string;
}

export const useStreamWebSocket = ({
  onStreamStatusChange,
  onViewerCountChange,
  onGameEvent,
  token
}: StreamWebSocketHandlerProps) => {
  const streamWebSocketManagerRef = useRef<WebSocketManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const getStreamWebSocketUrl = useCallback((): string => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Note: This assumes the streaming WebSocket is on port 5000, as per original code.
    // If it should be on the same host as the main game WebSocket, adjust accordingly.
    return `${wsProtocol}//${window.location.hostname}:5000/ws/stream`;
  }, []);

  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'stream_status':
        onStreamStatusChange?.(message.data.status);
        break;
      case 'viewer_count_update':
        onViewerCountChange?.(message.data.count);
        break;
      case 'game_event':
        onGameEvent?.(message.data);
        break;
      case 'webrtc_offer':
      case 'webrtc_answer':
      case 'webrtc_ice_candidate':
        // These are handled by the WebRTC client
        break;
      default:
        console.log('Received unknown WebSocket message:', message);
    }
  }, [onStreamStatusChange, onViewerCountChange, onGameEvent]);

  const initStreamWebSocketManager = useCallback(() => {
    if (streamWebSocketManagerRef.current) return;

    const wsUrl = getStreamWebSocketUrl();
    streamWebSocketManagerRef.current = WebSocketManager.getInstance({
      url: wsUrl,
      reconnectInterval: 3000, // Use original reconnect interval
      maxReconnectAttempts: 10, // Default max attempts
      tokenProvider: async () => token || null, // Provide token if available
      onMessage: (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse Stream WebSocket message:', error);
        }
      },
      onOpen: () => {
        console.log('✅ Stream WebSocket connected');
        setIsConnected(true);
      },
      onClose: () => {
        console.log('⚠️ Stream WebSocket disconnected');
        setIsConnected(false);
      },
      onError: (event) => {
        console.error('❌ Stream WebSocket error:', event);
        setIsConnected(false);
      },
    });

    streamWebSocketManagerRef.current.on('statusChange', (status: ConnectionStatus) => {
      setIsConnected(status === ConnectionStatus.CONNECTED);
    });
  }, [getStreamWebSocketUrl, handleWebSocketMessage, token]);

  const connect = useCallback(() => {
    initStreamWebSocketManager();
    streamWebSocketManagerRef.current?.connect();
  }, [initStreamWebSocketManager]);

  const disconnect = useCallback(() => {
    streamWebSocketManagerRef.current?.disconnect();
  }, []);

  const sendStreamCommand = useCallback((command: string, data?: any) => {
    if (streamWebSocketManagerRef.current) {
      streamWebSocketManagerRef.current.send({ type: command, data });
    } else {
      console.warn('Stream WebSocket not initialized or connected, cannot send command:', command);
    }
  }, []);

  useEffect(() => {
    initStreamWebSocketManager();
    if (token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [token, connect, disconnect, initStreamWebSocketManager]);

  return {
    connect,
    disconnect,
    sendStreamCommand,
    isConnected
  };
};