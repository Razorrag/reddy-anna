/**
 * Game Stream Integration Component
 * 
 * Handles the integration between the Andar Bahar game and the streaming system
 * Ensures that streaming status is synchronized with game phases and events
 */

import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { GamePhase } from '../types/game';
import { Wifi, Gamepad2, Zap, Settings } from 'lucide-react';
import { useStreamWebSocket } from '../hooks/useStreamWebSocket';

interface StreamIntegrationProps {
  // Game state props would be passed from parent component
  gamePhase?: GamePhase;
  currentRound?: number;
  timer?: number;
}

const GameStreamIntegration: React.FC<StreamIntegrationProps> = ({ 
  gamePhase = 'idle', 
  currentRound = 1, 
  timer = 0 
}) => {
  const { showNotification } = useNotification();
  const [isSyncEnabled, setIsSyncEnabled] = useState(true);
  const [streamStatus, setStreamStatus] = useState<'online' | 'offline' | 'connecting'>('offline');
  const [gameStatus, setGameStatus] = useState<GamePhase>('idle');
  const [viewerCount, setViewerCount] = useState(0);
  const [autoSyncSettings, setAutoSyncSettings] = useState({
    syncBettingPhases: true,
    syncGameStart: true,
    showCountdown: true,
    autoPauseOnIdle: true
  });

  // Get token from AuthContext
  const { user, isAuthenticated, token } = useAuth();

  // Initialize WebSocket connection only if we have a token
  const { isConnected } = useStreamWebSocket({
    onStreamStatusChange: (status) => {
      setStreamStatus(status as any);
      showNotification(`📡 Stream status: ${status}`, 'info');
    },
    onViewerCountChange: (count) => {
      setViewerCount(count);
    },
    onGameEvent: (event) => {
      // Handle game events that might affect stream
      console.log('Game event received:', event);
    },
    token: token || undefined
  });

  // Load initial state from API
  useEffect(() => {
    loadStreamGameState();
  }, []);

  // Sync game state changes with streaming
  useEffect(() => {
    if (!isSyncEnabled) return;
    
    handleGamePhaseChange(gamePhase);
    setGameStatus(gamePhase);
  }, [gamePhase, isSyncEnabled]);

  const loadStreamGameState = async () => {
    try {
      const res = await fetch('/api/stream/config', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStreamStatus(data.data.streamStatus as any);
          setViewerCount(data.data.viewerCount || 0);
        }
      }
    } catch (error) {
      console.error('Failed to load stream game state:', error);
    }
  };

  const handleGamePhaseChange = (newPhase: GamePhase) => {
    if (!isSyncEnabled) return;
    
    // Update stream status based on game state
    switch (newPhase) {
      case 'betting':
        // Optionally update stream title with current round info
        updateStreamTitle(`Andar Bahar - Round ${currentRound} Betting`);
        break;
      case 'dealing':
        // Optionally update stream title with current round info
        updateStreamTitle(`Andar Bahar - Round ${currentRound} Dealing Cards`);
        break;
      case 'complete':
        updateStreamTitle(`Andar Bahar - Round ${currentRound} Complete`);
        break;
      case 'idle':
        // Optionally auto-pause stream if configured
        if (autoSyncSettings.autoPauseOnIdle) {
          // This would send a WebSocket message to pause stream during idle
          handleAutoPause();
        }
        break;
    }
  };

  const updateStreamTitle = async (title: string) => {
    try {
      const res = await fetch('/api/stream/title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ title })
      });

      if (!res.ok) {
        throw new Error('Failed to update stream title');
      }
    } catch (error) {
      console.error('Failed to update stream title:', error);
    }
  };

  const handleAutoPause = () => {
    // In a real implementation, this would send a WebSocket message
    // to pause the stream during idle periods
    console.log('Auto-pause triggered based on game idle state');
  };

  const toggleSync = () => {
    const newValue = !isSyncEnabled;
    setIsSyncEnabled(newValue);
    showNotification(`🎮 Game-Stream sync ${newValue ? 'enabled' : 'disabled'}`, 'info');
  };

  const toggleAutoSetting = (setting: keyof typeof autoSyncSettings) => {
    setAutoSyncSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const sendStreamCommand = async (command: string) => {
    try {
      // This would typically send a WebSocket message to the server
      // For now, we'll make an API call
      const res = await fetch('/api/stream/webrtc/' + command, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({})
      });

      if (!res.ok) {
        throw new Error(`Failed to ${command} stream`);
      }

      showNotification(`✅ Stream ${command} command sent`, 'success');
    } catch (error) {
      showNotification(`❌ Failed to ${command} stream`, 'error');
    }
  };

  const startScreenShare = async () => {
    try {
      // Send WebSocket message to start screen sharing
      const ws = (window as any).gameWebSocket;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'screen_share_start',
          data: {
            adminId: user?.id || user?.phone,
            timestamp: Date.now(),
            gameId: 'default-game'
          }
        }));
        showNotification('🖥️ Screen sharing started for players', 'success');
      } else {
        showNotification('❌ WebSocket not connected. Cannot start screen sharing.', 'error');
      }
    } catch (error) {
      showNotification('❌ Failed to start screen sharing', 'error');
      console.error('Screen share error:', error);
    }
  };

  const stopScreenShare = async () => {
    try {
      // Send WebSocket message to stop screen sharing
      const ws = (window as any).gameWebSocket;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'screen_share_stop',
          data: {
            adminId: user?.id || user?.phone,
            timestamp: Date.now(),
            gameId: 'default-game'
          }
        }));
        showNotification('🖥️ Screen sharing stopped for players', 'info');
      } else {
        showNotification('❌ WebSocket not connected. Cannot stop screen sharing.', 'error');
      }
    } catch (error) {
      showNotification('❌ Failed to stop screen sharing', 'error');
      console.error('Screen share stop error:', error);
    }
  };

  const getStreamStatusColor = () => {
    switch (streamStatus) {
      case 'online': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'offline': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStreamStatusIcon = () => {
    switch (streamStatus) {
      case 'online': return '🟢';
      case 'connecting': return '🟡';
      case 'offline': return '🔴';
      default: return '⚫';
    }
  };

  return (
    <div className="bg-gray-800/90 rounded-lg border-2 border-gold/30 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gold flex items-center gap-2">
            <Zap className="w-5 h-5" /> Game-Stream Integration
          </h2>
          <p className="text-sm text-gray-400 mt-1">Sync Andar Bahar game with streaming</p>
        </div>
        <div className={`px-4 py-2 rounded-lg border font-semibold text-sm ${getStreamStatusColor()}`}>
          {getStreamStatusIcon()} {streamStatus.charAt(0).toUpperCase() + streamStatus.slice(1)}
          {viewerCount > 0 && ` • ${viewerCount} viewers`}
          {isConnected ? (
            <span className="ml-2 text-green-400">• WS: Connected</span>
          ) : (
            <span className="ml-2 text-red-400">• WS: Disconnected</span>
          )}
        </div>
      </div>

      {/* Sync Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
            <Wifi className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Game-Stream Sync</h3>
            <p className="text-sm text-gray-400">Automatically sync game phases with stream</p>
          </div>
        </div>
        <button
          onClick={toggleSync}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            isSyncEnabled ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isSyncEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Current Game State */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-gold mb-4 flex items-center gap-2">
          <Gamepad2 className="w-5 h-5" /> Current Game State
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-600">
            <div className="text-xs text-gray-400">Phase</div>
            <div className="text-lg font-bold text-white capitalize">{gamePhase}</div>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-600">
            <div className="text-xs text-gray-400">Round</div>
            <div className="text-lg font-bold text-white">{currentRound}</div>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-600">
            <div className="text-xs text-gray-400">Timer</div>
            <div className="text-lg font-bold text-white">{timer}s</div>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-600">
            <div className="text-xs text-gray-400">Viewers</div>
            <div className="text-lg font-bold text-white">{viewerCount}</div>
          </div>
        </div>
      </div>

      {/* Auto-sync Settings */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 space-y-4">
        <h3 className="text-lg font-semibold text-gold flex items-center gap-2">
          <Settings className="w-5 h-5" /> Auto-Sync Settings
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-600">
            <div>
              <div className="font-medium text-white">Sync Betting Phases</div>
              <div className="text-sm text-gray-400">Update stream title during betting</div>
            </div>
            <button
              onClick={() => toggleAutoSetting('syncBettingPhases')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                autoSyncSettings.syncBettingPhases ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoSyncSettings.syncBettingPhases ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-600">
            <div>
              <div className="font-medium text-white">Sync Game Start</div>
              <div className="text-sm text-gray-400">Update stream when new game starts</div>
            </div>
            <button
              onClick={() => toggleAutoSetting('syncGameStart')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                autoSyncSettings.syncGameStart ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoSyncSettings.syncGameStart ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-600">
            <div>
              <div className="font-medium text-white">Auto-Pause on Idle</div>
              <div className="text-sm text-gray-400">Pause stream when game is idle</div>
            </div>
            <button
              onClick={() => toggleAutoSetting('autoPauseOnIdle')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                autoSyncSettings.autoPauseOnIdle ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoSyncSettings.autoPauseOnIdle ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Stream Controls */}
      {isSyncEnabled && (
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 space-y-3">
          <h3 className="text-lg font-semibold text-gold">Stream Controls</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => sendStreamCommand('start')}
              disabled={streamStatus === 'online'}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 disabled:from-gray-600 text-white rounded-lg font-semibold"
            >
              Start Stream
            </button>
            <button
              onClick={() => sendStreamCommand('stop')}
              disabled={streamStatus !== 'online'}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 disabled:from-gray-600 text-white rounded-lg font-semibold"
            >
              Stop Stream
            </button>
          </div>
          
          {/* Screen Sharing Controls */}
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-600">
            <button
              onClick={startScreenShare}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              🖥️ Start Screen Share
            </button>
            <button
              onClick={stopScreenShare}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              🛑 Stop Screen Share
            </button>
          </div>
        </div>
      )}

      {/* Integration Status */}
      <div className="bg-blue-900/30 rounded-lg border border-blue-600/50 p-4">
        <h3 className="text-md font-semibold text-blue-400 mb-2">Integration Status</h3>
        <div className="text-sm text-blue-200">
          {isSyncEnabled 
            ? "✅ Game-stream integration is active. Stream status will update automatically based on game phases." 
            : "❌ Game-stream integration is disabled. Stream and game operate independently."}
          <div className="mt-1">
            WebSocket: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameStreamIntegration;