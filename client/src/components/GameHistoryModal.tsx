import { X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";

interface DealtCard {
  id: string;
  card: string;
  side: 'andar' | 'bahar';
  position: number;
  isWinningCard: boolean;
  createdAt?: string | Date;
}

interface EnhancedGameHistoryEntry {
  id: string;
  gameId: string;
  openingCard: string;
  winner: 'andar' | 'bahar';
  winningCard: string;
  totalCards: number;
  round: number;
  createdAt: string | Date;
  totalBets: number;
  andarTotalBet: number;
  baharTotalBet: number;
  totalWinnings: number;
  andarBetsCount: number;
  baharBetsCount: number;
  totalPlayers: number;
  dealtCards?: DealtCard[];
}

interface GameHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history?: EnhancedGameHistoryEntry[];
  selectedGameId?: string; // ✅ NEW: Pre-select a specific game by ID
}

export function GameHistoryModal({ isOpen, onClose, history: propHistory, selectedGameId }: GameHistoryModalProps) {
  const [history, setHistory] = useState<EnhancedGameHistoryEntry[]>(propHistory || []);
  const [loading, setLoading] = useState(false);
  const [selectedRound, setSelectedRound] = useState<EnhancedGameHistoryEntry | null>(null);
  const [selectedCard, setSelectedCard] = useState<DealtCard | null>(null);
  const { user } = useAuth();
  
  // Determine if user is admin - show admin data only to admins
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (isOpen) {
      if (propHistory && propHistory.length > 0) {
        setHistory(propHistory);
        // ✅ NEW: Pre-select game if selectedGameId is provided
        if (selectedGameId) {
          const gameToSelect = propHistory.find(g => g.gameId === selectedGameId);
          setSelectedRound(gameToSelect || null);
        } else {
          setSelectedRound(null); // Reset to default view (last game)
        }
      } else {
        fetchHistory();
      }
      
      // ✅ REMOVED AUTO-REFRESH: WebSocket provides real-time updates
      // No interval needed - prevents page jumping and unnecessary API calls
    }
  }, [isOpen, propHistory, selectedGameId]);

  // Listen for real-time game history updates via WebSocket
  useEffect(() => {
    if (!isOpen) return;

    const handleGameHistoryUpdate = (event: CustomEvent) => {
      console.log('📊 Game history update received:', event.detail);
      
      // Refresh history when new game completes
      fetchHistory();
    };

    window.addEventListener('game_history_update', handleGameHistoryUpdate as EventListener);
    
    return () => {
      window.removeEventListener('game_history_update', handleGameHistoryUpdate as EventListener);
    };
  }, [isOpen]);

  // ✅ FIX: Add retry logic for history fetch
  const fetchHistory = async (retryCount = 0) => {
    setLoading(true);
    try {
      const response = await apiClient.get<EnhancedGameHistoryEntry[]>('/api/game/history?limit=50');
      console.log('Game history API response:', response);
      
      let games: EnhancedGameHistoryEntry[] = [];
      if (Array.isArray(response)) {
        games = response;
      } else if (response && typeof response === 'object' && 'data' in response) {
        games = (response as any).data || [];
      }
      
      console.log('Parsed game history count:', games.length);
      setHistory(games);
      
      // ✅ NEW: Pre-select game if selectedGameId is provided
      if (selectedGameId) {
        const gameToSelect = games.find(g => g.gameId === selectedGameId);
        setSelectedRound(gameToSelect || null);
        console.log('📌 Pre-selected game:', gameToSelect?.gameId);
      } else {
        setSelectedRound(null); // Reset to default view (last game)
      }
    } catch (error) {
      console.error('Failed to fetch game history:', error);
      
      // ✅ FIX: Retry logic with exponential backoff (reduced to 2 retries)
      if (retryCount < 2) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 3000); // Max 3 seconds
        console.log(`⚠️ Retrying game history fetch in ${delay}ms (attempt ${retryCount + 1}/2)`);
        setTimeout(() => fetchHistory(retryCount + 1), delay);
      } else {
        // Final failure - show error but keep existing history if available
        console.error('❌ Failed to fetch game history after 2 retries');
        if (history.length === 0) {
          setHistory([]); // Only clear if no history exists
        }
        // Show notification to user (if notification context available)
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('show-notification', {
            detail: {
              message: 'Failed to load game history. Please refresh the page.',
              type: 'error'
            }
          }));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Calculate statistics
  const totalGames = history.length;
  const andarWins = history.filter(h => h.winner === 'andar').length;
  const baharWins = history.filter(h => h.winner === 'bahar').length;

  // Get the last game (most recent)
  const lastGame = history.length > 0 ? history[0] : null;
  
  // Display game (either selected round or last game)
  const displayGame = selectedRound || lastGame;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleRoundClick = (game: EnhancedGameHistoryEntry) => {
    setSelectedRound(game);
  };

  const handleBackToRecent = () => {
    setSelectedRound(null);
  };

  const handleCardClick = (card: DealtCard) => {
    setSelectedCard(card);
  };

  const handleCloseCardDetail = () => {
    setSelectedCard(null);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="game-history-modal"
    >
      <div 
        className="legacy-panel rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-gold/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gold/30 bg-gradient-to-r from-black/80 to-black/90">
          <div className="flex items-center gap-3">
            {selectedRound && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleBackToRecent}
                className="text-gold hover:text-gold-light"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <h2 className="text-2xl md:text-3xl font-bold text-gold">
              Game History
            </h2>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="text-gold hover:text-gold-light"
            data-testid="button-close-history"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 p-6 border-b border-gold/30">
          <div className="text-center p-4 bg-gold/10 rounded-lg border border-gold/30">
            <div className="text-3xl font-bold text-gold">{totalGames}</div>
            <div className="text-sm text-white/80 mt-1">Total Games</div>
          </div>
          <div className="text-center p-4 bg-[#A52A2A]/20 rounded-lg border border-[#A52A2A]/50">
            <div className="text-3xl font-bold text-[#A52A2A]">{andarWins}</div>
            <div className="text-sm text-white/80 mt-1">Andar Wins</div>
          </div>
          <div className="text-center p-4 bg-[#01073b]/20 rounded-lg border border-white/20">
            <div 
              className="text-3xl font-bold text-[#01073b]" 
              style={{
                textShadow: '0 0 8px rgba(255, 255, 255, 0.7), 0 0 16px rgba(255, 255, 255, 0.5), 0 0 24px rgba(255, 255, 255, 0.3), -1px -1px 0 rgba(255, 255, 255, 0.8), 1px -1px 0 rgba(255, 255, 255, 0.8), -1px 1px 0 rgba(255, 255, 255, 0.8), 1px 1px 0 rgba(255, 255, 255, 0.8)',
                WebkitTextStroke: '0.3px rgba(255, 255, 255, 0.4)'
              }}
            >
              {baharWins}
            </div>
            <div className="text-sm text-white/80 mt-1">Bahar Wins</div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-white/60">
            Loading game history...
          </div>
        ) : displayGame ? (
          <>
            {/* Game Details Section */}
            <div className="p-6 border-b border-gold/30">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gold mb-4">
                  {selectedRound ? `Round ${selectedRound.round || 1} Details` : 'Last Game Details'}
                </h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Opening Card</div>
                  <div className="text-2xl font-bold text-white">{displayGame.openingCard}</div>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Winner</div>
                  <div 
                    className={`text-lg font-bold uppercase ${
                      displayGame.winner === 'andar' ? 'text-[#A52A2A]' : 'text-[#01073b]'
                    }`}
                    style={displayGame.winner === 'bahar' ? {
                      textShadow: '0 0 6px rgba(255, 255, 255, 0.6), 0 0 12px rgba(255, 255, 255, 0.4), -1px -1px 0 rgba(255, 255, 255, 0.7), 1px -1px 0 rgba(255, 255, 255, 0.7), -1px 1px 0 rgba(255, 255, 255, 0.7), 1px 1px 0 rgba(255, 255, 255, 0.7)',
                      WebkitTextStroke: '0.2px rgba(255, 255, 255, 0.3)'
                    } : {}}
                  >
                    {displayGame.winner === 'andar' 
                      ? 'ANDAR' 
                      : (displayGame.round >= 3 ? 'BAHAR' : 'BABA')}
                  </div>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Winning Card</div>
                  <div className="text-2xl font-bold text-white">{displayGame.winningCard}</div>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Round</div>
                  <div className="text-2xl font-bold text-gold">{displayGame.round || 1}</div>
                </div>
              </div>

              {/* Show admin data only to admins, hide from players */}
              {isAdmin ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Total Bets</div>
                    <div className="text-lg font-bold text-white">{formatCurrency(displayGame.totalBets || 0)}</div>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Andar Total Bets</div>
                    <div className="text-lg font-bold text-[#A52A2A]">{formatCurrency(displayGame.andarTotalBet || 0)}</div>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Bahar Total Bets</div>
                    <div 
                      className="text-lg font-bold text-[#01073b]"
                      style={{
                        textShadow: '0 0 6px rgba(255, 255, 255, 0.6), 0 0 12px rgba(255, 255, 255, 0.4), -1px -1px 0 rgba(255, 255, 255, 0.7), 1px -1px 0 rgba(255, 255, 255, 0.7), -1px 1px 0 rgba(255, 255, 255, 0.7), 1px 1px 0 rgba(255, 255, 255, 0.7)',
                        WebkitTextStroke: '0.2px rgba(255, 255, 255, 0.3)'
                      }}
                    >
                      {formatCurrency(displayGame.baharTotalBet || 0)}
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Total Won by Winners</div>
                    <div className="text-lg font-bold text-green-400">{formatCurrency(displayGame.totalWinnings || 0)}</div>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Players Bet on {displayGame.winner === 'andar' ? 'Andar' : 'Bahar'}</div>
                    <div className="text-lg font-bold text-white">
                      {displayGame.winner === 'andar' ? (displayGame.andarBetsCount || 0) : (displayGame.baharBetsCount || 0)}
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Players Bet on {displayGame.winner === 'andar' ? 'Bahar' : 'Andar'}</div>
                    <div className="text-lg font-bold text-white">
                      {displayGame.winner === 'andar' ? (displayGame.baharBetsCount || 0) : (displayGame.andarBetsCount || 0)}
                    </div>
                  </div>
                </div>
              ) : (
                // Players see: opening card, winner, and cumulative money won by players
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Total Cards Dealt</div>
                    <div className="text-lg font-bold text-white">{displayGame.totalCards || 0}</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Total Won by Winners</div>
                    <div className="text-lg font-bold text-green-400">{formatCurrency(displayGame.totalWinnings || 0)}</div>
                  </div>
                </div>
              )}

              {/* Dealt Cards Section */}
              {displayGame.dealtCards && displayGame.dealtCards.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gold mb-3">Cards Dealt Sequence</h4>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {displayGame.dealtCards.map((dealtCard: DealtCard, index: number) => (
                      <div
                        key={dealtCard.id || index}
                        onClick={() => handleCardClick(dealtCard)}
                        className={`p-3 rounded-lg border-2 transition-all cursor-pointer hover:scale-110 hover:shadow-xl ${
                          dealtCard.isWinningCard
                            ? 'border-gold bg-gold/20 scale-105 shadow-lg shadow-gold/50'
                            : dealtCard.side === 'andar'
                            ? 'border-[#A52A2A] bg-[#A52A2A]/20 hover:bg-[#A52A2A]/30'
                            : 'border-[#01073b] bg-[#01073b]/20 hover:bg-[#01073b]/30'
                        }`}
                        title={`Click to view details: ${dealtCard.side === 'andar' ? 'Andar' : 'Bahar'} card #${dealtCard.position}${dealtCard.isWinningCard ? ' - WINNER' : ''}`}
                      >
                        <div className="text-xs text-gray-400 mb-1 text-center">
                          {dealtCard.side === 'andar' ? 'A' : 'B'} #{dealtCard.position}
                        </div>
                        <div className={`text-xl font-bold text-center ${
                          dealtCard.isWinningCard ? 'text-gold' : 'text-white'
                        }`}>
                          {dealtCard.card}
                        </div>
                        {dealtCard.isWinningCard && (
                          <div className="text-xs text-gold mt-1 text-center font-semibold">⭐ Winner</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-gold text-center font-semibold animate-pulse">
                    💡 Click any card to view detailed statistics
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-white/60">
            No game history yet
          </div>
        )}
        
        {/* History Grid - Round Indicators */}
        <div className="p-6 overflow-y-auto max-h-[30vh] border-t border-gold/30">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gold">Recent Rounds</h4>
          </div>
          {history.length === 0 ? (
            <div className="text-center py-6 text-white/60 text-sm">
              No rounds yet
            </div>
          ) : (
            <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
              {history.slice(0, 10).map((game, index) => {
                const roundNumber = game.round || (history.length - index);
                return (
                  <div 
                    key={game.id} 
                    className="flex flex-col items-center gap-2"
                    data-testid={`history-item-${index}`}
                  >
                    <div className="text-xs text-white/60">
                      R{roundNumber}
                    </div>
                    <button
                      onClick={() => handleRoundClick(game)}
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm",
                        "shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer",
                        "hover:ring-2 hover:ring-gold/50",
                        selectedRound?.id === game.id ? "ring-2 ring-gold" : "",
                        game.winner === 'andar' ? 'bg-[#A52A2A]' : 'bg-[#01073b]'
                      )}
                      title={`Click to view Round ${roundNumber} details`}
                    >
                      {game.winner === 'andar' ? 'A' : 'B'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Card Detail Modal */}
      {selectedCard && displayGame && (
        <div 
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={handleCloseCardDetail}
        >
          <div 
            className="legacy-panel rounded-xl max-w-2xl w-full shadow-2xl shadow-gold/30 border-2 border-gold/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gold/30 bg-gradient-to-r from-black/80 to-black/90">
              <h3 className="text-2xl font-bold text-gold">
                Card Details: {selectedCard.card}
              </h3>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCloseCardDetail}
                className="text-gold hover:text-gold-light"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Card Info */}
            <div className="p-6 space-y-6">
              {/* Large Card Display */}
              <div className="flex justify-center">
                <div className={`p-8 rounded-2xl border-4 shadow-2xl ${
                  selectedCard.isWinningCard
                    ? 'border-gold bg-gold/20 shadow-gold/50'
                    : selectedCard.side === 'andar'
                    ? 'border-[#A52A2A] bg-[#A52A2A]/20'
                    : 'border-[#01073b] bg-[#01073b]/20'
                }`}>
                  <div className="text-6xl font-bold text-center text-white">
                    {selectedCard.card}
                  </div>
                  {selectedCard.isWinningCard && (
                    <div className="text-center mt-4">
                      <div className="text-2xl text-gold font-bold">⭐ WINNING CARD ⭐</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">Side</div>
                  <div className={`text-2xl font-bold uppercase ${
                    selectedCard.side === 'andar' ? 'text-[#A52A2A]' : 'text-[#01073b]'
                  }`}
                  style={selectedCard.side === 'bahar' ? {
                    textShadow: '0 0 6px rgba(255, 255, 255, 0.6), 0 0 12px rgba(255, 255, 255, 0.4)',
                    WebkitTextStroke: '0.2px rgba(255, 255, 255, 0.3)'
                  } : {}}
                  >
                    {selectedCard.side === 'andar' ? 'ANDAR' : 'BAHAR'}
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">Position</div>
                  <div className="text-2xl font-bold text-white">
                    #{selectedCard.position}
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">Card Rank</div>
                  <div className="text-2xl font-bold text-white">
                    {selectedCard.card.slice(0, -1) || selectedCard.card}
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">Suit</div>
                  <div className="text-2xl font-bold text-white">
                    {selectedCard.card.slice(-1)}
                  </div>
                </div>
              </div>

              {/* Game Context */}
              <div className="border-t border-gold/30 pt-4">
                <h4 className="text-lg font-semibold text-gold mb-3">Game Context</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Opening Card</div>
                    <div className="text-xl font-bold text-white">{displayGame.openingCard}</div>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Round</div>
                    <div className="text-xl font-bold text-gold">{displayGame.round || 1}</div>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Total Cards</div>
                    <div className="text-xl font-bold text-white">{displayGame.totalCards}</div>
                  </div>

                  {isAdmin && (
                    <>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Total Bets</div>
                        <div className="text-lg font-bold text-white">{formatCurrency(displayGame.totalBets || 0)}</div>
                      </div>

                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Andar Bets</div>
                        <div className="text-lg font-bold text-[#A52A2A]">{formatCurrency(displayGame.andarTotalBet || 0)}</div>
                      </div>

                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Bahar Bets</div>
                        <div className="text-lg font-bold text-[#01073b]"
                          style={{
                            textShadow: '0 0 6px rgba(255, 255, 255, 0.6)',
                            WebkitTextStroke: '0.2px rgba(255, 255, 255, 0.3)'
                          }}
                        >
                          {formatCurrency(displayGame.baharTotalBet || 0)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Winner Info */}
              {selectedCard.isWinningCard && (
                <div className="bg-gold/10 border border-gold/30 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl">🏆</div>
                    <div>
                      <div className="text-lg font-bold text-gold">Winning Card!</div>
                      <div className="text-sm text-white/80">This card determined the game outcome</div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="bg-black/30 rounded p-2">
                        <div className="text-xs text-gray-400">Winners</div>
                        <div className="text-lg font-bold text-green-400">
                          {displayGame.winner === 'andar' ? displayGame.andarBetsCount : displayGame.baharBetsCount} players
                        </div>
                      </div>
                      <div className="bg-black/30 rounded p-2">
                        <div className="text-xs text-gray-400">Total Winnings</div>
                        <div className="text-lg font-bold text-green-400">
                          {formatCurrency(displayGame.totalWinnings || 0)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Card Sequence Info */}
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Card Sequence</div>
                <div className="text-white/80 text-sm">
                  This was the <span className="text-gold font-bold">#{selectedCard.position}</span> card dealt in the game.
                  {selectedCard.isWinningCard ? (
                    <span className="text-gold"> It matched the opening card rank and ended the game!</span>
                  ) : (
                    <span> The game continued after this card was dealt.</span>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleCloseCardDetail}
                  className="bg-gold text-black hover:bg-gold-light px-8 py-3 text-lg font-semibold"
                >
                  Close Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
