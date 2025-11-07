/**
 * CardHistory - Recent game results display
 * 
 * Shows recent game results with opening card in circular badges
 * Color: Red for Andar wins, Blue for Bahar wins
 * Order: Right to left (newest on right)
 * Clickable to show game details
 */

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { X } from 'lucide-react';

interface GameResult {
  winner: string;
  round: number;
  gameId: string;
  openingCard: string;
  winningCard?: string;
  totalBets?: number;
  totalPayouts?: number;
}

interface CardHistoryProps {
  gameState?: any; // Keep for compatibility (optional, not used)
  onHistoryClick?: () => void; // Keep for compatibility (optional, not used)
  className?: string;
}

const CardHistory: React.FC<CardHistoryProps> = ({
  className = ''
}) => {
  const [recentResults, setRecentResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameResult | null>(null);
  const [gameDetails, setGameDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

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
              const hasOpeningCard = !!game.openingCard || !!game.opening_card;
              if (!hasWinner) {
                console.log('[CardHistory] Filtering out game without winner:', game);
              }
              if (!hasOpeningCard) {
                console.log('[CardHistory] Filtering out game without opening card:', game);
              }
              return hasWinner && hasOpeningCard;
            }) // Only show games with winners and opening cards
            .map(game => ({
              winner: (game.winner || '').toLowerCase(),
              round: game.round || game.current_round || game.winning_round || 1,
              gameId: game.gameId || game.game_id || game.id || `game-${Date.now()}-${Math.random()}`,
              openingCard: game.openingCard || game.opening_card || '',
              winningCard: game.winningCard || game.winning_card,
              totalBets: game.totalBets || game.total_bets,
              totalPayouts: game.totalPayouts || game.total_payouts
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
    
    // Refresh every 30 seconds as fallback (real-time updates handle most cases)
    const interval = setInterval(fetchHistory, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Listen for real-time game history updates via WebSocket
  useEffect(() => {
    const handleGameHistoryUpdate = (event: CustomEvent) => {
      console.log('[CardHistory] Real-time update received:', event.detail);
      // Refresh history when new game completes
      // We need to fetch again since we don't have access to fetchHistory here
      // Trigger a re-render by calling the fetch in a separate effect
      // Actually, let's just re-fetch directly
      const fetchHistory = async () => {
        try {
          const response = await apiClient.get<any[]>('/api/game/history?limit=10');
          let games: any[] = [];
          if (Array.isArray(response)) {
            games = response;
          } else if (response && typeof response === 'object') {
            if (Array.isArray((response as any).data)) {
              games = (response as any).data;
            } else if (Array.isArray((response as any).games)) {
              games = (response as any).games;
            } else if ((response as any).success && (response as any).data?.games) {
              games = (response as any).data.games;
            }
          }
          
          if (games.length > 0) {
            const formattedResults = games
              .filter(game => !!game.winner && (!!game.openingCard || !!game.opening_card))
              .map(game => ({
                winner: (game.winner || '').toLowerCase(),
                round: game.round || game.current_round || game.winning_round || 1,
                gameId: game.gameId || game.game_id || game.id || `game-${Date.now()}-${Math.random()}`,
                openingCard: game.openingCard || game.opening_card || '',
                winningCard: game.winningCard || game.winning_card,
                totalBets: game.totalBets || game.total_bets,
                totalPayouts: game.totalPayouts || game.total_payouts
              }))
              .slice(0, 10);
            setRecentResults(formattedResults);
          }
        } catch (error) {
          console.error('[CardHistory] Failed to refresh on update:', error);
        }
      };
      fetchHistory();
    };

    window.addEventListener('game_history_update', handleGameHistoryUpdate as EventListener);
    
    return () => {
      window.removeEventListener('game_history_update', handleGameHistoryUpdate as EventListener);
    };
  }, []);

  // Debug logging for rendering
  useEffect(() => {
    console.log('[CardHistory] Rendering with results count:', recentResults.length);
    console.log('[CardHistory] Loading state:', loading);
  }, [recentResults.length, loading]);

  // Extract card rank (number or face) without suit
  const getCardRank = (card: string): string => {
    if (!card) return '?';
    // Card format is like "A♠", "K♥", "10♦", "7♣"
    // Extract just the rank (everything before the suit symbol)
    const rank = card.replace(/[♠♥♦♣]/g, '').trim();
    return rank || '?';
  };

  // Handle clicking on a game circle
  const handleGameClick = async (game: GameResult) => {
    console.log('[CardHistory] Game clicked:', game);
    setSelectedGame(game);
    setLoadingDetails(true);
    
    try {
      // Fetch detailed game history including all rounds
      const response = await apiClient.get(`/api/game/history/${game.gameId}`);
      console.log('[CardHistory] Game details:', response);
      setGameDetails(response);
    } catch (error) {
      console.error('[CardHistory] Failed to load game details:', error);
      setGameDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Close modal
  const closeModal = () => {
    setSelectedGame(null);
    setGameDetails(null);
  };

  return (
    <div className={`flex items-center ${className}`}>
      {/* Recent Results - Right to Left (newest on right) */}
      <div className="flex items-center gap-2 flex-1">
        {loading ? (
          <div className="text-xs text-gray-500">Loading...</div>
        ) : (
          <div className="flex gap-2 flex-row-reverse">
            {/* flex-row-reverse makes newest appear on right */}
            {recentResults.length > 0 ? (
              recentResults.slice(0, 6).map((result, index) => (
                <button
                  key={result.gameId || index}
                  onClick={() => handleGameClick(result)}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                    transition-all duration-200
                    shadow-lg
                    cursor-pointer hover:scale-110 active:scale-95
                    ${result.winner === 'andar' 
                      ? 'bg-[#A52A2A] text-yellow-400 border-2 border-red-400 hover:border-red-300' 
                      : 'bg-[#01073b] text-yellow-400 border-2 border-blue-400 hover:border-blue-300'
                    }
                  `}
                  title={`Click to view game details | Opening: ${result.openingCard} | Winner: ${result.winner.toUpperCase()} | Round ${result.round}`}
                >
                  {getCardRank(result.openingCard)}
                </button>
              ))
            ) : (
              <div className="text-xs text-gray-500">No history yet</div>
            )}
          </div>
        )}
      </div>

      {/* Game Details Modal */}
      {selectedGame && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-gradient-to-br from-gray-900 to-black border-2 border-gold/30 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-gray-900 to-black border-b border-gold/30 p-4 flex justify-between items-center">
              <h3 className="text-gold font-bold text-lg">Game Details</h3>
              <button onClick={closeModal} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {loadingDetails ? (
                <div className="text-center py-8 text-white/60">Loading game details...</div>
              ) : (
                <>
                  {/* Game Info */}
                  <div className="bg-black/30 rounded-lg p-4 border border-gold/20">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-white/60">Opening Card</div>
                        <div className="text-yellow-400 font-bold text-xl">{selectedGame.openingCard}</div>
                      </div>
                      <div>
                        <div className="text-white/60">Winner</div>
                        <div className={`font-bold text-xl ${
                          selectedGame.winner === 'andar' ? 'text-red-400' : 'text-blue-400'
                        }`}>
                          {selectedGame.winner.toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <div className="text-white/60">Winning Round</div>
                        <div className="text-white font-bold">Round {selectedGame.round}</div>
                      </div>
                      <div>
                        <div className="text-white/60">Game ID</div>
                        <div className="text-white/80 text-xs font-mono">{selectedGame.gameId.slice(-8)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Round History */}
                  {gameDetails && gameDetails.rounds && gameDetails.rounds.length > 0 && (
                    <div className="bg-black/30 rounded-lg p-4 border border-gold/20">
                      <h4 className="text-gold font-semibold mb-3">Round History</h4>
                      <div className="space-y-2">
                        {gameDetails.rounds.map((round: any, index: number) => (
                          <div key={index} className="bg-black/40 rounded p-3 border border-white/10">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-white font-semibold">Round {round.round || index + 1}</span>
                              <span className={`text-sm font-bold ${
                                round.winner === 'andar' ? 'text-red-400' : 'text-blue-400'
                              }`}>
                                {round.winner ? round.winner.toUpperCase() : 'In Progress'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-white/60">Andar Bets:</span>
                                <span className="text-white ml-1">₹{round.andarBets || 0}</span>
                              </div>
                              <div>
                                <span className="text-white/60">Bahar Bets:</span>
                                <span className="text-white ml-1">₹{round.baharBets || 0}</span>
                              </div>
                              <div>
                                <span className="text-white/60">Andar Payout:</span>
                                <span className="text-green-400 ml-1">₹{round.andarPayout || 0}</span>
                              </div>
                              <div>
                                <span className="text-white/60">Bahar Payout:</span>
                                <span className="text-green-400 ml-1">₹{round.baharPayout || 0}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Total Stats */}
                  {gameDetails && (
                    <div className="bg-black/30 rounded-lg p-4 border border-gold/20">
                      <h4 className="text-gold font-semibold mb-3">Game Totals</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-white/60">Total Bets</div>
                          <div className="text-white font-bold">₹{gameDetails.totalBets || selectedGame.totalBets || 0}</div>
                        </div>
                        <div>
                          <div className="text-white/60">Total Payouts</div>
                          <div className="text-green-400 font-bold">₹{gameDetails.totalPayouts || selectedGame.totalPayouts || 0}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gradient-to-r from-gray-900 to-black border-t border-gold/30 p-4">
              <button
                onClick={closeModal}
                className="w-full bg-gold/20 hover:bg-gold/30 text-gold font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardHistory;
