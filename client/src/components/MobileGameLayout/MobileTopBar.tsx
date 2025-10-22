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

interface MobileTopBarProps {
  className?: string;
  onWalletClick?: () => void;
  userBalance?: number;
  gameState?: any;
}

const MobileTopBar: React.FC<MobileTopBarProps> = ({ 
  className = '', 
  onWalletClick,
  userBalance = 0,
  gameState: propsGameState
}) => {
  const { gameState: contextGameState } = useGameState();
  
  // Use props gameState if provided, otherwise use context
  const gameState = propsGameState || contextGameState;


  return (
    <div className={`bg-gradient-to-r from-gray-900 to-black border-b border-gray-800 ${className}`}>
      <div className="px-4 py-3">
        {/* Main Top Bar Layout */}
        <div className="flex justify-between items-center">
          {/* Left Side - Game ID and Title */}
          <div className="flex flex-col">
            {/* Game ID */}
            <div className="text-white text-xs font-mono mb-1">
              {gameState.gameId || '1308544430'}
            </div>
            {/* Game Title */}
            <div className="text-white text-sm font-bold">
              Andar Bahar Live Game
            </div>
          </div>

          {/* Right Side - Wallet and Viewers */}
          <div className="flex flex-col items-end space-y-2">
            {/* Wallet Chip */}
            <button
              onClick={onWalletClick}
              className="flex items-center space-x-2 bg-yellow-500/20 border-2 border-yellow-500 rounded-full px-3 py-1 hover:bg-yellow-500/30 transition-colors"
            >
              {/* Wallet Icon */}
              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
              </svg>
              <span className="text-yellow-400 font-bold text-sm">
                ₹{userBalance.toLocaleString('en-IN')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileTopBar;
