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
import { useLocation } from 'wouter';
import { User } from 'lucide-react';
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
  const [, setLocation] = useLocation();
  
  // Use props gameState if provided, otherwise use context
  const gameState = propsGameState || contextGameState;

  // Ensure balance is always a valid number and visible
  const displayBalance = typeof userBalance === 'number' ? userBalance : 0;

  const handleProfileClick = () => {
    setLocation('/profile');
  };

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

          {/* Right Side - Profile, Wallet */}
          <div className="flex items-center gap-2">
            {/* Profile Button */}
            <button
              onClick={handleProfileClick}
              className="flex items-center justify-center w-9 h-9 bg-gray-800/80 border-2 border-gray-600 rounded-full hover:bg-gray-700/80 hover:border-gray-500 transition-all active:scale-95"
              aria-label="Profile"
            >
              <User className="w-5 h-5 text-gray-300" />
            </button>

            {/* Wallet Chip - Always Visible Balance */}
            <button
              onClick={onWalletClick}
              className="flex items-center space-x-2 bg-gradient-to-r from-yellow-500/30 to-yellow-600/30 border-2 border-yellow-400 rounded-full px-4 py-2 hover:from-yellow-500/40 hover:to-yellow-600/40 hover:border-yellow-300 transition-all active:scale-95 shadow-lg shadow-yellow-500/20"
            >
              {/* Wallet Icon */}
              <svg className="w-5 h-5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
              </svg>
              <span className="text-yellow-300 font-bold text-base tracking-wide">
                ₹{displayBalance.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileTopBar;
