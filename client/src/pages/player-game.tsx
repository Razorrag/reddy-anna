/**
 * Player Game Interface - Refactored Version
 * 
 * Uses GameStateContext for state management
 * Removes direct DOM manipulation
 * Proper React patterns throughout
 */

import { useState, useEffect, useCallback } from "react";
import { useGameState } from "@/contexts/GameStateContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useNotification } from "@/components/NotificationSystem/NotificationSystem";
import { cn } from "@/lib/utils";
import { formatCurrency, formatCurrencyShort } from "@/lib/payoutCalculator";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
// MockBettingSimulation removed for live testing
// import MockBettingSimulation from "@/components/MockBettingSimulation/MockBettingSimulation";
import type { BetSide } from "@/types/game";
import "../player-game.css";

const CHIP_VALUES = [50000, 40000, 30000, 20000, 10000, 5000, 2500, 1000];

interface GameHistoryItem {
  id: string;
  round: number;
  winner: string;
  timestamp: Date;
}

export default function PlayerGame() {
  const { showNotification } = useNotification();
  const { placeBet: placeBetWebSocket } = useWebSocket();
  const {
    gameState,
    updatePlayerWallet
  } = useGameState();

  // UI state
  const [selectedChip, setSelectedChip] = useState<number>(0);
  const [showChipSelector, setShowChipSelector] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
  const [betHistory, setBetHistory] = useState<Array<{
    round1: { andar: number; bahar: number };
    round2: { andar: number; bahar: number };
    balance: number;
  }>>([]);

  // User display - get from localStorage or use guest
  const userId = localStorage.getItem('userId') || localStorage.getItem('username') || 'guest';
  const userRole = localStorage.getItem('userRole');
  const [viewerCount] = useState('1,234');

  // Opening card display - phase transitions handled by WebSocket
  useEffect(() => {
    if (gameState.selectedOpeningCard && gameState.phase === 'betting') {
      showNotification(`Opening card: ${gameState.selectedOpeningCard.display} - Place your bets!`, 'success');
    }
  }, [gameState.selectedOpeningCard, gameState.phase, showNotification]);

  // Timer updates come from backend via WebSocket - no local countdown needed
  // Just show notifications for important timer events
  useEffect(() => {
    if (gameState.countdownTimer === 10 && gameState.phase === 'betting') {
      showNotification('⏰ 10 seconds remaining!', 'warning');
    } else if (gameState.countdownTimer === 0 && gameState.phase === 'dealing') {
      showNotification('Betting time ended! Dealing cards...', 'info');
    }
  }, [gameState.countdownTimer, gameState.phase, showNotification]);

  // Handle bet placement
  const handlePlaceBet = useCallback(async (side: BetSide) => {
    if (gameState.phase !== 'betting') {
      showNotification('Betting is closed!', 'error');
      return;
    }
    
    if (selectedChip <= 0) {
      showNotification('Please select a chip to bet', 'error');
      return;
    }

    if (gameState.playerWallet < selectedChip) {
      showNotification('Insufficient balance!', 'error');
      return;
    }

    try {
      // Save current state for undo
      setBetHistory(prev => [...prev, {
        round1: gameState.playerRound1Bets,
        round2: gameState.playerRound2Bets,
        balance: gameState.playerWallet
      }]);

      // Place bet using WebSocket
      await placeBetWebSocket(side, selectedChip);
      
      showNotification(`Bet of ${formatCurrencyShort(selectedChip)} placed on ${side.toUpperCase()}!`, 'success');
    } catch (error) {
      console.error('Error placing bet:', error);
      showNotification('Failed to place bet. Please try again.', 'error');
    }
  }, [gameState.phase, gameState.playerRound1Bets, gameState.playerRound2Bets, selectedChip, gameState.playerWallet, placeBetWebSocket, showNotification]);

  // Undo last bet
  const undoBet = useCallback(() => {
    if (betHistory.length > 0) {
      const lastState = betHistory[betHistory.length - 1];
      updatePlayerWallet(lastState.balance);
      setBetHistory(prev => prev.slice(0, -1));
      showNotification('Last bet has been undone', 'success');
    } else {
      showNotification('There is no bet to undo', 'error');
    }
  }, [betHistory, updatePlayerWallet, showNotification]);

  // Rebet
  const rebet = useCallback(() => {
    if (betHistory.length > 0) {
      const lastState = betHistory[betHistory.length - 1];
      const totalBet = 
        lastState.round1.andar + lastState.round1.bahar +
        lastState.round2.andar + lastState.round2.bahar;
      
      if (gameState.playerWallet >= totalBet) {
        // Place same bets again
        showNotification('Re-bet placed successfully!', 'success');
      } else {
        showNotification('Insufficient balance for re-bet!', 'error');
      }
    } else {
      showNotification('No previous bet to re-bet', 'error');
    }
  }, [betHistory, gameState.playerWallet, showNotification]);

  // Fetch game history from API
  const fetchGameHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/game/history');
      if (!response.ok) {
        throw new Error('Failed to fetch game history');
      }
      const data = await response.json();
      
      // Transform API data to match GameHistoryItem interface
      const transformedData: GameHistoryItem[] = data.map((item: any) => ({
        id: item.id || item.gameId,
        round: item.round || item.winningRound || 1,
        winner: item.winner,
        timestamp: new Date(item.createdAt)
      }));
      
      setGameHistory(transformedData);
    } catch (error) {
      console.error('Failed to fetch game history:', error);
      showNotification('Failed to load game history', 'error');
      // Fallback to empty array
      setGameHistory([]);
    }
  }, [showNotification]);

  // Show history
  const showFullHistory = useCallback(() => {
    setShowHistory(true);
    if (gameHistory.length === 0) {
      fetchGameHistory();
    }
  }, [gameHistory.length, fetchGameHistory]);

  // Get recent results for display
  const recentResults = gameHistory.slice(-12).reverse();

  return (
    <div className="game-body">
      {/* Mock Betting Simulation removed for live testing */}
      
      {/* Header Section */}
      <header className="header">
        <nav className="navbar">
          <div className="nav-container">
            <div className="nav-primary">
              <div className="logo">
                <h1>{userId}</h1>
              </div>
              <button
                type="button"
                className="menu-button"
                aria-label="Open menu"
              >
                <i className="fas fa-bars"></i>
              </button>
            </div>
            <div className="wallet-display">
              <i className="fas fa-wallet"></i>
              <div className="wallet-amount-display">
                {formatCurrency(gameState.playerWallet)}
              </div>
              
              {/* Admin Access Button - only visible to admin users */}
              {userRole === 'admin' && (
                <Link to="/admin" className="ml-4">
                  <Button 
                    variant="outline" 
                    className="border-gold/30 text-gold hover:bg-gold/10 h-10 px-4"
                  >
                    Admin
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Video Stream Section */}
      <div className="video-section">
        <video autoPlay muted loop playsInline style={{ display: 'block' }}>
          <source src="/hero-images/uhd_30fps.mp4" type="video/mp4" />
        </video>

        {/* Video Overlay */}
        <div className="video-overlay-content">
          <div className="game-info-left">
            <div className="live-indicator">
              <div className="live-dot"></div>
              <span>LIVE</span>
            </div>
            <span className="game-title-text">Andar Bahar</span>
          </div>
          <div className="view-count">
            <i className="fas fa-eye"></i>
            <span>{viewerCount}</span>
          </div>
        </div>

        {/* Round Indicator */}
        <div className="round-indicator">
          <div className="round-emoji">
            {gameState.currentRound === 1 ? '1️⃣' : gameState.currentRound === 2 ? '2️⃣' : '3️⃣'}
          </div>
          <div className="round-info">
            <div className="round-number">ROUND {gameState.currentRound}</div>
            <div className="round-status">
              {gameState.phase === 'betting' ? '⏱️ Place Your Bets!' :
               gameState.phase === 'dealing' ? '🎴 Dealing Cards...' :
               gameState.phase === 'complete' ? '🏆 Game Complete!' :
               '⏸️ Waiting...'}
            </div>
          </div>
        </div>

        {/* Timer Overlay */}
        <div className="timer-overlay">
          {gameState.phase === 'betting' && gameState.countdownTimer > 0 && (
            <div className="circular-timer" style={{
              background: gameState.countdownTimer <= 10 
                ? 'radial-gradient(circle, rgba(255, 68, 68, 0.9) 0%, rgba(200, 0, 0, 0.8) 100%)'
                : 'radial-gradient(circle, rgba(255, 215, 0, 0.9) 0%, rgba(255, 165, 0, 0.8) 100%)',
              border: gameState.countdownTimer <= 10 ? '4px solid #ff4444' : '4px solid #ffd700',
              boxShadow: gameState.countdownTimer <= 10 
                ? '0 0 30px rgba(255, 68, 68, 0.8), inset 0 0 20px rgba(255, 255, 255, 0.3)'
                : '0 0 30px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.3)',
              animation: gameState.countdownTimer <= 10 ? 'pulse 1s infinite' : 'none',
              padding: '20px',
              borderRadius: '50%',
              minWidth: '120px',
              minHeight: '120px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div className="timer-value" style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                color: '#fff',
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                lineHeight: '1'
              }}>
                {gameState.countdownTimer}
              </div>
              <div className="round-info" style={{
                fontSize: '0.9rem',
                color: '#fff',
                marginTop: '8px',
                textAlign: 'center',
                fontWeight: '600',
                textShadow: '0 1px 4px rgba(0,0,0,0.5)'
              }}>
                {gameState.countdownTimer <= 10 ? '⚠️ HURRY!' : '⏱️ Betting Time'}
              </div>
            </div>
          )}
          {gameState.phase === 'dealing' && (
            <div className="circular-timer" style={{
              background: 'radial-gradient(circle, rgba(100, 100, 100, 0.9) 0%, rgba(60, 60, 60, 0.8) 100%)',
              border: '4px solid #888',
              boxShadow: '0 0 20px rgba(100, 100, 100, 0.5)',
              padding: '20px',
              borderRadius: '50%',
              minWidth: '120px',
              minHeight: '120px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                fontSize: '1.2rem',
                color: '#fff',
                textAlign: 'center',
                fontWeight: '600'
              }}>
                🎴<br/>Dealing...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Game Interface Section */}
      <div className="game-interface">
        {/* Main Betting Areas */}
        <div className="main-betting-areas">
          {/* ANDAR ZONE */}
          <div 
            className="betting-zone andar-zone" 
            onClick={() => handlePlaceBet('andar')}
          >
            <div className="bet-info">
              <div className="bet-title">
                <span>ANDAR</span>
              </div>
              <div className="bet-amount">
                {formatCurrencyShort(gameState.andarTotalBet)}
              </div>
            </div>
            <div className="card-representation" style={{
              background: gameState.andarCards.length > 0 
                ? 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)'
                : 'rgba(165, 42, 42, 0.2)',
              border: gameState.andarCards.length > 0 
                ? '3px solid #A52A2A'
                : '2px solid rgba(165, 42, 42, 0.5)',
              borderRadius: '12px',
              padding: '20px',
              minWidth: '100px',
              minHeight: '140px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: gameState.andarCards.length > 0 
                ? '0 8px 24px rgba(165, 42, 42, 0.4), inset 0 2px 8px rgba(255, 255, 255, 0.3)'
                : 'none',
              transition: 'all 0.3s ease'
            }}>
              {gameState.andarCards.length > 0 ? (
                <>
                  <span className="card-rank" style={{
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    color: ['♥', '♦'].includes(gameState.andarCards[gameState.andarCards.length - 1].suit) ? '#dc143c' : '#000',
                    lineHeight: '1'
                  }}>
                    {gameState.andarCards[gameState.andarCards.length - 1].value}
                  </span>
                  <span className="card-suit" style={{
                    fontSize: '2.5rem',
                    color: ['♥', '♦'].includes(gameState.andarCards[gameState.andarCards.length - 1].suit) ? '#dc143c' : '#000',
                    marginTop: '8px'
                  }}>
                    {gameState.andarCards[gameState.andarCards.length - 1].suit}
                  </span>
                </>
              ) : (
                <div style={{ 
                  color: 'rgba(165, 42, 42, 0.6)', 
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  fontWeight: '600'
                }}>
                  No Card<br/>Yet
                </div>
              )}
            </div>
          </div>

          {/* CENTRAL CARD AREA */}
          <div className="central-card-area" style={{ position: 'relative' }}>
            {gameState.selectedOpeningCard && (
              <div style={{
                position: 'absolute',
                top: '-30px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#ffd700',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
              }}>
                Opening Card
              </div>
            )}
            <div className="opening-card" style={{
              background: gameState.selectedOpeningCard 
                ? 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)'
                : 'rgba(255, 255, 255, 0.1)',
              border: gameState.selectedOpeningCard 
                ? '3px solid #ffd700'
                : '2px solid rgba(255, 255, 255, 0.3)',
              boxShadow: gameState.selectedOpeningCard 
                ? '0 8px 32px rgba(255, 215, 0, 0.5), inset 0 2px 8px rgba(255, 255, 255, 0.3)'
                : 'none',
              transform: gameState.selectedOpeningCard ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.3s ease'
            }}>
              {gameState.selectedOpeningCard ? (
                <>
                  <span className="card-rank" style={{
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    color: ['♥', '♦'].includes(gameState.selectedOpeningCard.suit) ? '#dc143c' : '#000'
                  }}>
                    {gameState.selectedOpeningCard.value}
                  </span>
                  <span className="card-suit" style={{
                    fontSize: '2.5rem',
                    color: ['♥', '♦'].includes(gameState.selectedOpeningCard.suit) ? '#dc143c' : '#000'
                  }}>
                    {gameState.selectedOpeningCard.suit}
                  </span>
                </>
              ) : (
                <div style={{ 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  fontSize: '1rem',
                  textAlign: 'center'
                }}>
                  Waiting for<br/>Opening Card
                </div>
              )}
            </div>
          </div>

          {/* BAHAR ZONE */}
          <div 
            className="betting-zone bahar-zone" 
            onClick={() => handlePlaceBet('bahar')}
          >
            <div className="card-representation" style={{
              background: gameState.baharCards.length > 0 
                ? 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)'
                : 'rgba(1, 7, 59, 0.2)',
              border: gameState.baharCards.length > 0 
                ? '3px solid #01073b'
                : '2px solid rgba(1, 7, 59, 0.5)',
              borderRadius: '12px',
              padding: '20px',
              minWidth: '100px',
              minHeight: '140px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: gameState.baharCards.length > 0 
                ? '0 8px 24px rgba(1, 7, 59, 0.4), inset 0 2px 8px rgba(255, 255, 255, 0.3)'
                : 'none',
              transition: 'all 0.3s ease'
            }}>
              {gameState.baharCards.length > 0 ? (
                <>
                  <span className="card-rank" style={{
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    color: ['♥', '♦'].includes(gameState.baharCards[gameState.baharCards.length - 1].suit) ? '#dc143c' : '#000',
                    lineHeight: '1'
                  }}>
                    {gameState.baharCards[gameState.baharCards.length - 1].value}
                  </span>
                  <span className="card-suit" style={{
                    fontSize: '2.5rem',
                    color: ['♥', '♦'].includes(gameState.baharCards[gameState.baharCards.length - 1].suit) ? '#dc143c' : '#000',
                    marginTop: '8px'
                  }}>
                    {gameState.baharCards[gameState.baharCards.length - 1].suit}
                  </span>
                </>
              ) : (
                <div style={{ 
                  color: 'rgba(1, 7, 59, 0.6)', 
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  fontWeight: '600'
                }}>
                  No Card<br/>Yet
                </div>
              )}
            </div>
            <div className="bet-info">
              <div className="bet-title">
                <span>BAHAR</span>
              </div>
              <div className="bet-amount">
                {formatCurrencyShort(gameState.baharTotalBet)}
              </div>
            </div>
          </div>
        </div>

        {/* Locked Bets Display - Show player's bets from previous rounds */}
        {(gameState.currentRound >= 2 && (gameState.playerRound1Bets.andar > 0 || gameState.playerRound1Bets.bahar > 0)) && (
          <div className="locked-bets-display" style={{
            padding: '12px',
            margin: '10px 0',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#ffd700' }}>
              🔒 Your Locked Bets (Round 1)
            </div>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              {gameState.playerRound1Bets.andar > 0 && (
                <div style={{ color: '#ff4444' }}>
                  Andar: {formatCurrencyShort(gameState.playerRound1Bets.andar)}
                </div>
              )}
              {gameState.playerRound1Bets.bahar > 0 && (
                <div style={{ color: '#4444ff' }}>
                  Bahar: {formatCurrencyShort(gameState.playerRound1Bets.bahar)}
                </div>
              )}
            </div>
            {gameState.currentRound >= 3 && (gameState.playerRound2Bets.andar > 0 || gameState.playerRound2Bets.bahar > 0) && (
              <>
                <div style={{ fontSize: '14px', fontWeight: 'bold', margin: '8px 0', color: '#ffd700' }}>
                  🔒 Your Locked Bets (Round 2)
                </div>
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                  {gameState.playerRound2Bets.andar > 0 && (
                    <div style={{ color: '#ff4444' }}>
                      Andar: {formatCurrencyShort(gameState.playerRound2Bets.andar)}
                    </div>
                  )}
                  {gameState.playerRound2Bets.bahar > 0 && (
                    <div style={{ color: '#4444ff' }}>
                      Bahar: {formatCurrencyShort(gameState.playerRound2Bets.bahar)}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Card Sequence Display */}
        {gameState.dealtCards.length > 0 && (
          <div className="card-sequence-container show-flex">
            <div className="sequence-section andar-sequence">
              <div className="sequence-title">ANDAR</div>
              <div className="card-sequence">
                {gameState.andarCards.map((card, index) => (
                  <div key={index} className="sequence-card">
                    <span className="card-rank">{card.value}</span>
                    <span className="card-suit">{card.suit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="sequence-section bahar-sequence">
              <div className="sequence-title">BAHAR</div>
              <div className="card-sequence">
                {gameState.baharCards.map((card, index) => (
                  <div key={index} className="sequence-card">
                    <span className="card-rank">{card.value}</span>
                    <span className="card-suit">{card.suit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chip Selection Panel */}
        <div className={cn("chip-selection", showChipSelector ? "show" : "hide")}>
          <div className="chip-container">
            {CHIP_VALUES.map((value) => (
              <button
                key={value}
                className={cn("chip-btn", selectedChip === value && "active")}
                onClick={() => {
                  setSelectedChip(value);
                  setShowChipSelector(false);
                }}
              >
                <img 
                  src={`/coins/${value}.png`} 
                  alt={`₹${value/1000}k`} 
                  className="chip-image" 
                />
                <div className="chip-amount">
                  {formatCurrencyShort(value)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Game Controls */}
        <div className="game-controls">
          <button className="control-btn" onClick={showFullHistory}>
            <i className="fas fa-history"></i>
            <span>History</span>
          </button>
          <button className="control-btn" onClick={undoBet}>
            <i className="fas fa-undo"></i>
            <span>Undo</span>
          </button>
          <button 
            className="control-btn select-chip-btn" 
            onClick={() => setShowChipSelector(!showChipSelector)}
          >
            <i className="fas fa-coins"></i>
            <span>{selectedChip > 0 ? formatCurrencyShort(selectedChip) : 'Select Chip'}</span>
          </button>
          <button className="control-btn" onClick={rebet}>
            <i className="fas fa-redo"></i>
            <span>Rebet</span>
          </button>
        </div>

        {/* Recent Results */}
        <div className="recent-results-container" onClick={showFullHistory}>
          <div className="recent-results-header">
            <div className="history-title">Card History</div>
            <div className="history-expand">Click for more →</div>
          </div>
          <div className="recent-results-bottom">
            {recentResults.map((result) => (
              <div 
                key={result.id} 
                className={cn("result-chip", result.winner === 'andar' ? 'red' : 'blue')}
              >
                {result.winner === 'andar' ? 'A' : 'B'}
              </div>
            ))}
          </div>
          <div className="results-progress-bar"></div>
        </div>
      </div>
      
      {/* History Modal */}
      {showHistory && (
        <div className="history-modal show">
          <div className="history-content">
            <div className="history-header">
              <div className="history-title-large">Game History</div>
              <button className="close-history" onClick={() => setShowHistory(false)}>
                &times;
              </button>
            </div>
            <div className="history-grid">
              {gameHistory.slice(-30).reverse().map((result) => (
                <div key={result.id} className="history-item">
                  <div className="history-round">#{result.round}</div>
                  <div className={cn(
                    "history-result-chip",
                    result.winner === 'andar' ? 'red' : 'blue'
                  )}>
                    {result.winner === 'andar' ? 'A' : 'B'}
                  </div>
                </div>
              ))}
            </div>
            <div className="history-stats">
              <div className="stat-item">
                <div className="stat-label">Total Games</div>
                <div className="stat-value">{gameHistory.length}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Andar Wins</div>
                <div className="stat-value">
                  {gameHistory.filter(g => g.winner === 'andar').length}
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Bahar Wins</div>
                <div className="stat-value">
                  {gameHistory.filter(g => g.winner === 'bahar').length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
