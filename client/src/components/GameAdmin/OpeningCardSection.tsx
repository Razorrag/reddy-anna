import React from 'react';
import { useGameState } from '../../contexts/GameStateContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import CardGrid from '../CardGrid/CardGrid';

interface Card {
  suit: string;
  value: string;
  display: string;
}

const OpeningCardSection: React.FC = () => {
  const { gameState, setSelectedOpeningCard, phase } = useGameState();
  const { startGame } = useWebSocket();

  const handleCardSelect = (card: Card) => {
    setSelectedOpeningCard(card);
  };

  const handleUndo = () => {
    setSelectedOpeningCard(null);
  };

  const handleConfirm = () => {
    if (gameState.selectedOpeningCard) {
      startGame();
    }
  };

  if (phase !== 'opening') return null;

  return (
    <div id="openingCardSection" className="game-section">
      <h2 className="section-title">Select Opening Card</h2>
      <CardGrid
        id="openingCardsGrid"
        selectedCard={gameState.selectedOpeningCard}
        onSelect={handleCardSelect}
      />
      <div className="selected-cards">
        <div className="selected-card">
          <div className="selected-card-label">Selected Card</div>
          <div className="selected-card-value" id="selectedOpeningCard">
            {gameState.selectedOpeningCard ? gameState.selectedOpeningCard.display : 'None'}
          </div>
        </div>
      </div>
      <div className="game-controls" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
        <button 
          className="control-btn" 
          onClick={handleUndo}
          disabled={!gameState.selectedOpeningCard}
          style={{ opacity: !gameState.selectedOpeningCard ? 0.5 : 1 }}
        >
          Undo Selected Card
        </button>
        <button 
          className="control-btn primary" 
          onClick={handleConfirm}
          disabled={!gameState.selectedOpeningCard}
          style={{ 
            opacity: !gameState.selectedOpeningCard ? 0.5 : 1,
            backgroundColor: '#4CAF50',
            cursor: !gameState.selectedOpeningCard ? 'not-allowed' : 'pointer'
          }}
        >
          Confirm & Start Game
        </button>
      </div>
    </div>
  );
};

export default OpeningCardSection;