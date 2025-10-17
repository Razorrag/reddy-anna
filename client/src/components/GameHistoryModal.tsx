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
        className="bg-card border-2 border-gold rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-gold/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gold/30 bg-gradient-to-r from-background to-card">
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
        <div className="grid grid-cols-3 gap-4 p-6 border-b border-border">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-3xl font-bold text-gold">{totalGames}</div>
            <div className="text-sm text-muted-foreground mt-1">Total Games</div>
          </div>
          <div className="text-center p-4 bg-andar/10 rounded-lg border border-andar/30">
            <div className="text-3xl font-bold text-andar">{andarWins}</div>
            <div className="text-sm text-muted-foreground mt-1">Andar Wins</div>
          </div>
          <div className="text-center p-4 bg-bahar/10 rounded-lg border border-bahar/30">
            <div className="text-3xl font-bold text-bahar">{baharWins}</div>
            <div className="text-sm text-muted-foreground mt-1">Bahar Wins</div>
          </div>
        </div>
        
        {/* History Grid */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
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
                  <div className="text-xs text-muted-foreground">
                    R{game.round}
                  </div>
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm",
                    "shadow-lg transition-transform hover:scale-110",
                    game.winner === 'andar' ? 'bg-andar' : 'bg-bahar'
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
