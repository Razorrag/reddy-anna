# ⚡ QUICK FIX GUIDE
## Copy-Paste Code Changes for Critical Fixes

This document contains **exact code changes** you can copy-paste to fix the critical issues.

---

## 🎯 FIX 1: Admin Multi-Round Controls

**File:** `client/src/components/GameAdmin/GameAdmin.tsx`

**Find this section** (around line 450):
```typescript
return (
  <LoadingOverlay isLoading={isResettingGame} message="Resetting game...">
    <div className="game-admin-container">
      <GameHeader onSettingsClick={openSettings} />
```

**Add BEFORE `<GameHeader>`:**
```typescript
{/* Round Control Panel */}
<div className="round-control-panel" style={{
  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(20, 20, 20, 0.9) 100%)',
  border: '2px solid #ffd700',
  borderRadius: '10px',
  padding: '20px',
  margin: '20px',
  color: '#ffd700'
}}>
  <h2 style={{ fontSize: '1.5rem', marginBottom: '15px', textAlign: 'center' }}>
    Game Flow Control
  </h2>
  
  {/* Current Status */}
  <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Current Round</div>
      <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{gameState.currentRound}</div>
    </div>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Phase</div>
      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
        {gameState.phase}
      </div>
    </div>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Timer</div>
      <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{gameState.countdownTimer}s</div>
    </div>
  </div>
  
  {/* Bet Distribution */}
  <div style={{ 
    background: 'rgba(255, 215, 0, 0.1)', 
    padding: '15px', 
    borderRadius: '8px',
    marginBottom: '20px'
  }}>
    <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Bet Distribution</h3>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
      <div>
        <div style={{ color: '#A52A2A', fontWeight: 'bold' }}>ANDAR</div>
        <div>Total: ₹{gameState.andarTotalBet.toLocaleString('en-IN')}</div>
      </div>
      <div>
        <div style={{ color: '#01073b', fontWeight: 'bold' }}>BAHAR</div>
        <div>Total: ₹{gameState.baharTotalBet.toLocaleString('en-IN')}</div>
      </div>
    </div>
  </div>
  
  {/* Round Progression Buttons */}
  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
    <button
      onClick={() => {
        sendWebSocketMessage({
          type: 'start_round_2',
          data: { gameId: 'default-game' }
        });
        setGameState(prev => ({ ...prev, currentRound: 2, phase: 'andar_bahar' }));
        showNotification('Round 2 betting started!', 'success');
      }}
      disabled={gameState.currentRound !== 1 || gameState.phase === 'opening'}
      style={{
        background: gameState.currentRound === 1 && gameState.phase !== 'opening' 
          ? 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)' 
          : '#555',
        color: '#fff',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: gameState.currentRound === 1 && gameState.phase !== 'opening' ? 'pointer' : 'not-allowed',
        opacity: gameState.currentRound === 1 && gameState.phase !== 'opening' ? 1 : 0.5,
        transition: 'all 0.3s ease'
      }}
    >
      🎲 Start Round 2 Betting
    </button>
    
    <button
      onClick={() => {
        sendWebSocketMessage({
          type: 'start_final_draw',
          data: { gameId: 'default-game' }
        });
        setGameState(prev => ({ ...prev, currentRound: 3, phase: 'andar_bahar' }));
        showNotification('Round 3: Continuous draw started!', 'info');
      }}
      disabled={gameState.currentRound !== 2 || gameState.phase === 'opening'}
      style={{
        background: gameState.currentRound === 2 && gameState.phase !== 'opening'
          ? 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)'
          : '#555',
        color: '#fff',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: gameState.currentRound === 2 && gameState.phase !== 'opening' ? 'pointer' : 'not-allowed',
        opacity: gameState.currentRound === 2 && gameState.phase !== 'opening' ? 1 : 0.5,
        transition: 'all 0.3s ease'
      }}
    >
      🔥 Start Round 3 (Continuous Draw)
    </button>
    
    <button
      onClick={resetGame}
      style={{
        background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
        color: '#fff',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}
    >
      🔄 Reset Game
    </button>
  </div>
</div>
```

---

## 🎯 FIX 2: Player Round Awareness

**File:** `client/src/pages/player-game.tsx`

**Find this section** (around line 630):
```typescript
<div className="video-overlay-content">
  <div className="game-info-left">
```

**Add AFTER the closing `</div>` of `game-info-left`:**
```typescript
{/* Round Indicator */}
<div className="round-indicator" style={{
  position: 'absolute',
  top: '80px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.95) 0%, rgba(255, 237, 78, 0.95) 100%)',
  color: '#000',
  padding: '10px 30px',
  borderRadius: '25px',
  fontSize: '1.1rem',
  fontWeight: 'bold',
  boxShadow: '0 4px 15px rgba(255, 215, 0, 0.5)',
  zIndex: 15,
  display: 'flex',
  alignItems: 'center',
  gap: '15px'
}}>
  <div style={{ fontSize: '1.5rem' }}>
    {gameState.round === 1 ? '1️⃣' : gameState.round === 2 ? '2️⃣' : '3️⃣'}
  </div>
  <div>
    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>ROUND {gameState.round}</div>
    <div style={{ fontSize: '0.9rem' }}>
      {gameState.phase === 'betting' ? '⏱️ Place Your Bets!' :
       gameState.phase === 'dealing' ? '🎴 Dealing Cards...' :
       gameState.phase === 'complete' ? '🏆 Game Complete!' :
       '⏸️ Waiting...'}
    </div>
  </div>
</div>
```

**Find the betting zone sections** (around line 665):
```typescript
<div className="bet-title">
  <span>ANDAR 1:1</span>
</div>
```

**Replace with:**
```typescript
<div className="bet-title">
  <span>ANDAR {
    gameState.round === 1 ? '1:1 (Double)' :
    gameState.round === 2 ? '1:1 on All' :
    '1:1 on Total'
  }</span>
</div>
```

**And for Bahar** (around line 697):
```typescript
<div className="bet-title">
  <span>BAHAR 1:1</span>
</div>
```

**Replace with:**
```typescript
<div className="bet-title">
  <span>BAHAR {
    gameState.round === 1 ? '1:0 (Refund)' :
    gameState.round === 2 ? 'R1: 1:1, R2: Refund' :
    '1:1 on Total'
  }</span>
</div>
```

---

## 🎯 FIX 3: WebSocket Message Handlers

**File:** `client/src/pages/player-game.tsx`

**Find the WebSocket message handler** (around line 388):
```typescript
switch (message.type) {
  case 'connection':
```

**Add these new cases BEFORE the `default` case:**
```typescript
case 'START_ROUND_2_BETTING':
  setGameState(prev => ({
    ...prev,
    round: 2,
    phase: 'betting',
    currentTimer: message.data.timer || 30
  }));
  addNotification('info', '🎲 Round 2 betting has started! You can add more bets.');
  break;

case 'START_FINAL_DRAW':
  setGameState(prev => ({
    ...prev,
    round: 3,
    phase: 'dealing',
    currentTimer: 0
  }));
  addNotification('warning', '🔥 Round 3: Continuous draw! Betting is now locked.');
  break;

case 'opening_card_confirmed':
  setGameState(prev => ({
    ...prev,
    openingCard: message.data.openingCard,
    phase: 'betting',
    round: 1
  }));
  addNotification('success', `Opening card confirmed: ${message.data.openingCard}`);
  break;
```

---

## 🎯 FIX 4: Opening Card Flow

**File:** `client/src/components/GameAdmin/OpeningCardSection.tsx`

**Replace the entire file with:**
```typescript
import React, { useState } from 'react';
import { useGameState } from '../../contexts/GameStateContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useNotification } from '../NotificationSystem/NotificationSystem';

interface Card {
  suit: string;
  value: string;
  display: string;
}

const OpeningCardSection: React.FC = () => {
  const { gameState, setSelectedOpeningCard, phase } = useGameState();
  const { sendWebSocketMessage } = useWebSocket();
  const { showNotification } = useNotification();
  const [showTimerPopup, setShowTimerPopup] = useState(false);
  const [customTime, setCustomTime] = useState(30);

  // Card grid
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const allCards: Card[] = suits.flatMap(suit =>
    ranks.map(value => ({ suit, value, display: `${value}${suit}` }))
  );

  const handleCardSelect = (card: Card) => {
    setSelectedOpeningCard(card);
    showNotification(`Opening card selected: ${card.display}`, 'info');
  };

  const handleUndo = () => {
    setSelectedOpeningCard(null);
    showNotification('Selection cleared', 'info');
  };

  const handleConfirm = () => {
    if (!gameState.selectedOpeningCard) {
      showNotification('Please select a card first!', 'error');
      return;
    }
    setShowTimerPopup(true);
  };

  const handleStartRound1 = () => {
    if (!gameState.selectedOpeningCard) return;
    
    // Send to backend
    sendWebSocketMessage({
      type: 'game_start',
      data: {
        openingCard: gameState.selectedOpeningCard.display,
        gameId: 'default-game'
      }
    });
    
    // Broadcast opening card to players
    sendWebSocketMessage({
      type: 'opening_card_confirmed',
      data: {
        openingCard: gameState.selectedOpeningCard.display
      }
    });
    
    // Start timer
    sendWebSocketMessage({
      type: 'timer_update',
      data: {
        seconds: customTime,
        phase: 'betting'
      }
    });
    
    setShowTimerPopup(false);
    showNotification(`Round 1 started with ${customTime} seconds!`, 'success');
  };

  if (phase !== 'opening') return null;

  return (
    <div id="openingCardSection" className="game-section" style={{ padding: '20px' }}>
      <h2 className="section-title" style={{ color: '#ffd700', fontSize: '1.8rem', marginBottom: '20px' }}>
        Select Opening Card
      </h2>
      
      {/* Card Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(13, 1fr)',
        gap: '8px',
        marginBottom: '20px',
        maxWidth: '100%',
        overflowX: 'auto'
      }}>
        {allCards.map((card, index) => (
          <button
            key={index}
            onClick={() => handleCardSelect(card)}
            style={{
              background: gameState.selectedOpeningCard?.display === card.display
                ? 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
              border: gameState.selectedOpeningCard?.display === card.display
                ? '3px solid #ff9800'
                : '2px solid #ffd700',
              borderRadius: '8px',
              padding: '10px 5px',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              color: ['♥', '♦'].includes(card.suit) ? '#dc143c' : '#000',
              boxShadow: gameState.selectedOpeningCard?.display === card.display
                ? '0 6px 20px rgba(255, 215, 0, 0.5)'
                : '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}
          >
            {card.display}
          </button>
        ))}
      </div>
      
      {/* Selected Card Display */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.9) 100%)',
        border: '2px solid #ffd700',
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <div style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '10px' }}>Selected Opening Card</div>
        <div style={{ color: '#ffd700', fontSize: '3rem', fontWeight: 'bold' }}>
          {gameState.selectedOpeningCard ? gameState.selectedOpeningCard.display : '—'}
        </div>
      </div>
      
      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
        <button
          onClick={handleUndo}
          disabled={!gameState.selectedOpeningCard}
          style={{
            background: gameState.selectedOpeningCard
              ? 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)'
              : '#555',
            color: '#fff',
            border: 'none',
            padding: '15px 30px',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: gameState.selectedOpeningCard ? 'pointer' : 'not-allowed',
            opacity: gameState.selectedOpeningCard ? 1 : 0.5,
            transition: 'all 0.3s ease',
            boxShadow: gameState.selectedOpeningCard ? '0 4px 15px rgba(255, 152, 0, 0.3)' : 'none'
          }}
        >
          ↩️ Undo Selected Card
        </button>
        
        <button
          onClick={handleConfirm}
          disabled={!gameState.selectedOpeningCard}
          style={{
            background: gameState.selectedOpeningCard
              ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'
              : '#555',
            color: '#fff',
            border: 'none',
            padding: '15px 30px',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: gameState.selectedOpeningCard ? 'pointer' : 'not-allowed',
            opacity: gameState.selectedOpeningCard ? 1 : 0.5,
            transition: 'all 0.3s ease',
            boxShadow: gameState.selectedOpeningCard ? '0 4px 15px rgba(76, 175, 80, 0.3)' : 'none'
          }}
        >
          ✅ Confirm & Display Opening Card
        </button>
      </div>
      
      {/* Timer Popup */}
      {showTimerPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
            border: '3px solid #ffd700',
            borderRadius: '15px',
            padding: '30px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ color: '#ffd700', fontSize: '1.5rem', marginBottom: '20px', textAlign: 'center' }}>
              Start Round 1 Betting
            </h3>
            <p style={{ color: '#fff', marginBottom: '20px', textAlign: 'center' }}>
              Opening card: <span style={{ color: '#ffd700', fontSize: '1.5rem', fontWeight: 'bold' }}>
                {gameState.selectedOpeningCard?.display}
              </span>
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#ffd700', display: 'block', marginBottom: '10px', fontSize: '1.1rem' }}>
                Betting Timer (seconds)
              </label>
              <input
                type="number"
                value={customTime}
                onChange={(e) => setCustomTime(parseInt(e.target.value) || 30)}
                min="10"
                max="300"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '1.2rem',
                  textAlign: 'center',
                  borderRadius: '8px',
                  border: '2px solid #ffd700',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowTimerPopup(false)}
                style={{
                  flex: 1,
                  background: '#555',
                  color: '#fff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleStartRound1}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)'
                }}
              >
                🎲 Start Round 1
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpeningCardSection;
```

---

## ✅ VERIFICATION CHECKLIST

After applying these fixes, verify:

### Admin Page:
- [ ] Can select opening card
- [ ] "Undo" button clears selection
- [ ] "Confirm" button shows timer popup
- [ ] Can start Round 1 with custom timer
- [ ] Round control panel shows current round/phase
- [ ] Can click "Start Round 2 Betting" (after R1 dealing)
- [ ] Can click "Start Round 3" (after R2 dealing)
- [ ] Bet distribution shows totals

### Player Page:
- [ ] Round indicator shows current round (1, 2, or 3)
- [ ] Payout text changes per round
- [ ] Opening card displays after admin confirms
- [ ] Can place bets in Round 1
- [ ] Can place bets in Round 2
- [ ] Betting locked in Round 3
- [ ] Notifications show round transitions

---

## 🚀 TESTING SCRIPT

```bash
# Terminal 1: Start backend
cd e:\next\reddy-anna
npm run dev:server

# Terminal 2: Start frontend
npm run dev

# Browser 1: Admin
http://localhost:3000/admin-game

# Browser 2: Player 1
http://localhost:3000/

# Browser 3: Player 2
http://localhost:3000/
```

**Follow demo script in IMPLEMENTATION_SUMMARY.md**

---

**All critical fixes are now ready to copy-paste. Estimated time to apply: 30-45 minutes.**
