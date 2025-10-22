/**
 * ControlsRow - History, Undo, Select Chip, Rebet controls
 * 
 * Four main control buttons arranged horizontally with the
 * select chip button being more prominent in the center.
 */

import React from 'react';

interface ControlsRowProps {
  selectedBetAmount: number;
  isPlacingBet: boolean;
  onUndoBet: () => void;
  onRebet: () => void;
  onHistoryClick: () => void;
  onShowChipSelector: () => void;
  className?: string;
}

const ControlsRow: React.FC<ControlsRowProps> = ({
  selectedBetAmount,
  isPlacingBet,
  onUndoBet,
  onRebet,
  onHistoryClick,
  onShowChipSelector,
  className = ''
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      {/* History Button */}
      <button
        onClick={onHistoryClick}
        className="flex-1 h-11 bg-gray-800 rounded-lg flex flex-col items-center justify-center border border-gray-700 hover:border-yellow-500/50 transition-all duration-200 active:scale-95"
      >
        <svg 
          className="w-4 h-4 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs text-gray-400">History</span>
      </button>

      {/* Undo Button */}
      <button
        onClick={onUndoBet}
        disabled={isPlacingBet}
        className="flex-1 h-11 bg-gray-800 rounded-lg flex flex-col items-center justify-center border border-gray-700 hover:border-yellow-500/50 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg 
          className="w-4 h-4 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
        <span className="text-xs text-gray-400">Undo</span>
      </button>

      {/* Select Chip Button (Prominent) */}
      <button
        onClick={onShowChipSelector}
        className="flex-1 h-11 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center border-2 border-yellow-400 shadow-lg hover:shadow-yellow-500/25 transition-all duration-200 active:scale-95"
      >
        {selectedBetAmount > 0 ? (
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 bg-yellow-700 rounded-full flex items-center justify-center">
              <span className="text-yellow-900 text-xs font-bold">₹</span>
            </div>
            <span className="text-yellow-900 font-bold text-sm">
              {selectedBetAmount >= 1000 ? `${selectedBetAmount/1000}k` : selectedBetAmount}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <svg 
              className="w-4 h-4 text-yellow-900" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <circle cx="10" cy="10" r="8" />
            </svg>
            <span className="text-yellow-900 font-bold text-sm">Select Chip</span>
          </div>
        )}
      </button>

      {/* Rebet Button */}
      <button
        onClick={onRebet}
        disabled={isPlacingBet}
        className="flex-1 h-11 bg-gray-800 rounded-lg flex flex-col items-center justify-center border border-gray-700 hover:border-yellow-500/50 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg 
          className="w-4 h-4 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span className="text-xs text-gray-400">Rebet</span>
      </button>
    </div>
  );
};

export default ControlsRow;
