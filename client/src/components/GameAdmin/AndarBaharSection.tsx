import React, { useEffect, useState } from 'react';
import { useGameState } from '../../contexts/GameStateContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import CardGrid from '../CardGrid/CardGrid';
import CountdownTimer from '../CountdownTimer/CountdownTimer';
import BettingStats from '../BettingStats/BettingStats';

interface Card {
  suit: string;
  value: string;
  display: string;
}

const AndarBaharSection: React.FC = () => {
  const { gameState, phase } = useGameState();
  const { dealCard } = useWebSocket();
  const [isAndarBaharVisible, setIsAndarBaharVisible] = useState(false);

  useEffect(() => {
    setIsAndarBaharVisible(phase !== 'opening');
  }, [phase]);

  const handleCardSelect = (card: Card, index: number) => {
    // Determine if it's Andar or Bahar based on position
    const totalCardsSelected = gameState.andarCards.length + gameState.baharCards.length;
    const nextCardNumber = totalCardsSelected + 1;
    const isOddSelection = nextCardNumber % 2 === 1;

    const side = isOddSelection ? 'bahar' : 'andar';

    dealCard(card, side, nextCardNumber);
  };

  if (!isAndarBaharVisible) return null;

  return (
    <div id="andarBaharSection" className="game-section" style={{ display: 'block' }}>
      <h2 className="section-title">Andar Bahar Card Selection</h2>
      <CardGrid
        id="andarBaharCardsGrid"
        selectedCard={null} // No card should be selected by default
        onSelect={handleCardSelect}
        disabled={phase === 'complete'}
      />
      <div className="selected-cards">
        <div className="selected-card">
          <div className="selected-card-label">Opening Card</div>
          <div className="selected-card-value" id="displayOpeningCard">
            {gameState.selectedOpeningCard ? gameState.selectedOpeningCard.display : 'None'}
          </div>
        </div>
        <div className="selected-card">
          <div className="selected-card-label">Countdown Timer</div>
          <div className="countdown-display" id="andarBaharCountdown">
            <CountdownTimer />
          </div>
        </div>
      </div>
      <div className="betting-stats" id="bettingStatsContainer">
        <BettingStats />
      </div>
    </div>
  );
};

export default AndarBaharSection;