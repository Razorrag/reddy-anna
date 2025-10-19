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
    <div className="andar-bahar-section bg-gray-800 p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Andar Bahar Controls</h2>
      
      {/* Multi-round Controls */}
      <div className="multi-round-controls mb-4">
        <h3 className="font-semibold mb-2">Game Flow Controls</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={startRound2}
            disabled={gameState.currentRound !== 1 || !['DEALING_R1', 'BETTING_R1'].includes(gameState.phase as string)}
            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded disabled:opacity-50"
          >
            Start Round 2 Betting
          </button>
          <button
            onClick={startFinalDraw}
            disabled={gameState.currentRound !== 2 || !['DEALING_R2', 'BETTING_R2'].includes(gameState.phase as string)}
            className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded disabled:opacity-50"
          >
            Start Final Draw
          </button>
        </div>
      </div>
      
      {/* Card Dealing */}
      <div className="card-dealing mb-4">
        <h3 className="font-semibold mb-2">Deal Card</h3>
        <div className="flex flex-wrap gap-2">
          <div className="card-selection bg-gray-700 p-3 rounded">
            <h4 className="text-sm font-medium mb-2">Select Card</h4>
            <div className="grid grid-cols-13 gap-1 max-h-40 overflow-y-auto">
              {cardGrid.map((card, index) => (
                <button
                  key={index}
                  className={`p-1 text-xs rounded ${
                    selectedCard === card.display
                      ? 'bg-yellow-500 text-black'
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                  onClick={() => handleCardSelect(card)}
                  disabled={selectedCard === card.display}
                >
                  {card.display}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleDealCard('andar')}
                disabled={!selectedCard}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded disabled:opacity-50"
              >
                Deal to Andar
              </button>
              <button
                onClick={() => handleDealCard('bahar')}
                disabled={!selectedCard}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50"
              >
                Deal to Bahar
              </button>
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium mb-1">Position:</label>
              <input
                type="number"
                min="1"
                value={cardPosition}
                onChange={(e) => setCardPosition(parseInt(e.target.value) || 1)}
                className="bg-gray-700 text-white p-1 rounded w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AndarBaharSection;