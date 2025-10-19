import React, { useState } from 'react';
import { useGameState } from '../../contexts/GameStateContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useNotification } from '../NotificationSystem/NotificationSystem';
import type { Card } from '@/types/game';

const OpeningCardSection: React.FC = () => {
  const { gameState, setSelectedOpeningCard, phase, setPhase } = useGameState();
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
    setSelectedOpeningCard(null as any);
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
    
    // Send game start with opening card - backend will handle all broadcasts
    sendWebSocketMessage({
      type: 'game_start',
      data: {
        openingCard: gameState.selectedOpeningCard.display,
        gameId: 'default-game',
        round: 1,
        timer: customTime
      }
    });
    
    setShowTimerPopup(false);
    showNotification(`Starting Round 1 with ${customTime} seconds...`, 'info');
  };

  // Always show in admin, but indicate if not active
  const isActive = phase === 'opening' || phase === 'idle';

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