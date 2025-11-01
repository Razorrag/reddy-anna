/**
 * CardHistory - Recent game results display
 * 
 * Shows recent game results with circular badges for Andar/Bahar
 * and a link to view full history using existing GameHistoryModal.
 */

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface CardHistoryProps {
  gameState: any; // Keep for compatibility
  onHistoryClick: () => void;
  className?: string;
}

const CardHistory: React.FC<CardHistoryProps> = ({
  onHistoryClick,
  className = ''
}) => {
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        console.log('📜 CardHistory: Fetching game history...');
        // Use the public game history endpoint that doesn't require authentication
        const response = await apiClient.get<any[]>('/api/game/history?limit=10');
        
        console.log('📜 CardHistory: Raw response:', response);
        console.log('📜 CardHistory: Response type:', typeof response);
        console.log('📜 CardHistory: Is array?', Array.isArray(response));
        
        // Handle response - should be an array directly
        const games = Array.isArray(response) ? response : [];
        
        console.log('📜 CardHistory: Games array length:', games.length);
        
        if (games.length > 0) {
          // Transform API data to match component format
          const formattedResults = games
            .filter(game => game.winner) // Only show games with winners
            .map(game => ({
              winner: (game.winner || '').toLowerCase(),
              round: game.round || 1,
              gameId: game.gameId || game.id || `game-${Date.now()}-${Math.random()}`
            }))
            .slice(0, 10); // Limit to 10 most recent
          
          console.log('📜 CardHistory: Formatted results:', formattedResults);
          setRecentResults(formattedResults);
        } else {
          console.log('📜 CardHistory: No games found, setting empty array');
          setRecentResults([]);
        }
      } catch (error: any) {
        console.error('❌ CardHistory: Failed to load:', error);
        console.error('❌ CardHistory: Error details:', {
          message: error.message,
          response: error.response,
          status: error.status
        });
        // Set empty array on error to avoid showing mock data
        setRecentResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
    
    // Refresh every 30 seconds to show new games
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  console.log('📜 CardHistory: Rendering with', recentResults.length, 'results');

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Label and Recent Results */}
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-sm font-medium">Card History</span>
        
        {loading ? (
          <div className="text-xs text-yellow-400 animate-pulse">Loading history...</div>
        ) : (
          <div className="flex gap-2">
            {recentResults.length > 0 ? (
              recentResults.slice(0, 6).map((result, index) => (
                <div
                  key={result.gameId || index}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    transition-all duration-200 hover:scale-110 cursor-pointer shadow-lg
                    ${result.winner === 'andar' 
                      ? 'bg-red-600 text-white border-2 border-red-400' 
                      : 'bg-blue-900 text-white border-2 border-blue-600'
                    }
                  `}
                  title={`Round ${result.round} - ${result.winner.toUpperCase()} won`}
                >
                  {result.winner === 'andar' ? 'A' : 'B'}
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400">
                {loading ? 'Loading...' : 'No games yet'}
              </div>
            )}
          </div>
        )}
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
