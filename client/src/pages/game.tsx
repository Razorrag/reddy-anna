import React, { useState } from 'react';
import { useGameState } from '../contexts/GameStateContext';
import { useWebSocket } from '../contexts/WebSocketContext';

const GamePage = () => {
  const { 
    gameState, 
    phase, 
    placeBet,
    setCurrentRound,
    setRound1PlayerBets,
    setRound2PlayerBets
  } = useGameState();
  const { connectionState } = useWebSocket();
  
  // Chip values for betting
  const [selectedChip, setSelectedChip] = useState<number>(100000); // Default to ₹1,00,000
  
  // Player betting functionality
  const handlePlaceBet = (side: 'andar' | 'bahar') => {
    if (placeBet) {
      placeBet(side, selectedChip);
    }
  };

  // Chip selection component
  const ChipSelector = () => {
    const chips = [50000, 100000, 500000, 1000000]; // ₹50k, ₹1L, ₹5L, ₹10L
    
    return (
      <div className="chip-selector flex gap-2 mb-4">
        {chips.map((chipValue) => (
          <button
            key={chipValue}
            className={`chip px-4 py-2 rounded-lg font-bold ${
              selectedChip === chipValue
                ? 'bg-yellow-500 text-black border-2 border-yellow-300'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
            onClick={() => setSelectedChip(chipValue)}
          >
            ₹{chipValue.toLocaleString()}
          </button>
        ))}
      </div>
    );
  };

  // Determine if betting is currently allowed
  const bettingAllowed = ['betting', 'BETTING_R1', 'BETTING_R2'].includes(phase as string);

  return (
    <div className="player-game min-h-screen bg-gradient-to-b from-green-900 to-green-700 p-4 text-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="header flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Andar Bahar</h1>
          <div className="wallet-info bg-green-800 px-4 py-2 rounded-lg">
            <span className="text-sm">Wallet: </span>
            <span className="font-bold">₹{gameState.playerWallet?.toLocaleString() || '0'}</span>
          </div>
        </div>

        {/* Connection status */}
        <div className="mb-4 text-center">
          <span className={`px-3 py-1 rounded-full text-sm ${
            connectionState.isConnected 
              ? 'bg-green-600' 
              : connectionState.isConnecting 
                ? 'bg-yellow-600' 
                : 'bg-red-600'
          }`}>
            {connectionState.isConnected 
              ? 'Connected' 
              : connectionState.isConnecting 
                ? 'Connecting...' 
                : 'Disconnected'
            }
          </span>
        </div>

        {/* Game Phase Display */}
        <div className="mb-6 text-center">
          <div className="bg-gray-800 px-4 py-2 rounded-lg inline-block">
            <span className="font-bold">Phase: </span>
            <span className="text-xl">
              {phase === 'idle' && 'Game Idle'}
              {phase === 'opening' && 'Selecting Opening Card'}
              {phase === 'betting' && 'Betting Open'}
              {phase === 'dealing' && 'Dealing Cards'}
              {phase === 'complete' && 'Game Complete'}
              {phase === 'BETTING_R1' && 'Round 1 Betting'}
              {phase === 'DEALING_R1' && 'Round 1 Dealing'}
              {phase === 'BETTING_R2' && 'Round 2 Betting'}
              {phase === 'DEALING_R2' && 'Round 2 Dealing'}
              {phase === 'CONTINUOUS_DRAW' && 'Continuous Draw'}
            </span>
          </div>
        </div>

        {/* Timer Display */}
        {(phase === 'betting' || phase === 'BETTING_R1' || phase === 'BETTING_R2') && (
          <div className="timer-display text-center mb-6">
            <div className="bg-red-600 text-white px-6 py-3 rounded-lg inline-block">
              <span className="text-2xl font-bold">Time Left: {gameState.countdownTimer}s</span>
            </div>
          </div>
        )}

        {/* Opening Card Display */}
        {gameState.selectedOpeningCard && (
          <div className="opening-card-display mb-8">
            <div className="flex justify-center">
              <div className="card bg-white text-black px-8 py-4 rounded-lg shadow-lg">
                <div className="text-4xl font-bold">{gameState.selectedOpeningCard.display}</div>
              </div>
            </div>
            <div className="text-center mt-2">
              <span className="text-lg">Opening Card</span>
            </div>
          </div>
        )}

        {/* Round 1 Locked Bets Display */}
        {gameState.currentRound > 1 && (
          <div className="round1-locked-bets bg-gray-800 p-4 rounded-lg mb-4">
            <h3 className="text-lg font-semibold mb-2">Round 1 Locked Bets</h3>
            <div className="flex justify-between">
              <div className="bg-red-800 px-3 py-2 rounded">
                <span>Andar: ₹{gameState.round1PlayerBets.andar.toLocaleString()}</span>
              </div>
              <div className="bg-blue-800 px-3 py-2 rounded">
                <span>Bahar: ₹{gameState.round1PlayerBets.bahar.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Betting Area */}
        <div className="betting-area grid grid-cols-2 gap-8 mb-8">
          {/* Andar Side */}
          <div className="andar-side bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-center">ANDAR</h2>
            <div className="betting-buttons flex flex-col gap-3 mb-4">
              <ChipSelector />
              <button
                onClick={() => handlePlaceBet('andar')}
                disabled={!bettingAllowed || gameState.playerWallet < selectedChip}
                className={`bet-andar ${
                  bettingAllowed ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600'
                } text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Place Bet on Andar
              </button>
            </div>
            <div className="total-bets bg-red-800 p-3 rounded-lg">
              <div className="text-center">Total Andar Bets: ₹{gameState.playerBets?.andar?.toLocaleString() || 0}</div>
            </div>
            
            {/* Andar Cards */}
            <div className="dealt-cards mt-4">
              <h3 className="text-lg font-semibold mb-2">Dealt Cards</h3>
              <div className="flex flex-wrap gap-2">
                {gameState.andarCards.map((card, index) => (
                  <div key={index} className="card bg-white text-black px-3 py-2 rounded text-sm">
                    {card.display}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bahar Side */}
          <div className="bahar-side bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-center">BAHAR</h2>
            <div className="betting-buttons flex flex-col gap-3 mb-4">
              <ChipSelector />
              <button
                onClick={() => handlePlaceBet('bahar')}
                disabled={!bettingAllowed || gameState.playerWallet < selectedChip}
                className={`bet-bahar ${
                  bettingAllowed ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600'
                } text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Place Bet on Bahar
              </button>
            </div>
            <div className="total-bets bg-blue-800 p-3 rounded-lg">
              <div className="text-center">Total Bahar Bets: ₹{gameState.playerBets?.bahar?.toLocaleString() || 0}</div>
            </div>
            
            {/* Bahar Cards */}
            <div className="dealt-cards mt-4">
              <h3 className="text-lg font-semibold mb-2">Dealt Cards</h3>
              <div className="flex flex-wrap gap-2">
                {gameState.baharCards.map((card, index) => (
                  <div key={index} className="card bg-white text-black px-3 py-2 rounded text-sm">
                    {card.display}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Game Winner Display */}
        {phase === 'complete' && gameState.gameWinner && (
          <div className="winner-display text-center mb-6">
            <div className="bg-green-700 text-white px-8 py-4 rounded-lg inline-block">
              <h2 className="text-3xl font-bold">WINNER: {gameState.gameWinner.toUpperCase()}</h2>
              {gameState.winningCard && (
                <p className="mt-2">Winning Card: {gameState.winningCard.display}</p>
              )}
              <p>Won in Round: {gameState.currentRound}</p>
            </div>
          </div>
        )}

        {/* Game Stats */}
        <div className="game-stats bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2">Game Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>Current Round: {gameState.currentRound}</p>
              <p>Opening Card: {gameState.selectedOpeningCard?.display || 'Not Set'}</p>
            </div>
            <div>
              <p>Player Role: {gameState.userRole}</p>
              <p>Game Active: {gameState.isGameActive ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePage;
