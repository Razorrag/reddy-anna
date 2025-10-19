import React, { useEffect, useRef, useState } from 'react';
import { useGameState } from '../../contexts/GameStateContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import type { BetSide } from '@/types/game';

interface MockPlayer {
  id: string;
  name: string;
  avatar: string;
}

const MockBettingSimulation: React.FC = () => {
  const { 
    gameState, 
    updateTotalBets, 
    updateRoundBets
  } = useGameState();
  const { sendWebSocketMessage } = useWebSocket();
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Mock player data
  const mockPlayers: MockPlayer[] = [
    { id: 'player_1', name: 'Rahul_123', avatar: '👨' },
    { id: 'player_2', name: 'Priya_456', avatar: '👩' },
    { id: 'player_3', name: 'Amit_789', avatar: '👨‍💼' },
    { id: 'player_4', name: 'Neha_321', avatar: '👩‍💼' },
    { id: 'player_5', name: 'Vikram_654', avatar: '👨‍🎓' },
    { id: 'player_6', name: 'Anjali_987', avatar: '👩‍🎓' },
    { id: 'player_7', name: 'Rohan_147', avatar: '👨‍🏫' },
    { id: 'player_8', name: 'Kavita_258', avatar: '👩‍🏫' },
  ];
  
  // Bet amounts (in rupees)
  const betAmounts = [1000, 2500, 5000, 10000, 20000, 30000, 40000, 50000];
  
  // Start simulation when betting phase begins
  useEffect(() => {
    if (gameState.phase === 'betting' && gameState.countdownTimer > 0 && !isSimulating) {
      startSimulation();
    } else if (gameState.phase !== 'betting' && isSimulating) {
      stopSimulation();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [gameState.phase, gameState.countdownTimer, isSimulating]);
  
  const startSimulation = () => {
    setIsSimulating(true);
    
    // Generate random bets every 1-3 seconds
    const placeRandomBet = () => {
      if (gameState.phase !== 'betting' || gameState.countdownTimer <= 0) {
        stopSimulation();
        return;
      }
      
      // Random player
      const player = mockPlayers[Math.floor(Math.random() * mockPlayers.length)];
      
      // Random side (slight preference for Andar)
      const side: BetSide = Math.random() < 0.45 ? 'bahar' : 'andar';
      
      // Random bet amount (weighted towards smaller amounts)
      const weights = [0.3, 0.25, 0.2, 0.15, 0.05, 0.03, 0.015, 0.005];
      const randomValue = Math.random();
      let cumulative = 0;
      let selectedAmount = betAmounts[0];
      
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (randomValue <= cumulative) {
          selectedAmount = betAmounts[i];
          break;
        }
      }
      
      // Update local state immediately
      const currentAndar = gameState.andarTotalBet;
      const currentBahar = gameState.baharTotalBet;
      const newAndar = side === 'andar' ? currentAndar + selectedAmount : currentAndar;
      const newBahar = side === 'bahar' ? currentBahar + selectedAmount : currentBahar;
      
      updateTotalBets({ andar: newAndar, bahar: newBahar });
      
      // Update round-specific bets
      if (gameState.currentRound === 1) {
        const currentRound1Bets = gameState.round1Bets;
        updateRoundBets(1, {
          andar: side === 'andar' ? currentRound1Bets.andar + selectedAmount : currentRound1Bets.andar,
          bahar: side === 'bahar' ? currentRound1Bets.bahar + selectedAmount : currentRound1Bets.bahar
        });
      } else if (gameState.currentRound === 2) {
        const currentRound2Bets = gameState.round2Bets;
        updateRoundBets(2, {
          andar: side === 'andar' ? currentRound2Bets.andar + selectedAmount : currentRound2Bets.andar,
          bahar: side === 'bahar' ? currentRound2Bets.bahar + selectedAmount : currentRound2Bets.bahar
        });
      }
      
      // Send WebSocket message (for real-time sync)
      sendWebSocketMessage({
        type: 'bet_placed',
        data: {
          playerId: player.id,
          playerName: player.name,
          side: side,
          amount: selectedAmount,
          round: gameState.currentRound,
          gameId: 'default-game'
        }
      });
      
      console.log(`Mock bet: ${player.name} bet ₹${selectedAmount} on ${side}`);
    };
    
    // Place initial bets immediately
    setTimeout(placeRandomBet, 500);
    setTimeout(placeRandomBet, 1200);
    setTimeout(placeRandomBet, 2000);
    
    // Continue placing bets at random intervals
    intervalRef.current = setInterval(() => {
      const delay = Math.random() * 2000 + 1000; // 1-3 seconds
      setTimeout(placeRandomBet, delay);
    }, 2500);
  };
  
  const stopSimulation = () => {
    setIsSimulating(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
  
  // This component doesn't render anything visible
  // It just runs the simulation in the background
  return null;
};

export default MockBettingSimulation;
