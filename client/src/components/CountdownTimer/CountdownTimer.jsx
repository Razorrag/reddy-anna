import React, { useState, useEffect } from 'react';
import { useGameState } from '../../contexts/GameStateContext';

const CountdownTimer = () => {
  const { gameState } = useGameState();
  const [timeLeft, setTimeLeft] = useState(gameState.countdownTimer);

  useEffect(() => {
    setTimeLeft(gameState.countdownTimer);
  }, [gameState.countdownTimer]);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeLeft > 20) return '#28a745';
    if (timeLeft > 10) return '#ffc107';
    return '#dc3545';
  };

  return (
    <div 
      className="countdown-timer"
      style={{ 
        color: getTimeColor(),
        fontSize: '2rem',
        fontWeight: 'bold',
        fontFamily: 'Poppins, sans-serif',
        textShadow: '0 0 10px rgba(0,0,0,0.5)'
      }}
    >
      {formatTime(timeLeft)}
    </div>
  );
};

export default CountdownTimer;