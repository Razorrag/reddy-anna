import React, { useState } from 'react';
import { useGameState } from '../../contexts/GameStateContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import type { Card } from '@/types/game';

const AndarBaharSection = () => {
  const { gameState, setCurrentRound } = useGameState();
  const { sendWebSocketMessage, dealCard } = useWebSocket();
  const [selectedBaharCard, setSelectedBaharCard] = useState<string | null>(null);
  const [selectedAndarCard, setSelectedAndarCard] = useState<string | null>(null);
  const [cardPosition, setCardPosition] = useState(1);
  const [showDealButton, setShowDealButton] = useState(false);

  // Card grid for dealing
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  
  // Helper function to convert suit symbol to proper suit name
  const getSuitName = (suit: string): 'hearts' | 'diamonds' | 'clubs' | 'spades' => {
    switch (suit) {
      case '♥': return 'hearts';
      case '♦': return 'diamonds';
      case '♣': return 'clubs';
      case '♠': return 'spades';
      default: return 'spades';
    }
  };

  // Helper function to get card value
  const getCardValue = (rank: string): number => {
    switch (rank) {
      case 'A': return 1;
      case 'J': return 11;
      case 'Q': return 12;
      case 'K': return 13;
      default: return parseInt(rank);
    }
  };
  
  // Create card grid
  const cardGrid = suits.flatMap(suit => 
    ranks.map(rank => ({
      display: `${rank}${suit}`,
      suit: getSuitName(suit),
      rank,
      value: getCardValue(rank),
      color: (suit === '♥' || suit === '♦') ? 'red' : 'black',
      id: `${rank}${suit}`
    }))
  );

  // Admin controls
  const startRound2 = () => {
    sendWebSocketMessage({
      type: 'phase_change',
      data: { phase: 'betting', round: 2, message: 'Starting Round 2 betting' }
    });
  };

  const startFinalDraw = () => {
    sendWebSocketMessage({
      type: 'phase_change',
      data: { phase: 'dealing', round: 3, message: 'Starting Round 3 continuous draw' }
    });
  };

  const handleCardSelect = (card: any) => {
    // Determine which card to select based on current selection state
    if (!selectedBaharCard) {
      setSelectedBaharCard(card.display);
    } else if (!selectedAndarCard) {
      setSelectedAndarCard(card.display);
      setShowDealButton(true); // Show deal button when both cards selected
    }
  };

  const handleShowCards = () => {
    if (!selectedBaharCard || !selectedAndarCard) return;
    
    // Create proper Card objects
    const baharCard: Card = {
      id: selectedBaharCard,
      display: selectedBaharCard,
      suit: getSuitName(selectedBaharCard.slice(-1)),
      rank: selectedBaharCard.slice(0, -1),
      value: getCardValue(selectedBaharCard.slice(0, -1)),
      color: (selectedBaharCard.slice(-1) === '♥' || selectedBaharCard.slice(-1) === '♦') ? 'red' : 'black'
    };
    
    const andarCard: Card = {
      id: selectedAndarCard,
      display: selectedAndarCard,
      suit: getSuitName(selectedAndarCard.slice(-1)),
      rank: selectedAndarCard.slice(0, -1),
      value: getCardValue(selectedAndarCard.slice(0, -1)),
      color: (selectedAndarCard.slice(-1) === '♥' || selectedAndarCard.slice(-1) === '♦') ? 'red' : 'black'
    };
    
    // Deal Bahar card first
    dealCard(baharCard, 'bahar', cardPosition);
    
    // Deal Andar card second
    setTimeout(() => {
      dealCard(andarCard, 'andar', cardPosition + 1);
    }, 500);
    
    // Reset selections
    setCardPosition(cardPosition + 2);
    setSelectedBaharCard(null);
    setSelectedAndarCard(null);
    setShowDealButton(false);
  };

  // Handle Round 3 continuous draw (deal one card at a time)
  const handleContinuousDraw = (card: any, side: 'bahar' | 'andar') => {
    const fullCard: Card = {
      id: card.id || card.display,
      display: card.display,
      suit: card.suit,
      rank: card.rank,
      value: card.value,
      color: card.color
    };
    
    dealCard(
      fullCard,
      side,
      side === 'bahar' ? gameState.baharCards.length + 1 : gameState.andarCards.length + 1
    );
  };
  
  const handleUndoSelection = () => {
    if (selectedAndarCard) {
      setSelectedAndarCard(null);
      setShowDealButton(false);
    } else if (selectedBaharCard) {
      setSelectedBaharCard(null);
    }
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
            const isSelected = selectedBaharCard === card.display || selectedAndarCard === card.display;
            return (
              <button
                key={index}
                onClick={() => handleCardSelect(card)}
                disabled={showDealButton}
                style={{
                  padding: '8px 4px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  borderRadius: '6px',
                  border: isSelected ? '3px solid #ffed4e' : '2px solid #ffd700',
                  background: isSelected 
                    ? 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
                  color: isRed ? '#dc143c' : '#000',
                  cursor: showDealButton ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  minHeight: '35px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isSelected 
                    ? '0 4px 12px rgba(255, 215, 0, 0.5)'
                    : '0 2px 4px rgba(0, 0, 0, 0.2)',
                  opacity: showDealButton ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isSelected && !showDealButton) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(255, 215, 0, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
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
        
        {/* Selected Cards Display */}
        {(selectedBaharCard || selectedAndarCard) && (
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
            <div>Bahar Card: {selectedBaharCard || '—'}</div>
            <div style={{ marginTop: '8px' }}>Andar Card: {selectedAndarCard || '—'}</div>
          </div>
        )}
        
        {/* Show Cards and Undo Buttons */}
        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
          <button
            onClick={handleUndoSelection}
            disabled={!selectedBaharCard && !selectedAndarCard}
            style={{
              flex: 1,
              background: (selectedBaharCard || selectedAndarCard) ? '#ff9800' : '#555',
              color: '#fff',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: (selectedBaharCard || selectedAndarCard) ? 'pointer' : 'not-allowed',
              opacity: (selectedBaharCard || selectedAndarCard) ? 1 : 0.5
            }}
          >
            ↩️ Undo
          </button>
          <button
            onClick={handleShowCards}
            disabled={!showDealButton}
            style={{
              flex: 2,
              background: showDealButton ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)' : '#555',
              color: '#fff',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: showDealButton ? 'pointer' : 'not-allowed',
              opacity: showDealButton ? 1 : 0.5,
              boxShadow: showDealButton ? '0 4px 15px rgba(76, 175, 80, 0.3)' : 'none'
            }}
          >
            🎴 Show Cards
          </button>
        </div>
      </div>
      
      {/* Round Info */}
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
        }}>📋 Round {gameState.currentRound} - Card Dealing</h3>
        
        <div style={{
          fontSize: '1.1rem',
          color: '#fff',
          marginBottom: '15px',
          lineHeight: '1.6'
        }}>
          <p style={{ marginBottom: '10px' }}>Select 2 cards in order:</p>
          <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#ffd700' }}>
            1st Card → BAHAR | 2nd Card → ANDAR
          </p>
          <p style={{ fontSize: '0.9rem', color: '#aaa', marginTop: '10px' }}>
            Click "Show Cards" to deal both cards to players
          </p>
        </div>
        
        {/* Cards Dealt Counter */}
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '5px' }}>Cards Dealt This Round:</div>
          <div style={{
            fontSize: '1.8rem',
            fontWeight: 'bold',
            color: '#ffd700'
          }}>
            Bahar: {gameState.baharCards.length} | Andar: {gameState.andarCards.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AndarBaharSection;
