import { useState, useEffect, useCallback } from "react";
import { Settings, Play, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { NotificationContainer } from "@/components/Notification";
import { PlayingCard } from "@/components/PlayingCard";
import { cn } from "@/lib/utils";
import { RANKS, SUITS, type Card, type Rank, type Suit, type Side } from "@shared/schema";

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface GameSettings {
  minBet: number;
  maxBet: number;
  timerDuration: number;
  openingCard: string | null;
}

interface StreamSettings {
  streamType: 'video' | 'embed' | 'rtmp';
  streamUrl: string;
  streamTitle: string;
  streamStatus: 'live' | 'offline' | 'maintenance';
  streamDescription: string;
  rtmpUrl?: string;
  rtmpKey?: string;
}

export default function AdminGame() {
  const [selectedOpeningCard, setSelectedOpeningCard] = useState<Card | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [currentTimer, setCurrentTimer] = useState(30);
  const [timerDuration, setTimerDuration] = useState(30);
  const [dealtCards, setDealtCards] = useState<Array<{ card: Card; side: Side; position: number; isWinningCard?: boolean }>>([]);
  const [gameId, setGameId] = useState<string>('');
  const [round, setRound] = useState(1);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  
  // Settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    minBet: 1000,
    maxBet: 50000,
    timerDuration: 30,
    openingCard: null,
  });
  
  const [streamSettings, setStreamSettings] = useState<StreamSettings>({
    streamType: 'video',
    streamUrl: '/hero images/uhd_30fps.mp4',
    streamTitle: 'Andar Bahar Live Game',
    streamStatus: 'live',
    streamDescription: 'Experience the excitement of live Andar Bahar',
  });
  
  // Add notification
  const addNotification = useCallback((type: Notification['type'], message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, type, message }]);
  }, []);
  
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);
  
  // Generate all 52 cards - Matches Legacy Layout
  const allCards: Card[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      allCards.push(`${rank}${suit}` as Card);
    }
  }
  
  // WebSocket setup
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('Admin WebSocket connected');
      socket.send(JSON.stringify({
        type: 'authenticate',
        data: { userId: 'admin', role: 'admin' }
      }));
    };
    
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Admin received:', message);
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      addNotification('error', 'Connection error');
    };
    
    socket.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    setWs(socket);
    
    return () => {
      socket.close();
    };
  }, [addNotification]);
  
  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (timerRunning && currentTimer > 0) {
      interval = setInterval(() => {
        setCurrentTimer(prev => {
          const newValue = prev - 1;
          
          // Broadcast timer update
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'timer_update',
              data: {
                seconds: newValue,
                phase: newValue > 0 ? 'betting' : 'dealing'
              }
            }));
          }
          
          if (newValue === 0) {
            setTimerRunning(false);
            addNotification('info', 'Betting closed - Start dealing cards');
          }
          
          return newValue;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [timerRunning, currentTimer, ws, addNotification]);
  
  // Select opening card
  const selectOpeningCard = (card: Card) => {
    setSelectedOpeningCard(card);
    setGameSettings(prev => ({ ...prev, openingCard: card }));
    addNotification('success', `Opening card set to ${card}`);
    
    // Broadcast opening card to players
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'sync_game_state',
        data: {
          openingCard: card,
          phase: 'betting',
          currentTimer: timerDuration,
          round
        }
      }));
    }
  };
  
  // Start game
  const startGame = () => {
    if (!selectedOpeningCard) {
      addNotification('error', 'Please select an opening card first');
      return;
    }
    
    const newGameId = 'game-' + Date.now();
    setGameId(newGameId);
    setGameStarted(true);
    setDealtCards([]);
    
    // Broadcast game start
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'game_start',
        data: {
          gameId: newGameId,
          openingCard: selectedOpeningCard,
          round
        }
      }));
      
      ws.send(JSON.stringify({
        type: 'sync_game_state',
        data: {
          gameId: newGameId,
          openingCard: selectedOpeningCard,
          phase: 'betting',
          currentTimer: timerDuration,
          round,
          dealtCards: [],
          andarBets: 0,
          baharBets: 0,
          winner: null,
          winningCard: null
        }
      }));
    }
    
    addNotification('success', 'Game started!');
  };
  
  // Start countdown
  const startCountdown = () => {
    setCurrentTimer(timerDuration);
    setTimerRunning(true);
    
    // Broadcast phase change
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'phase_change',
        data: {
          phase: 'betting',
          round
        }
      }));
    }
    
    addNotification('info', `Timer started - ${timerDuration} seconds`);
  };
  
  // Deal card
  const dealCard = (card: Card) => {
    if (!gameStarted) {
      addNotification('error', 'Please start the game first');
      return;
    }
    
    if (timerRunning) {
      addNotification('error', 'Wait for betting to close');
      return;
    }
    
    // Determine side (alternating, starting with Bahar)
    const position = dealtCards.length + 1;
    const side: Side = position % 2 === 1 ? 'bahar' : 'andar';
    
    // Check if this card matches the opening card rank
    const cardRank = card.slice(0, -1);
    const openingRank = selectedOpeningCard?.slice(0, -1);
    const isWinning = cardRank === openingRank;
    
    const newCard = { card, side, position, isWinningCard: isWinning };
    setDealtCards(prev => [...prev, newCard]);
    setSelectedCard(card);
    
    // Broadcast card dealt
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'card_dealt',
        data: {
          gameId,
          card,
          side,
          position,
          isWinningCard: isWinning
        }
      }));
    }
    
    // Check for win
    if (isWinning) {
      setTimeout(() => {
        // Broadcast game complete
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'game_complete',
            data: {
              gameId,
              winner: side,
              winningCard: card,
              totalCards: position,
              round
            }
          }));
        }
        
        addNotification('success', `${side.toUpperCase()} wins with ${card}!`);
      }, 1000);
    }
  };
  
  // Reset game
  const resetGame = () => {
    setGameStarted(false);
    setTimerRunning(false);
    setCurrentTimer(timerDuration);
    setDealtCards([]);
    setSelectedCard(null);
    setSelectedOpeningCard(null);
    setGameId('');
    setRound(prev => prev + 1);
    
    // Broadcast reset
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'game_reset',
        data: { round: round + 1 }
      }));
    }
    
    addNotification('info', 'Game reset');
  };
  
  // Save settings
  const saveGameSettings = () => {
    setTimerDuration(gameSettings.timerDuration);
    
    // Broadcast settings update
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'settings_update',
        data: gameSettings
      }));
    }
    
    addNotification('success', 'Game settings saved');
    setSettingsOpen(false);
  };
  
  const saveStreamSettings = () => {
    // Broadcast stream settings
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'stream_status_update',
        data: streamSettings
      }));
    }
    
    addNotification('success', 'Stream settings saved');
  };
  
  // Separate dealt cards by side
  const andarCards = dealtCards.filter(c => c.side === 'andar');
  const baharCards = dealtCards.filter(c => c.side === 'bahar');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-purple-900/20 to-red-900/20 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header - Matches Legacy Admin Style */}
        <div className="relative bg-black/50 backdrop-blur-md rounded-xl p-6 mb-6 border border-gold/30">
          <div className="text-center mb-2">
            <h1 className="text-3xl md:text-4xl font-bold text-gold drop-shadow-lg">
              Game Admin
            </h1>
            <p className="text-lg text-white/80 mt-1">
              Manual Andar Bahar Game Control
            </p>
          </div>
          
          {/* Settings Button - Matches Legacy */}
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-6 right-6 text-gold hover:text-gold-light hover:rotate-90 transition-transform"
                data-testid="button-open-settings"
              >
                <Settings className="w-6 h-6" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border-gold/30">
              <DialogHeader>
                <DialogTitle className="text-2xl text-gold">Game Settings</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Game Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Game Configuration</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minBet">Minimum Bet (₹)</Label>
                      <Input
                        id="minBet"
                        type="number"
                        value={gameSettings.minBet}
                        onChange={(e) => setGameSettings(prev => ({ ...prev, minBet: parseInt(e.target.value) }))}
                        className="bg-black/50 border-gold/30 text-white"
                        data-testid="input-min-bet"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maxBet">Maximum Bet (₹)</Label>
                      <Input
                        id="maxBet"
                        type="number"
                        value={gameSettings.maxBet}
                        onChange={(e) => setGameSettings(prev => ({ ...prev, maxBet: parseInt(e.target.value) }))}
                        className="bg-black/50 border-gold/30 text-white"
                        data-testid="input-max-bet"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timerDuration">Timer Duration (seconds)</Label>
                    <Input
                      id="timerDuration"
                      type="number"
                      min="10"
                      max="300"
                      value={gameSettings.timerDuration}
                      onChange={(e) => setGameSettings(prev => ({ ...prev, timerDuration: parseInt(e.target.value) }))}
                      className="bg-black/50 border-gold/30 text-white"
                      data-testid="input-timer-duration"
                    />
                  </div>
                  
                  <Button 
                    onClick={saveGameSettings} 
                    className="w-full bg-gold text-black hover:bg-gold-light" 
                    data-testid="button-save-game-settings"
                  >
                    Save Game Settings
                  </Button>
                </div>
                
                {/* Stream Settings */}
                <div className="space-y-4 border-t pt-4 border-gold/30">
                  <h3 className="text-lg font-semibold text-white">Stream Configuration</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="streamType">Stream Type</Label>
                    <Select
                      value={streamSettings.streamType}
                      onValueChange={(value: any) => setStreamSettings(prev => ({ ...prev, streamType: value }))}
                    >
                      <SelectTrigger id="streamType" className="bg-black/50 border-gold/30 text-white" data-testid="select-stream-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0a0a] border-gold/30">
                        <SelectItem value="video">Video File</SelectItem>
                        <SelectItem value="embed">Embed URL</SelectItem>
                        <SelectItem value="rtmp">RTMP Stream</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {(streamSettings.streamType === 'video' || streamSettings.streamType === 'embed') && (
                    <div className="space-y-2">
                      <Label htmlFor="streamUrl">Stream URL</Label>
                      <Input
                        id="streamUrl"
                        value={streamSettings.streamUrl}
                        onChange={(e) => setStreamSettings(prev => ({ ...prev, streamUrl: e.target.value }))}
                        placeholder="https://example.com/stream"
                        className="bg-black/50 border-gold/30 text-white"
                        data-testid="input-stream-url"
                      />
                    </div>
                  )}
                  
                  {streamSettings.streamType === 'rtmp' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="rtmpUrl">RTMP Server URL</Label>
                        <Input
                          id="rtmpUrl"
                          value={streamSettings.rtmpUrl || ''}
                          onChange={(e) => setStreamSettings(prev => ({ ...prev, rtmpUrl: e.target.value }))}
                          placeholder="rtmps://live.restream.io:1937/live"
                          className="bg-black/50 border-gold/30 text-white"
                          data-testid="input-rtmp-url"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="rtmpKey">Stream Key</Label>
                        <Input
                          id="rtmpKey"
                          type="password"
                          value={streamSettings.rtmpKey || ''}
                          onChange={(e) => setStreamSettings(prev => ({ ...prev, rtmpKey: e.target.value }))}
                          placeholder="Stream key"
                          className="bg-black/50 border-gold/30 text-white"
                          data-testid="input-rtmp-key"
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="streamTitle">Stream Title</Label>
                    <Input
                      id="streamTitle"
                      value={streamSettings.streamTitle}
                      onChange={(e) => setStreamSettings(prev => ({ ...prev, streamTitle: e.target.value }))}
                      className="bg-black/50 border-gold/30 text-white"
                      data-testid="input-stream-title"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="streamStatus">Stream Status</Label>
                    <Select
                      value={streamSettings.streamStatus}
                      onValueChange={(value: any) => setStreamSettings(prev => ({ ...prev, streamStatus: value }))}
                    >
                      <SelectTrigger id="streamStatus" className="bg-black/50 border-gold/30 text-white" data-testid="select-stream-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0a0a] border-gold/30">
                        <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="streamDescription">Description</Label>
                    <Textarea
                      id="streamDescription"
                      value={streamSettings.streamDescription}
                      onChange={(e) => setStreamSettings(prev => ({ ...prev, streamDescription: e.target.value }))}
                      rows={3}
                      className="bg-black/50 border-gold/30 text-white"
                      data-testid="textarea-stream-description"
                    />
                  </div>
                  
                  <Button 
                    onClick={saveStreamSettings} 
                    className="w-full bg-gold text-black hover:bg-gold-light" 
                    data-testid="button-save-stream-settings"
                  >
                    Save Stream Settings
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Opening Card Selection - Matches Legacy Layout */}
        <div className="bg-black/50 backdrop-blur-md rounded-xl p-6 mb-6 border border-gold/30">
          <h2 className="text-2xl font-bold text-gold mb-4">Select Opening Card</h2>
          
          {/* 52 Card Grid - Matches Legacy Layout */}
          <div className="grid grid-cols-13 gap-2 mb-4">
            {allCards.map((card) => (
              <button
                key={card}
                onClick={() => selectOpeningCard(card)}
                className={cn(
                  "aspect-card transition-all hover:scale-105 hover:shadow-xl",
                  selectedOpeningCard === card && "ring-4 ring-gold scale-105"
                )}
                data-testid={`button-select-opening-${card}`}
              >
                <PlayingCard card={card} size="sm" />
              </button>
            ))}
          </div>
          
          {/* Selected Card Display - Matches Legacy */}
          <div className="flex items-center justify-center gap-4 p-4 bg-gold/10 rounded-lg border border-gold/30">
            <span className="text-lg font-semibold text-white">Selected Card:</span>
            {selectedOpeningCard ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gold">{selectedOpeningCard}</span>
                <PlayingCard card={selectedOpeningCard} size="sm" />
              </div>
            ) : (
              <span className="text-white/60">None</span>
            )}
          </div>
        </div>
        
        {/* Game Controls - Matches Legacy Layout */}
        <div className="bg-black/50 backdrop-blur-md rounded-xl p-6 mb-6 border border-gold/30">
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              onClick={startGame}
              disabled={!selectedOpeningCard || gameStarted}
              className="bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-gold-light hover:to-yellow-500 min-w-[200px]"
              data-testid="button-start-game"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Game
            </Button>
            
            <Button
              onClick={startCountdown}
              disabled={!gameStarted || timerRunning}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-500 hover:to-green-600 min-w-[200px]"
              data-testid="button-start-timer"
            >
              <Timer className="w-5 h-5 mr-2" />
              Start Timer ({timerDuration}s)
            </Button>
            
            <Button
              onClick={resetGame}
              variant="destructive"
              className="min-w-[200px]"
              data-testid="button-reset-game"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Reset Game
            </Button>
          </div>
          
          {/* Timer Display - Matches Legacy */}
          {timerRunning && (
            <div className="mt-4 text-center">
              <div className="text-6xl font-bold text-gold tabular-nums" data-testid="text-timer">
                {currentTimer}
              </div>
              <div className="text-sm text-white/60 mt-2">
                {currentTimer > 0 ? 'Betting Phase' : 'Dealing Phase'}
              </div>
            </div>
          )}
        </div>
        
        {/* Card Dealing Section - Matches Legacy Layout */}
        {gameStarted && !timerRunning && (
          <div className="bg-black/50 backdrop-blur-md rounded-xl p-6 mb-6 border border-gold/30">
            <h2 className="text-2xl font-bold text-gold mb-4">Deal Cards (Alternating: Bahar → Andar)</h2>
            
            {/* Dealt Cards Display - Matches Legacy */}
            {dealtCards.length > 0 && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#A52A2A] mb-2">ANDAR ({andarCards.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {andarCards.map((c, i) => (
                      <PlayingCard key={i} card={c.card} size="sm" isWinning={c.isWinningCard} />
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-[#01073b] mb-2">BAHAR ({baharCards.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {baharCards.map((c, i) => (
                      <PlayingCard key={i} card={c.card} size="sm" isWinning={c.isWinningCard} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Card Selection Grid - Matches Legacy */}
            <div className="grid grid-cols-13 gap-2">
              {allCards.map((card) => (
                <button
                  key={card}
                  onClick={() => dealCard(card)}
                  disabled={dealtCards.some(c => c.card === card)}
                  className={cn(
                    "aspect-card transition-all hover:scale-105 hover:shadow-xl",
                    "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100",
                    selectedCard === card && "ring-2 ring-gold"
                  )}
                  data-testid={`button-deal-${card}`}
                >
                  <PlayingCard card={card} size="sm" />
                </button>
              ))}
            </div>
            
            <div className="mt-4 text-center text-sm text-white/60">
              Next card goes to: <span className="font-bold text-gold">
                {dealtCards.length % 2 === 0 ? 'BAHAR' : 'ANDAR'}
              </span>
            </div>
          </div>
        )}
        
        {/* Game Info - Matches Legacy */}
        <div className="bg-black/50 backdrop-blur-md rounded-xl p-6 border border-gold/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-sm text-white/60">Round</div>
              <div className="text-2xl font-bold text-gold">{round}</div>
            </div>
            <div>
              <div className="text-sm text-white/60">Game ID</div>
              <div className="text-lg font-mono text-white truncate">{gameId || 'Not started'}</div>
            </div>
            <div>
              <div className="text-sm text-white/60">Cards Dealt</div>
              <div className="text-2xl font-bold text-gold">{dealtCards.length}</div>
            </div>
            <div>
              <div className="text-sm text-white/60">Status</div>
              <div className={cn(
                "text-lg font-semibold",
                gameStarted ? "text-green-500" : "text-white/60"
              )}>
                {gameStarted ? 'Active' : 'Idle'}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Notifications */}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
}
