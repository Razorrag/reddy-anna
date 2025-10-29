/**
 * CardHistory - Recent game results display
 *
 * Shows recent game results with circular badges for Andar/Bahar
 * and a link to view full history using existing GameHistoryModal.
 */

import React from 'react';

interface CardHistoryProps {
  gameState: any; // Use any to handle different GameState structures
  onHistoryClick: () => void;
  className?: string;
}

// Mock recent game history - in real app this would come from backend
const mockRecentResults = [
  { winner: 'andar', round: 1 },
  { winner: 'bahar', round: 2 },
  { winner: 'andar', round: 3 },
  { winner: 'andar', round: 4 },
  { winner: 'bahar', round: 5 },
  { winner: 'andar', round: 6 },
  { winner: 'bahar', round: 7 },
  { winner: 'andar', round: 8 },
];

const CardHistory: React.FC<CardHistoryProps> = ({
  // gameState,
  onHistoryClick,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Label and Recent Results */}
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-sm font-medium">Card History</span>
        
        <div className="flex gap-2">
          {mockRecentResults.slice(0, 6).map((result, index) => (
            <div
              key={index}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                transition-all duration-200 hover:scale-110 cursor-pointer
                ${result.winner === 'andar' 
                  ? 'bg-red-600 text-white border border-red-500' 
                  : 'bg-blue-900 text-white border border-blue-700'
                }
              `}
              title={`Round ${result.round} - ${result.winner.toUpperCase()} won`}
            >
              {result.winner === 'andar' ? 'A' : 'B'}
            </div>
          ))}
        </div>
      </div>

      {/* Click for more link */}
      <button
        onClick={onHistoryClick}
        className="flex items-center gap-1 text-yellow-400 text-sm hover:text-yellow-300 transition-colors duration-200"
      >
        <span>Click for more</span>
        <svg 
          className="w-4 h-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

export default CardHistory;
