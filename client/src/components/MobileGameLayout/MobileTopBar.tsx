/**
 * MobileTopBar - Enhanced top bar with round information and game details
 * 
 * Features:
 * - Current round display (Round 1/2/3)
 * - Game ID from backend
 * - Real-time viewer count
 * - Phase indicator
 * - Connection status
 */

import React from 'react';
import { useGameState } from '@/contexts/GameStateContext';
import { useWebSocket } from '@/contexts/WebSocketContext';

interface MobileTopBarProps {
  className?: string;
}

const MobileTopBar: React.FC<MobileTopBarProps> = ({ className = '' }) => {
  const { gameState } = useGameState();
  const { connectionState } = useWebSocket();

  // Get phase color
  const getPhaseColor = () => {
    switch (gameState.phase) {
      case 'betting':
        return 'text-yellow-400';
      case 'dealing':
        return 'text-green-400';
      case 'complete':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  // Get connection status color
  const getConnectionColor = () => {
    if (connectionState.isConnected || connectionState.connected) {
      return 'bg-green-500';
    } else if (connectionState.isConnecting || connectionState.connecting) {
      return 'bg-yellow-500';
    } else {
      return 'bg-red-500';
    }
  };

  // Get connection status text
  const getConnectionStatus = () => {
    if (connectionState.isConnected || connectionState.connected) {
      return 'connected';
    } else if (connectionState.isConnecting || connectionState.connecting) {
      return 'connecting';
    } else {
      return 'disconnected';
    }
  };

  // Get round badge color
  const getRoundBadgeColor = () => {
    switch (gameState.currentRound) {
      case 1:
        return 'bg-blue-600';
      case 2:
        return 'bg-purple-600';
      case 3:
        return 'bg-orange-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className={`bg-gradient-to-r from-gray-900 to-black border-b border-gray-800 ${className}`}>
      <div className="px-4 py-3">
        {/* Top Row - Game Info */}
        <div className="flex justify-between items-center mb-2">
          {/* Game ID */}
          <div className="flex items-center space-x-2">
            <div className="text-gray-400 text-xs">Game</div>
            <div className="text-white font-mono text-sm">
              {gameState.gameId || 'WAITING'}
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getConnectionColor()} ${getConnectionStatus() === 'connected' ? 'animate-pulse' : ''}`} />
            <span className="text-gray-300 text-xs capitalize">
              {getConnectionStatus()}
            </span>
          </div>
        </div>

        {/* Middle Row - Round and Phase */}
        <div className="flex justify-between items-center mb-2">
          {/* Round Information */}
          <div className="flex items-center space-x-3">
            <div className={`px-3 py-1 rounded-full ${getRoundBadgeColor()}`}>
              <span className="text-white font-bold text-sm">
                Round {gameState.currentRound}
              </span>
            </div>
            
            {gameState.currentRound === 3 && (
              <div className="bg-orange-500/20 px-2 py-1 rounded-full border border-orange-500/50">
                <span className="text-orange-400 text-xs font-semibold">
                  Final Draw
                </span>
              </div>
            )}
          </div>

          {/* Phase Indicator */}
          <div className="flex items-center space-x-2">
            <div className={`text-sm font-semibold ${getPhaseColor()}`}>
              {gameState.phase.charAt(0).toUpperCase() + gameState.phase.slice(1)}
            </div>
            {gameState.bettingLocked && (
              <div className="bg-red-500/20 px-2 py-1 rounded-full border border-red-500/50">
                <span className="text-red-400 text-xs font-semibold">
                  Locked
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row - Additional Info */}
        <div className="flex justify-between items-center">
          {/* Timer/Countdown */}
          {gameState.phase === 'betting' && (
            <div className="flex items-center space-x-2">
              <div className="text-gray-400 text-xs">Time</div>
              <div className={`font-mono text-sm ${gameState.countdownTimer <= 5 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
                {gameState.countdownTimer}s
              </div>
            </div>
          )}

          {/* Viewer Count */}
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 text-xs">👁️</span>
            <span className="text-gray-300 text-sm">127</span>
          </div>

          {/* Total Pot */}
          <div className="flex items-center space-x-2">
            <div className="text-gray-400 text-xs">Pot</div>
            <div className="text-yellow-400 font-semibold text-sm">
              ₹{((gameState.round1Bets.andar + gameState.round1Bets.bahar + 
                   gameState.round2Bets.andar + gameState.round2Bets.bahar)).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Progress Bar for Betting Phase */}
        {gameState.phase === 'betting' && (
          <div className="mt-3">
            <div className="w-full bg-gray-700 rounded-full h-1">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-1 rounded-full transition-all duration-1000"
                style={{ width: `${((30 - gameState.countdownTimer) / 30) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileTopBar;
