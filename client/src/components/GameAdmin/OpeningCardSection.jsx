import React, { useContext } from 'react';
import { GameStateContext } from '../../contexts/GameStateContext';
import { WebSocketContext } from '../../contexts/WebSocketContext';
import CardGrid from '../CardGrid/CardGrid';

const OpeningCardSection = () => {
  const { gameState, setSelectedOpeningCard, phase } = useContext(GameStateContext);
  const { startGame } = useContext(WebSocketContext);

  const handleCardSelect = (card) => {
    setSelectedOpeningCard(card);
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
      <div className="game-controls">
        <button className="control-btn" onClick={startGame}>Start Game</button>
        <button className="control-btn danger">Reset Game</button>
      </div>
    </div>
  );
};

export default OpeningCardSection;