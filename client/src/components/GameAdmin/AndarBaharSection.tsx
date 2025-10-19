import React, { useState } from 'react';
import { useGameState } from '../../contexts/GameStateContext';
import { useWebSocket } from '../../contexts/WebSocketContext';

const AndarBaharSection = () => {
  const { gameState, setCurrentRound } = useGameState();
  const { sendWebSocketMessage, dealCard } = useWebSocket();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [cardPosition, setCardPosition] = useState(1);

  // Card grid for dealing
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  
  // Create card grid
  const cardGrid = suits.flatMap(suit => 
    ranks.map(rank => ({
      display: `${rank}${suit}`,
      suit,
      value: rank,
    }))
  );

  // Admin controls
  const startRound2 = () => {
    sendWebSocketMessage({
      type: 'start_round_2',
      data: { gameId: 'default-game' }
    });
  };

  const startFinalDraw = () => {
    sendWebSocketMessage({
      type: 'start_final_draw',
      data: { gameId: 'default-game' }
    });
  };

  const handleCardSelect = (card: any) => {
    setSelectedCard(card.display);
  };

  const handleDealCard = (side: 'andar' | 'bahar') => {
    if (!selectedCard) return;
    
    dealCard(
      { display: selectedCard, suit: selectedCard.slice(-1), value: selectedCard.slice(0, -1) },
      side,
      cardPosition
    );
    
    setCardPosition(cardPosition + 1);
    setSelectedCard(null);
  };

  return (
    <div className="andar-bahar-section" style={{
      background: 'rgba(0, 0, 0, 0.4)',
      padding: '20px',
      borderRadius: '15px',
      marginBottom: '20px'
    }}>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 'bold',
        marginBottom: '20px',
        color: '#ffd700',
        textAlign: 'center'
      }}>Card Dealing Section</h2>
      
      {/* Card Selection Grid - FIXED */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '15px',
        borderRadius: '10px',
        marginBottom: '20px'
      }}>
        <h3 style={{
          fontSize: '1.1rem',
          fontWeight: '600',
          marginBottom: '15px',
          color: '#ffd700'
        }}>Select Card to Deal (52 Cards)</h3>
        
        {/* Scrollable Card Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(13, 1fr)',
          gap: '8px',
          maxHeight: '300px',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '10px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '2px solid #ffd700'
        }}>
          {cardGrid.map((card, index) => {
            const isRed = ['', ''].includes(card.suit);
            return (
              <button
                key={index}
                onClick={() => handleCardSelect(card)}
                style={{
                  padding: '8px 4px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  borderRadius: '6px',
                  border: selectedCard === card.display ? '3px solid #ffed4e' : '2px solid #ffd700',
                  background: selectedCard === card.display 
                    ? 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
                  color: isRed ? '#dc143c' : '#000',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minHeight: '35px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: selectedCard === card.display 
                    ? '0 4px 12px rgba(255, 215, 0, 0.5)'
                    : '0 2px 4px rgba(0, 0, 0, 0.2)'
                }}
                onMouseEnter={(e) => {
                  if (selectedCard !== card.display) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(255, 215, 0, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCard !== card.display) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                  }
                }}
              >
                {card.display}
              </button>
            );
          })}
        </div>
        
        {/* Selected Card Display */}
        {selectedCard && (
          <div style={{
            marginTop: '15px',
            padding: '15px',
            background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
            borderRadius: '10px',
            textAlign: 'center',
            color: '#000',
            fontWeight: 'bold',
            fontSize: '1.2rem'
          }}>
            Selected: {selectedCard}
          </div>
        )}
      </div>
      
      {/* Automatic Alternation Indicator */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 237, 78, 0.2) 100%)',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px',
        border: '2px solid #ffd700',
        textAlign: 'center'
      }}>
        <h3 style={{
          color: '#ffd700',
          fontSize: '1.3rem',
          marginBottom: '15px',
          fontWeight: 'bold'
        }}>🔄 Automatic Card Dealing</h3>
        
        <div style={{
          fontSize: '1.1rem',
          color: '#fff',
          marginBottom: '15px',
          lineHeight: '1.6'
        }}>
          <p style={{ marginBottom: '10px' }}>Cards automatically alternate:</p>
          <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#ffd700' }}>
            1st → BAHAR | 2nd → ANDAR | 3rd → BAHAR | 4th → ANDAR...
          </p>
        </div>
        
        {/* Next Card Indicator */}
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '5px' }}>Next card goes to:</div>
          <div style={{
            fontSize: '1.8rem',
            fontWeight: 'bold',
            color: (gameState.andarCards.length + gameState.baharCards.length) % 2 === 0 ? '#4169E1' : '#A52A2A'
          }}>
            {(gameState.andarCards.length + gameState.baharCards.length) % 2 === 0 ? '🎴 BAHAR' : '🎴 ANDAR'}
          </div>
        </div>
      </div>
      
      {/* Position Counter */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '15px',
        borderRadius: '10px',
        textAlign: 'center'
      }}>
        <label style={{
          display: 'block',
          color: '#ffd700',
          fontSize: '1rem',
          marginBottom: '10px',
          fontWeight: '600'
        }}>Card Position:</label>
        <input
          type="number"
          min="1"
          value={cardPosition}
          onChange={(e) => setCardPosition(parseInt(e.target.value) || 1)}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            border: '2px solid #ffd700',
            padding: '10px',
            borderRadius: '8px',
            fontSize: '1.2rem',
            textAlign: 'center',
            width: '100px',
            fontWeight: 'bold'
          }}
        />
      </div>
    </div>
  );
};

export default AndarBaharSection;