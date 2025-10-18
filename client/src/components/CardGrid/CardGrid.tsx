import React, { useMemo } from 'react';
import './CardGrid.css';

interface Card {
  suit: string;
  value: string;
  display: string;
}

interface CardGridProps {
  id: string;
  selectedCard: Card | null;
  onSelect: (card: Card, index: number) => void;
  disabled?: boolean;
  showSelectedCard?: boolean;
}

const generateCards = (): Card[] => {
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const cards: Card[] = [];

  suits.forEach(suit => {
    values.forEach(value => {
      cards.push({ suit, value, display: `${value}${suit}` });
    });
  });

  return cards;
};

const CardGrid: React.FC<CardGridProps> = ({
  id,
  selectedCard,
  onSelect,
  disabled = false,
  showSelectedCard = false
}) => {
  const cards = useMemo(() => generateCards(), []);

  return (
    <div>
      <div className="cards-grid" id={id}>
        {cards.map((card, index) => (
          <button
            key={`${card.suit}-${card.value}-${index}`}
            className={`card-btn ${selectedCard?.display === card.display ? 'selected' : ''}`}
            onClick={() => !disabled && onSelect(card, index)}
            disabled={disabled}
          >
            {card.display}
          </button>
        ))}
      </div>

      {showSelectedCard && (
        <div className="selected-cards">
          <div className="selected-card">
            <div className="selected-card-label">Selected Card</div>
            <div className="selected-card-value">
              {selectedCard ? selectedCard.display : 'None'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardGrid;