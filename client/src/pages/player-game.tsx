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
import type { BetSide, GameHistoryEntry } from "@/types/game";
import "../player-game.css";

const CHIP_VALUES = [100000, 50000, 40000, 30000, 20000, 10000, 5000, 2500];

interface GameHistoryItem {
  id: string;
  round: number;
  winner: string;
  timestamp: Date;
}

export default function PlayerGame() {
  const { showNotification } = useNotification();
  const { connectionState } = useWebSocket();
  const {
    gameState,
    placeBet,
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

  // User display
  const [userId] = useState('1308544430');
  const [viewerCount] = useState('1,234');

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

      // Place bet using context
      placeBet(side, selectedChip);
      
      showNotification(`Bet of ${formatCurrencyShort(selectedChip)} placed on ${side.toUpperCase()}!`, 'success');
    } catch (error) {
      console.error('Error placing bet:', error);
      showNotification('Failed to place bet. Please try again.', 'error');
    }
  }, [gameState.phase, gameState.playerRound1Bets, gameState.playerRound2Bets, selectedChip, gameState.playerWallet, placeBet, showNotification]);

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

  // Show history
  const showFullHistory = useCallback(() => {
    setShowHistory(true);
    if (gameHistory.length === 0) {
      generateHistoryData();
    }
  }, [gameHistory.length]);

  // Generate history data
  const generateHistoryData = () => {
    const results: GameHistoryItem[] = [];
    for (let i = 1; i <= 50; i++) {
      const isAndar = Math.random() > 0.5;
      results.push({
        id: `round-${i}`,
        round: i,
        winner: isAndar ? 'andar' : 'bahar',
        timestamp: new Date(Date.now() - (i * 60000))
      });
    }
    setGameHistory(results);
  };

  // Get recent results for display
  const recentResults = gameHistory.slice(-12).reverse();

  return (
    <div className="game-body">
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
            </div>
          </div>
        </nav>
      </header>

      {/* Video Stream Section */}
      <div className="video-section">
        <video autoPlay muted loop playsInline style={{ display: 'block' }}>
          <source src="/hero images/uhd_30fps.mp4" type="video/mp4" />
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
          {gameState.countdownTimer > 0 && (
            <div className="circular-timer">
              <div className="timer-value">{gameState.countdownTimer}</div>
              <div className="round-info">
                {gameState.phase === 'betting' ? `Betting Time: ${gameState.countdownTimer}s` :
                 gameState.phase === 'dealing' ? 'Dealing Phase' :
                 'Waiting...'}
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
            <div className="card-representation">
              {gameState.andarCards.length > 0 && (
                <>
                  <span className="card-rank">
                    {gameState.andarCards[gameState.andarCards.length - 1].value}
                  </span>
                  <span className="card-suit">
                    {gameState.andarCards[gameState.andarCards.length - 1].suit}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* CENTRAL CARD AREA */}
          <div className="central-card-area">
            <div className="opening-card">
              {gameState.selectedOpeningCard && (
                <>
                  <span className="card-rank">
                    {gameState.selectedOpeningCard.value}
                  </span>
                  <span className="card-suit">
                    {gameState.selectedOpeningCard.suit}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* BAHAR ZONE */}
          <div 
            className="betting-zone bahar-zone" 
            onClick={() => handlePlaceBet('bahar')}
          >
            <div className="card-representation">
              {gameState.baharCards.length > 0 && (
                <>
                  <span className="card-rank">
                    {gameState.baharCards[gameState.baharCards.length - 1].value}
                  </span>
                  <span className="card-suit">
                    {gameState.baharCards[gameState.baharCards.length - 1].suit}
                  </span>
                </>
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
            className="select-chip-btn" 
            onClick={() => setShowChipSelector(!showChipSelector)}
          >
            {selectedChip > 0 ? formatCurrencyShort(selectedChip) : 'Select Chip'}
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
