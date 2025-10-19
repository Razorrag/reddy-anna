import React, { useState, useEffect, useCallback } from 'react';
import { Eye, DollarSign, TrendingUp, Play, Pause, RefreshCw } from 'lucide-react';
import type { LiveSimulationSettings } from '@/types/game';
import './LiveStreamSimulation.css';

interface LiveStreamSimulationProps {
  isGameActive: boolean;
  onSettingsChange?: (settings: LiveSimulationSettings) => void;
}

const LiveStreamSimulation: React.FC<LiveStreamSimulationProps> = ({
  isGameActive,
  onSettingsChange
}) => {
  const [simulationSettings, setSimulationSettings] = useState<LiveSimulationSettings>({
    viewers: { min: 1000, max: 2000, current: 1234 },
    betAmount: { min: 1000, max: 10000, current: 5000 },
    winAmount: { min: 2000, max: 20000, current: 10000 }
  });

  const [isSimulating, setIsSimulating] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Load saved settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('simulationSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSimulationSettings(parsed);
      onSettingsChange?.(parsed);
    }
  }, [onSettingsChange]);

  // Save settings when they change
  useEffect(() => {
    localStorage.setItem('simulationSettings', JSON.stringify(simulationSettings));
    onSettingsChange?.(simulationSettings);
  }, [simulationSettings, onSettingsChange]);

  // Generate random value within range
  const getRandomValue = useCallback((min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }, []);

  // Simulate live data updates
  useEffect(() => {
    if (!isSimulating || !isGameActive) return;

    const interval = setInterval(() => {
      setSimulationSettings(prev => {
        const newViewers = getRandomValue(prev.viewers.min, prev.viewers.max);
        const newBetAmount = getRandomValue(prev.betAmount.min, prev.betAmount.max);
        const newWinAmount = getRandomValue(prev.winAmount.min, prev.winAmount.max);

        const updated = {
          viewers: { ...prev.viewers, current: newViewers },
          betAmount: { ...prev.betAmount, current: newBetAmount },
          winAmount: { ...prev.winAmount, current: newWinAmount }
        };

        setLastUpdate(Date.now());
        return updated;
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, [isSimulating, isGameActive, getRandomValue]);

  // Handle input changes
  const handleInputChange = (category: keyof LiveSimulationSettings, field: 'min' | 'max', value: string) => {
    const numValue = parseInt(value) || 0;
    
    setSimulationSettings(prev => {
      const updated = {
        ...prev,
        [category]: {
          ...prev[category],
          [field]: numValue
        }
      };

      // Ensure min <= max
      if (field === 'min' && numValue > prev[category].max) {
        updated[category].max = numValue;
      } else if (field === 'max' && numValue < prev[category].min) {
        updated[category].min = numValue;
      }

      return updated;
    });
  };

  // Toggle simulation
  const toggleSimulation = () => {
    setIsSimulating(prev => !prev);
  };

  // Reset to defaults
  const resetToDefaults = () => {
    const defaults: LiveSimulationSettings = {
      viewers: { min: 1000, max: 2000, current: 1234 },
      betAmount: { min: 1000, max: 10000, current: 5000 },
      winAmount: { min: 2000, max: 20000, current: 10000 }
    };
    setSimulationSettings(defaults);
  };

  // Format time since last update
  const getTimeSinceUpdate = () => {
    const seconds = Math.floor((Date.now() - lastUpdate) / 1000);
    return seconds < 60 ? `${seconds}s ago` : `${Math.floor(seconds / 60)}m ago`;
  };

  return (
    <div className="live-stream-simulation">
      <div className="simulation-header">
        <h2>
          <TrendingUp className="header-icon" />
          Live Stream Simulation
        </h2>
        <div className="simulation-controls">
          <button
            className={`control-btn ${isSimulating ? 'active' : 'paused'}`}
            onClick={toggleSimulation}
          >
            {isSimulating ? <Pause /> : <Play />}
            {isSimulating ? 'Pause' : 'Start'}
          </button>
          <button className="control-btn reset" onClick={resetToDefaults}>
            <RefreshCw />
            Reset
          </button>
        </div>
      </div>

      <div className="simulation-grid">
        {/* Live Stream Watching Box */}
        <div className="simulation-box viewers-box">
          <div className="box-header">
            <div className="box-icon viewers-icon">
              <Eye />
            </div>
            <h3>Live Stream Watching</h3>
            {isSimulating && isGameActive && (
              <div className="live-indicator">
                <div className="live-dot"></div>
                <span>LIVE</span>
              </div>
            )}
          </div>
          
          <div className="simulation-display">
            <div className="current-value">
              <span className="value-number">{simulationSettings.viewers.current.toLocaleString()}</span>
              <span className="value-label">Live Viewers</span>
            </div>
            
            <div className="value-trend">
              {simulationSettings.viewers.current > 1500 ? (
                <span className="trend-up">↑ Growing</span>
              ) : simulationSettings.viewers.current < 1200 ? (
                <span className="trend-down">↓ Declining</span>
              ) : (
                <span className="trend-stable">→ Stable</span>
              )}
            </div>
          </div>
          
          <div className="range-controls">
            <div className="range-inputs">
              <div className="input-group">
                <label>Min</label>
                <input
                  type="number"
                  value={simulationSettings.viewers.min}
                  onChange={(e) => handleInputChange('viewers', 'min', e.target.value)}
                  disabled={isSimulating}
                />
              </div>
              <div className="input-group">
                <label>Max</label>
                <input
                  type="number"
                  value={simulationSettings.viewers.max}
                  onChange={(e) => handleInputChange('viewers', 'max', e.target.value)}
                  disabled={isSimulating}
                />
              </div>
            </div>
            
            <div className="range-bar">
              <div 
                className="range-fill viewers-fill"
                style={{
                  left: `${((simulationSettings.viewers.current - simulationSettings.viewers.min) / (simulationSettings.viewers.max - simulationSettings.viewers.min)) * 100}%`
                }}
              ></div>
            </div>
          </div>
          
          <div className="update-info">
            <span className="update-time">Updated {getTimeSinceUpdate()}</span>
          </div>
        </div>

        {/* Bet Amount Box */}
        <div className="simulation-box bet-box">
          <div className="box-header">
            <div className="box-icon bet-icon">
              <DollarSign />
            </div>
            <h3>Bet Amount</h3>
            {isSimulating && isGameActive && (
              <div className="live-indicator">
                <div className="live-dot"></div>
                <span>LIVE</span>
              </div>
            )}
          </div>
          
          <div className="simulation-display">
            <div className="current-value">
              <span className="value-number">₹{simulationSettings.betAmount.current.toLocaleString('en-IN')}</span>
              <span className="value-label">Current Bet</span>
            </div>
            
            <div className="value-trend">
              {simulationSettings.betAmount.current > 7500 ? (
                <span className="trend-up">↑ High Activity</span>
              ) : simulationSettings.betAmount.current < 3000 ? (
                <span className="trend-down">↓ Low Activity</span>
              ) : (
                <span className="trend-stable">→ Normal</span>
              )}
            </div>
          </div>
          
          <div className="range-controls">
            <div className="range-inputs">
              <div className="input-group">
                <label>Min</label>
                <input
                  type="number"
                  value={simulationSettings.betAmount.min}
                  onChange={(e) => handleInputChange('betAmount', 'min', e.target.value)}
                  disabled={isSimulating}
                />
              </div>
              <div className="input-group">
                <label>Max</label>
                <input
                  type="number"
                  value={simulationSettings.betAmount.max}
                  onChange={(e) => handleInputChange('betAmount', 'max', e.target.value)}
                  disabled={isSimulating}
                />
              </div>
            </div>
            
            <div className="range-bar">
              <div 
                className="range-fill bet-fill"
                style={{
                  left: `${((simulationSettings.betAmount.current - simulationSettings.betAmount.min) / (simulationSettings.betAmount.max - simulationSettings.betAmount.min)) * 100}%`
                }}
              ></div>
            </div>
          </div>
          
          <div className="update-info">
            <span className="update-time">Updated {getTimeSinceUpdate()}</span>
          </div>
        </div>

        {/* Win Amount Box */}
        <div className="simulation-box win-box">
          <div className="box-header">
            <div className="box-icon win-icon">
              <TrendingUp />
            </div>
            <h3>Win Amount</h3>
            {isSimulating && isGameActive && (
              <div className="live-indicator">
                <div className="live-dot"></div>
                <span>LIVE</span>
              </div>
            )}
          </div>
          
          <div className="simulation-display">
            <div className="current-value">
              <span className="value-number">₹{simulationSettings.winAmount.current.toLocaleString('en-IN')}</span>
              <span className="value-label">Current Win</span>
            </div>
            
            <div className="value-trend">
              {simulationSettings.winAmount.current > 15000 ? (
                <span className="trend-up">↑ Big Wins</span>
              ) : simulationSettings.winAmount.current < 5000 ? (
                <span className="trend-down">↓ Small Wins</span>
              ) : (
                <span className="trend-stable">→ Average</span>
              )}
            </div>
          </div>
          
          <div className="range-controls">
            <div className="range-inputs">
              <div className="input-group">
                <label>Min</label>
                <input
                  type="number"
                  value={simulationSettings.winAmount.min}
                  onChange={(e) => handleInputChange('winAmount', 'min', e.target.value)}
                  disabled={isSimulating}
                />
              </div>
              <div className="input-group">
                <label>Max</label>
                <input
                  type="number"
                  value={simulationSettings.winAmount.max}
                  onChange={(e) => handleInputChange('winAmount', 'max', e.target.value)}
                  disabled={isSimulating}
                />
              </div>
            </div>
            
            <div className="range-bar">
              <div 
                className="range-fill win-fill"
                style={{
                  left: `${((simulationSettings.winAmount.current - simulationSettings.winAmount.min) / (simulationSettings.winAmount.max - simulationSettings.winAmount.min)) * 100}%`
                }}
              ></div>
            </div>
          </div>
          
          <div className="update-info">
            <span className="update-time">Updated {getTimeSinceUpdate()}</span>
          </div>
        </div>
      </div>

      <div className="simulation-status">
        <div className="status-info">
          <span className="status-text">
            Simulation is <strong>{isSimulating ? (isGameActive ? 'Active' : 'Paused - Game Inactive') : 'Stopped'}</strong>
          </span>
          {isSimulating && isGameActive && (
            <span className="update-frequency">Updates every 3 seconds</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveStreamSimulation;
