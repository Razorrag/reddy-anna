import React, { useState, useEffect } from 'react';
import { useGameState } from '../../contexts/GameStateContext';

interface CountdownTimerProps {
  timeLeft?: number;
  duration?: number;
  onTimeout?: () => void;
  showProgress?: boolean;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ 
  timeLeft: propTimeLeft, 
  duration = 30, 
  onTimeout, 
  showProgress = true 
}) => {
  const { gameState } = useGameState();
  const [timeLeft, setTimeLeft] = useState(propTimeLeft !== undefined ? propTimeLeft : gameState.countdownTimer);

  // Update timeLeft when prop or gameState changes
  useEffect(() => {
    setTimeLeft(propTimeLeft !== undefined ? propTimeLeft : gameState.countdownTimer);
  }, [propTimeLeft, gameState.countdownTimer]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (onTimeout) onTimeout();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, onTimeout]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (): string => {
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
      {showProgress && (
        <div 
          className="countdown-progress"
          style={{
            width: '100%',
            height: '4px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: '2px',
            marginTop: '8px',
            overflow: 'hidden'
          }}
        >
          <div 
            className="countdown-progress-bar"
            style={{
              width: `${(timeLeft / duration) * 100}%`,
              height: '100%',
              backgroundColor: getTimeColor(),
              transition: 'width 1s linear, background-color 0.5s ease'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default CountdownTimer;