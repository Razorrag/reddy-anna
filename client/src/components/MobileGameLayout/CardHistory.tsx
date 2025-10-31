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
        const response = await apiClient.get<{
          success: boolean;
          data?: { games?: any[] };
          games?: any[]; // Fallback format
        }>('/api/user/game-history?limit=10');
        
        // Handle different response formats
        let games: any[] = [];
        if (response.success) {
          if (response.data?.games) {
            games = response.data.games;
          } else if (Array.isArray(response.data)) {
            games = response.data;
          } else if (Array.isArray((response as any).games)) {
            games = (response as any).games;
          }
        }
        
        if (games.length > 0) {
          // Transform API data to match component format
          const formattedResults = games
            .filter(game => game.winner) // Only show games with winners
            .map(game => ({
              winner: (game.winner || '').toLowerCase(),
              round: game.round || game.current_round || 1,
              gameId: game.gameId || game.game_id || `game-${Date.now()}-${Math.random()}`
            }))
            .slice(0, 10); // Limit to 10 most recent
          
          setRecentResults(formattedResults);
        } else {
          setRecentResults([]);
        }
      } catch (error: any) {
        console.error('Failed to load card history:', error);
        // Set empty array on error to avoid showing mock data
        setRecentResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Label and Recent Results */}
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-sm font-medium">Card History</span>
        
        {loading ? (
          <div className="text-xs text-gray-500">Loading...</div>
        ) : (
          <div className="flex gap-2">
            {recentResults.length > 0 ? (
              recentResults.slice(0, 6).map((result, index) => (
                <div
                  key={result.gameId || index}
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
              ))
            ) : (
              <div className="text-xs text-gray-500">No history</div>
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
