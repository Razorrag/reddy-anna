import React, { useState } from 'react';
import './SettingsModal.css';

const SettingsModal = ({ onClose }) => {
  const [settings, setSettings] = useState({
    gameDuration: 30,
    autoDeal: false,
    soundEnabled: true,
    bettingTime: 15,
    minBet: 100,
    maxBet: 50000
  });

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    // Save settings to backend or local storage
    localStorage.setItem('gameSettings', JSON.stringify(settings));
    onClose();
  };

  const handleReset = () => {
    const defaultSettings = {
      gameDuration: 30,
      autoDeal: false,
      soundEnabled: true,
      bettingTime: 15,
      minBet: 100,
      maxBet: 50000
    };
    setSettings(defaultSettings);
  };

  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal">
        <div className="settings-modal-header">
          <h2>Game Settings</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="settings-modal-body">
          <div className="setting-group">
            <label>Game Duration (seconds)</label>
            <input
              type="number"
              min="10"
              max="120"
              value={settings.gameDuration}
              onChange={(e) => handleChange('gameDuration', parseInt(e.target.value))}
            />
          </div>
          
          <div className="setting-group">
            <label>Betting Time (seconds)</label>
            <input
              type="number"
              min="5"
              max="60"
              value={settings.bettingTime}
              onChange={(e) => handleChange('bettingTime', parseInt(e.target.value))}
            />
          </div>
          
          <div className="setting-group">
            <label>Minimum Bet (₹)</label>
            <input
              type="number"
              min="10"
              max="10000"
              step="10"
              value={settings.minBet}
              onChange={(e) => handleChange('minBet', parseInt(e.target.value))}
            />
          </div>
          
          <div className="setting-group">
            <label>Maximum Bet (₹)</label>
            <input
              type="number"
              min="1000"
              max="100000"
              step="1000"
              value={settings.maxBet}
              onChange={(e) => handleChange('maxBet', parseInt(e.target.value))}
            />
          </div>
          
          <div className="setting-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={settings.autoDeal}
                onChange={(e) => handleChange('autoDeal', e.target.checked)}
              />
              Auto Deal Cards
            </label>
          </div>
          
          <div className="setting-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => handleChange('soundEnabled', e.target.checked)}
              />
              Enable Sound Effects
            </label>
          </div>
        </div>
        
        <div className="settings-modal-footer">
          <button className="btn btn-secondary" onClick={handleReset}>Reset to Default</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;