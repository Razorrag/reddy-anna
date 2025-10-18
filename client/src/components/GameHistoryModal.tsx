import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { GameHistoryEntry } from "@shared/schema";

interface GameHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: GameHistoryEntry[];
}

export function GameHistoryModal({ isOpen, onClose, history }: GameHistoryModalProps) {
  if (!isOpen) return null;
  
  // Calculate statistics
  const totalGames = history.length;
  const andarWins = history.filter(h => h.winner === 'andar').length;
  const baharWins = history.filter(h => h.winner === 'bahar').length;
  
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
          <h2 className="text-2xl md:text-3xl font-bold text-gold">
            Game History
          </h2>
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
        
        {/* History Grid */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {history.length === 0 ? (
            <div className="text-center py-12 text-white/60">
              No game history yet
            </div>
          ) : (
            <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
              {history.map((game, index) => (
                <div 
                  key={game.id} 
                  className="flex flex-col items-center gap-2"
                  data-testid={`history-item-${index}`}
                >
                  <div className="text-xs text-white/60">
                    R{game.round}
                  </div>
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm",
                    "shadow-lg transition-transform hover:scale-110",
                    game.winner === 'andar' ? 'bg-[#A52A2A]' : 'bg-[#01073b]'
                  )}>
                    {game.winner === 'andar' ? 'A' : 'B'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
