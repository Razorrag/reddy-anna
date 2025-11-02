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
        console.log('[CardHistory] Fetching game history...');
        // Use /api/game/history endpoint which returns an array directly
        const response = await apiClient.get<any[]>('/api/game/history?limit=10');
        console.log('[CardHistory] API response:', response);
        console.log('[CardHistory] Response type:', typeof response);
        console.log('[CardHistory] Is array:', Array.isArray(response));
        
        // Handle response - can be array directly or wrapped
        let games: any[] = [];
        if (Array.isArray(response)) {
          // Direct array response from /api/game/history
          games = response;
          console.log('[CardHistory] Parsed as direct array, count:', games.length);
        } else if (response && typeof response === 'object') {
          // Handle wrapped responses (fallback)
          console.log('[CardHistory] Response is object, checking nested properties...');
          if (Array.isArray((response as any).data)) {
            games = (response as any).data;
            console.log('[CardHistory] Found games in response.data, count:', games.length);
          } else if (Array.isArray((response as any).games)) {
            games = (response as any).games;
            console.log('[CardHistory] Found games in response.games, count:', games.length);
          } else if ((response as any).success && (response as any).data?.games) {
            games = (response as any).data.games;
            console.log('[CardHistory] Found games in response.data.games, count:', games.length);
          } else {
            console.warn('[CardHistory] Unknown response format:', response);
          }
        }
        
        console.log('[CardHistory] Final games array length:', games.length);
        
        if (games.length > 0) {
          // Transform API data to match component format
          const formattedResults = games
            .filter(game => {
              const hasWinner = !!game.winner;
              if (!hasWinner) {
                console.log('[CardHistory] Filtering out game without winner:', game);
              }
              return hasWinner;
            }) // Only show games with winners
            .map(game => ({
              winner: (game.winner || '').toLowerCase(),
              round: game.round || game.current_round || game.winning_round || 1,
              gameId: game.gameId || game.game_id || game.id || `game-${Date.now()}-${Math.random()}`
            }))
            .slice(0, 10); // Limit to 10 most recent
          
          console.log('[CardHistory] Formatted results count:', formattedResults.length);
          console.log('[CardHistory] Formatted results:', formattedResults);
          setRecentResults(formattedResults);
        } else {
          console.log('[CardHistory] No games found or empty array');
          setRecentResults([]);
        }
      } catch (error: any) {
        console.error('[CardHistory] Failed to load card history:', error);
        console.error('[CardHistory] Error details:', error.message, error.stack);
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

  // Debug logging for rendering
  useEffect(() => {
    console.log('[CardHistory] Rendering with results count:', recentResults.length);
    console.log('[CardHistory] Loading state:', loading);
  }, [recentResults.length, loading]);

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
