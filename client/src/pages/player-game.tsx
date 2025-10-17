import { useState, useEffect, useCallback } from "react";
import { Wallet, History, Undo2, Repeat2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlayingCard } from "@/components/PlayingCard";
import { CircularTimer } from "@/components/CircularTimer";
import { BettingChip } from "@/components/BettingChip";
import { GameHistoryModal } from "@/components/GameHistoryModal";
import { VideoStream } from "@/components/VideoStream";
import { NotificationContainer } from "@/components/Notification";
import { cn } from "@/lib/utils";
import type { Card, Side, GameState, DealtCard, GameHistoryEntry } from "@shared/schema";

const CHIP_VALUES = [100000, 50000, 25000, 10000, 5000, 2500];

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export default function PlayerGame() {
  // User state
  const [userId] = useState('demo-user-' + Math.random().toString(36).substr(2, 9));
  const [balance, setBalance] = useState(4420423.90);
  
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    gameId: '',
    openingCard: null,
    phase: 'idle',
    currentTimer: 30,
    round: 1,
    dealtCards: [],
    andarBets: 0,
    baharBets: 0,
    winner: null,
    winningCard: null,
  });
  
  // Betting state
  const [selectedChip, setSelectedChip] = useState<number | null>(null);
  const [myBets, setMyBets] = useState<{ andar: number; bahar: number }>({ andar: 0, bahar: 0 });
  const [lastBet, setLastBet] = useState<{ side: Side; amount: number } | null>(null);
  
  // UI state
  const [showChipSelector, setShowChipSelector] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // WebSocket connection
  const [ws, setWs] = useState<WebSocket | null>(null);
  
  // Add notification
  const addNotification = useCallback((type: Notification['type'], message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, type, message }]);
  }, []);
  
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);
  
  // Load game history from API
  useEffect(() => {
    fetch('/api/game-history?limit=50')
      .then(res => res.json())
      .then(data => setGameHistory(data))
      .catch(err => console.error('Failed to load game history:', err));
  }, []);
  
  // Place bet
  const placeBet = async (side: Side) => {
    if (!selectedChip) {
      addNotification('warning', 'Please select a chip first');
      return;
    }
    
    if (!gameState.gameId) {
      addNotification('error', 'Game not started yet');
      return;
    }
    
    if (gameState.phase !== 'betting') {
      addNotification('error', 'Betting is closed');
      return;
    }
    
    if (balance < selectedChip) {
      addNotification('error', 'Insufficient balance');
      return;
    }
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addNotification('error', 'Connection lost - bet not placed');
      return;
    }
    
    // Optimistically update local state
    const previousBets = { ...myBets };
    const previousBalance = balance;
    
    setMyBets(prev => ({
      ...prev,
      [side]: prev[side] + selectedChip
    }));
    setBalance(prev => prev - selectedChip);
    setLastBet({ side, amount: selectedChip });
    
    // Send bet to server via WebSocket
    ws.send(JSON.stringify({
      type: 'place_bet',
      data: {
        userId,
        gameId: gameState.gameId,
        side,
        amount: selectedChip,
        round: gameState.round
      }
    }));
    
    addNotification('success', `₹${selectedChip.toLocaleString()} bet placed on ${side.toUpperCase()}`);
  };
  
  // Undo last bet
  const undoBet = () => {
    if (!lastBet) {
      addNotification('info', 'No bet to undo');
      return;
    }
    
    if (gameState.phase !== 'betting') {
      addNotification('error', 'Cannot undo bet after betting closes');
      return;
    }
    
    setMyBets(prev => ({
      ...prev,
      [lastBet.side]: prev[lastBet.side] - lastBet.amount
    }));
    setBalance(prev => prev + lastBet.amount);
    setLastBet(null);
    
    addNotification('info', 'Last bet undone');
  };
  
  // Rebet
  const rebet = () => {
    if (!lastBet) {
      addNotification('info', 'No previous bet to repeat');
      return;
    }
    
    placeBet(lastBet.side);
  };
  
  // WebSocket connection setup
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    console.log('Connecting to WebSocket:', wsUrl);
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connected');
      // Authenticate
      socket.send(JSON.stringify({
        type: 'authenticate',
        data: { userId, role: 'player' }
      }));
    };
    
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'sync_game_state':
          setGameState(message.data);
          console.log('Game state synchronized:', message.data.gameId);
          break;
        
        case 'timer_update':
          setGameState(prev => ({
            ...prev,
            currentTimer: message.data.seconds,
            phase: message.data.phase
          }));
          break;
        
        case 'card_dealt':
          setGameState(prev => ({
            ...prev,
            dealtCards: [...prev.dealtCards, message.data]
          }));
          break;
        
        case 'game_complete':
          setGameState(prev => ({
            ...prev,
            phase: 'complete',
            winner: message.data.winner,
            winningCard: message.data.winningCard
          }));
          
          // Check if player won - get current bet amounts from local state
          setMyBets(currentBets => {
            const wonAmount = message.data.winner === 'andar' ? currentBets.andar : currentBets.bahar;
            if (wonAmount > 0) {
              const payout = wonAmount * 2; // 1:1 payout + original bet
              setBalance(prev => prev + payout);
              addNotification('success', `You won ₹${wonAmount.toLocaleString()}!`);
            } else if (currentBets.andar + currentBets.bahar > 0) {
              addNotification('error', 'Better luck next time');
            }
            return currentBets;
          });
          
          // Refresh game history
          fetch('/api/game-history?limit=50')
            .then(res => res.json())
            .then(data => setGameHistory(data))
            .catch(err => console.error('Failed to refresh game history:', err));
          break;
        
        case 'betting_stats':
          setGameState(prev => ({
            ...prev,
            andarBets: message.data.andarTotal,
            baharBets: message.data.baharTotal
          }));
          break;
        
        case 'phase_change':
          setGameState(prev => ({
            ...prev,
            phase: message.data.phase
          }));
          
          if (message.data.phase === 'betting') {
            // Reset bets for new round
            setMyBets({ andar: 0, bahar: 0 });
            setLastBet(null);
          }
          break;
        
        case 'game_reset':
          // Handle game reset from admin
          setGameState({
            gameId: '',
            openingCard: null,
            phase: 'idle',
            currentTimer: 30,
            round: message.data.round || 1,
            dealtCards: [],
            andarBets: 0,
            baharBets: 0,
            winner: null,
            winningCard: null,
          });
          setMyBets({ andar: 0, bahar: 0 });
          setLastBet(null);
          addNotification('info', 'Game reset by admin');
          break;
        
        case 'error':
          // Handle bet validation errors - rollback optimistic updates
          addNotification('error', message.data.message || 'An error occurred');
          // Note: Actual rollback would require tracking pending bets, for now just notify
          break;
        
        case 'bet_placed':
          // Bet confirmed by server - already optimistically updated
          console.log('Bet confirmed:', message.data);
          break;
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      addNotification('error', 'Connection error');
    };
    
    socket.onclose = () => {
      console.log('WebSocket disconnected');
      addNotification('warning', 'Disconnected from server');
    };
    
    setWs(socket);
    
    return () => {
      socket.close();
    };
  }, [userId, addNotification]);
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  // Separate dealt cards by side
  const andarCards = gameState.dealtCards.filter(card => card.side === 'andar');
  const baharCards = gameState.dealtCards.filter(card => card.side === 'bahar');
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Circular Timer */}
      <CircularTimer
        seconds={gameState.currentTimer}
        totalSeconds={30}
        phase={gameState.phase}
        isVisible={gameState.phase === 'betting' || gameState.phase === 'dealing'}
      />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/50 backdrop-blur-md border-b border-gold/30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-gold font-bold text-lg" data-testid="text-user-id">
            ID: {userId.substring(0, 12)}...
          </div>
          
          <div className="flex items-center gap-2 bg-gold/10 px-4 py-2 rounded-full border border-gold/30">
            <Wallet className="w-5 h-5 text-gold" />
            <span className="text-gold font-bold text-lg" data-testid="text-balance">
              {formatCurrency(balance)}
            </span>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pt-20 pb-32 px-2 md:px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Video Stream */}
          <div className="mb-6">
            <VideoStream 
              title="Andar Bahar Live"
              isLive={true}
            />
          </div>
          
          {/* Betting Areas - Three Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 mb-6">
            {/* Andar Side */}
            <button
              onClick={() => placeBet('andar')}
              disabled={gameState.phase !== 'betting'}
              className={cn(
                "relative p-6 rounded-xl bg-andar/90 border-2 border-andar",
                "transition-all duration-200 overflow-hidden",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "hover:scale-[1.02] hover:shadow-2xl hover:shadow-gold/30",
                "active:scale-95"
              )}
              data-testid="button-bet-andar"
            >
              {/* Bet Info */}
              <div className="relative z-10 text-left mb-4">
                <h3 className="text-2xl font-bold text-gold mb-2">ANDAR 1:1</h3>
                <div className="flex items-center gap-2">
                  {/* Chip indicator */}
                  <div className="w-8 h-8 rounded-full bg-gold/30 border-2 border-gold flex items-center justify-center">
                    <span className="text-gold text-xs font-bold">₹</span>
                  </div>
                  <div>
                    <div className="text-sm text-white/80">Total Bets</div>
                    <div className="text-xl font-bold text-gold" data-testid="text-andar-bets">
                      {formatCurrency(gameState.andarBets)}
                    </div>
                  </div>
                </div>
                
                {myBets.andar > 0 && (
                  <div className="mt-2 text-sm text-white">
                    Your bet: <span className="font-bold text-gold">{formatCurrency(myBets.andar)}</span>
                  </div>
                )}
              </div>
              
              {/* Cards Display */}
              {andarCards.length > 0 && (
                <ScrollArea className="w-full">
                  <div className="flex gap-2 pb-2">
                    {andarCards.map((card, index) => (
                      <PlayingCard
                        key={index}
                        card={card.card as Card}
                        size="sm"
                        isWinning={card.isWinningCard}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </button>
            
            {/* Center - Opening Card */}
            <div className="flex items-center justify-center">
              <div className="text-center">
                {gameState.openingCard ? (
                  <div className="mb-2">
                    <div className="text-sm text-gold-muted mb-2">Opening Card</div>
                    <PlayingCard 
                      card={gameState.openingCard as Card}
                      size="lg"
                      className="ring-4 ring-gold"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-32 rounded-lg bg-card border-2 border-dashed border-gold/30 flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">Waiting...</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Bahar Side */}
            <button
              onClick={() => placeBet('bahar')}
              disabled={gameState.phase !== 'betting'}
              className={cn(
                "relative p-6 rounded-xl bg-bahar/90 border-2 border-bahar",
                "transition-all duration-200 overflow-hidden",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "hover:scale-[1.02] hover:shadow-2xl hover:shadow-gold/30",
                "active:scale-95"
              )}
              data-testid="button-bet-bahar"
            >
              {/* Bet Info */}
              <div className="relative z-10 text-right mb-4">
                <h3 className="text-2xl font-bold text-gold mb-2">BAHAR 1:1</h3>
                <div className="flex items-center justify-end gap-2">
                  <div className="text-right">
                    <div className="text-sm text-white/80">Total Bets</div>
                    <div className="text-xl font-bold text-gold" data-testid="text-bahar-bets">
                      {formatCurrency(gameState.baharBets)}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gold/30 border-2 border-gold flex items-center justify-center">
                    <span className="text-gold text-xs font-bold">₹</span>
                  </div>
                </div>
                
                {myBets.bahar > 0 && (
                  <div className="mt-2 text-sm text-white">
                    Your bet: <span className="font-bold text-gold">{formatCurrency(myBets.bahar)}</span>
                  </div>
                )}
              </div>
              
              {/* Cards Display */}
              {baharCards.length > 0 && (
                <ScrollArea className="w-full">
                  <div className="flex gap-2 pb-2 justify-end">
                    {baharCards.map((card, index) => (
                      <PlayingCard
                        key={index}
                        card={card.card as Card}
                        size="sm"
                        isWinning={card.isWinningCard}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </button>
          </div>
          
          {/* Recent Results */}
          <button
            onClick={() => setShowHistory(true)}
            className="w-full p-4 bg-card rounded-xl border border-border hover-elevate mb-6"
            data-testid="button-show-history"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gold" />
                <span className="font-semibold text-foreground">Card History</span>
              </div>
              <span className="text-sm text-muted-foreground">Click for more →</span>
            </div>
            
            {/* Recent results row */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {gameHistory.slice(-10).map((game, index) => (
                <div
                  key={game.id}
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0",
                    "transition-transform hover:scale-110",
                    game.winner === 'andar' ? 'bg-andar' : 'bg-bahar'
                  )}
                  data-testid={`result-${index}`}
                >
                  {game.winner === 'andar' ? 'A' : 'B'}
                </div>
              ))}
              {gameHistory.length === 0 && (
                <div className="text-sm text-muted-foreground">No games yet</div>
              )}
            </div>
            
            {/* Progress bar */}
            <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gold w-1/2 rounded-full" />
            </div>
          </button>
        </div>
      </main>
      
      {/* Bottom Controls */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-md border-t border-gold/30 p-4">
        <div className="container mx-auto max-w-7xl">
          {/* Chip Selector */}
          {showChipSelector && (
            <div className="mb-4 pb-4 border-b border-gold/30">
              <ScrollArea className="w-full">
                <div className="flex gap-4 pb-2">
                  {CHIP_VALUES.map((value) => (
                    <BettingChip
                      key={value}
                      amount={value}
                      isSelected={selectedChip === value}
                      onClick={() => setSelectedChip(value)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
          
          {/* Control Buttons */}
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-1 h-auto py-3 border-gold/30 text-gold hover:bg-gold/10"
              onClick={() => setShowHistory(true)}
              data-testid="button-history"
            >
              <History className="w-5 h-5" />
              <span className="text-xs">History</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col items-center gap-1 h-auto py-3 border-gold/30 text-gold hover:bg-gold/10 disabled:opacity-50"
              onClick={undoBet}
              disabled={!lastBet || gameState.phase !== 'betting'}
              data-testid="button-undo"
            >
              <Undo2 className="w-5 h-5" />
              <span className="text-xs">Undo</span>
            </Button>
            
            <Button
              className="flex flex-col items-center gap-1 h-auto py-3 bg-gold text-black hover:bg-gold-light"
              onClick={() => setShowChipSelector(!showChipSelector)}
              data-testid="button-select-chip"
            >
              <div className="text-base font-bold">
                {selectedChip ? `₹${selectedChip/1000}k` : 'Select'}
              </div>
              <span className="text-xs">Chip</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col items-center gap-1 h-auto py-3 border-gold/30 text-gold hover:bg-gold/10 disabled:opacity-50"
              onClick={rebet}
              disabled={!lastBet || gameState.phase !== 'betting'}
              data-testid="button-rebet"
            >
              <Repeat2 className="w-5 h-5" />
              <span className="text-xs">Rebet</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <GameHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={gameHistory}
      />
      
      {/* Notifications */}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
}
