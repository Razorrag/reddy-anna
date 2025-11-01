import { X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";

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
}

interface GameHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history?: EnhancedGameHistoryEntry[];
}

export function GameHistoryModal({ isOpen, onClose, history: propHistory }: GameHistoryModalProps) {
  const [history, setHistory] = useState<EnhancedGameHistoryEntry[]>(propHistory || []);
  const [loading, setLoading] = useState(false);
  const [selectedRound, setSelectedRound] = useState<EnhancedGameHistoryEntry | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (propHistory && propHistory.length > 0) {
        setHistory(propHistory);
        setSelectedRound(null); // Reset to default view (last game)
      } else {
        fetchHistory();
      }
    }
  }, [isOpen, propHistory]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      console.log('📜 GameHistoryModal: Fetching game history...');
      const response = await apiClient.get<EnhancedGameHistoryEntry[]>('/api/game/history?limit=50');
      
      let historyData: EnhancedGameHistoryEntry[] = [];
      
      if (Array.isArray(response)) {
        historyData = response;
      } else if (response && typeof response === 'object' && 'data' in response) {
        historyData = Array.isArray((response as any).data) ? (response as any).data : [];
      }
      
      // Filter and validate history entries
      const validHistory = historyData.filter(game => {
        const hasRequiredFields = 
          game && 
          game.openingCard && 
          game.winner && 
          game.winningCard &&
          (game.winner === 'andar' || game.winner === 'bahar');
        
        if (!hasRequiredFields && game) {
          console.warn('⚠️ GameHistoryModal: Skipping invalid game entry:', {
            gameId: game.gameId || game.id,
            hasOpeningCard: !!game.openingCard,
            hasWinner: !!game.winner,
            hasWinningCard: !!game.winningCard,
            winner: game.winner
          });
        }
        
        return hasRequiredFields;
      });
      
      console.log(`📜 GameHistoryModal: Found ${validHistory.length} valid games out of ${historyData.length} total`);
      
      setHistory(validHistory);
      setSelectedRound(null); // Reset to default view (last game)
    } catch (error: any) {
      console.error('❌ GameHistoryModal: Failed to fetch game history:', {
        message: error.message,
        response: error.response,
        status: error.status
      });
      setHistory([]);
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
          <div className="text-center p-4 bg-[#01073b]/20 rounded-lg border border-[#01073b]/50">
            <div className="text-3xl font-bold text-[#01073b]">{baharWins}</div>
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
                  <div className={`text-lg font-bold uppercase ${
                    displayGame.winner === 'andar' ? 'text-[#A52A2A]' : 'text-[#01073b]'
                  }`}>
                    {displayGame.winner}
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

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Total Bets</div>
                  <div className="text-lg font-bold text-white">{formatCurrency(displayGame.totalBets)}</div>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Andar Total Bets</div>
                  <div className="text-lg font-bold text-[#A52A2A]">{formatCurrency(displayGame.andarTotalBet)}</div>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Bahar Total Bets</div>
                  <div className="text-lg font-bold text-[#01073b]">{formatCurrency(displayGame.baharTotalBet)}</div>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Total Won by Winners</div>
                  <div className="text-lg font-bold text-green-400">{formatCurrency(displayGame.totalWinnings)}</div>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Players Bet on {displayGame.winner === 'andar' ? 'Andar' : 'Bahar'}</div>
                  <div className="text-lg font-bold text-white">
                    {displayGame.winner === 'andar' ? displayGame.andarBetsCount : displayGame.baharBetsCount}
                  </div>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Players Bet on {displayGame.winner === 'andar' ? 'Bahar' : 'Andar'}</div>
                  <div className="text-lg font-bold text-white">
                    {displayGame.winner === 'andar' ? displayGame.baharBetsCount : displayGame.andarBetsCount}
                  </div>
                </div>
              </div>
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
    </div>
  );
}
