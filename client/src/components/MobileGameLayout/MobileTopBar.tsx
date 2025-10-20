import React from 'react';
import type { GameState } from '../GameLogic/GameLogic';

interface MobileTopBarProps {
  onWalletClick?: () => void;
  userBalance?: number;
  gameState: GameState;
}

const MobileTopBar: React.FC<MobileTopBarProps> = ({ onWalletClick, userBalance = 0 }) => {

  return (
    <div className="bg-black/90 backdrop-blur-sm px-4 py-2 flex justify-between items-center border-b border-yellow-500/20">
      {/* Left side - Game ID and Title */}
      <div className="flex-1">
        <div className="text-white text-xs font-medium">
          Game ID: 1308544430
        </div>
        <div className="text-yellow-400 text-xs font-semibold">
          Andar Bahar Live Game
        </div>
      </div>

      {/* Right side - Wallet and Viewers */}
      <div className="flex items-center gap-3">
        {/* Viewers Count */}
        <div className="bg-gray-800/80 rounded-full px-2 py-1 flex items-center gap-1">
          <svg 
            className="w-3 h-3 text-gray-400" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
          <span className="text-gray-300 text-xs font-medium">
            {Math.floor(Math.random() * 500) + 100}
          </span>
        </div>

        {/* Wallet Chip */}
        <button
          onClick={onWalletClick}
          className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full px-3 py-1.5 flex items-center gap-1.5 border-2 border-yellow-400/50 shadow-lg hover:shadow-yellow-500/25 transition-all duration-200 active:scale-95"
        >
          <svg 
            className="w-4 h-4 text-yellow-900" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
            <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
          </svg>
          <span className="text-yellow-900 text-sm font-bold">
            ₹{userBalance.toLocaleString('en-IN')}
          </span>
        </button>
      </div>
    </div>
  );
};

export default MobileTopBar;
