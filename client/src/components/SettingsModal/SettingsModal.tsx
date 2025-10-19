import React, { useState, useEffect } from 'react';
import { Settings, AlertCircle, CheckCircle } from 'lucide-react';
import type { GameSettings, StreamSettings } from '@/types/game';
import './SettingsModal.css';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  // Game Settings
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    maxBetAmount: 50000,
    minBetAmount: 1000,
    timer: 30,
    openingCard: null
  });

  // Stream Settings
  const [streamSettings, setStreamSettings] = useState<StreamSettings>({
    streamType: 'video',
    streamUrl: '/hero images/uhd_30fps.mp4',
    rtmpUrl: 'rtmp://localhost:1935/live',
    rtmpStreamKey: 'streamKey',
    streamTitle: 'Andar Bahar Live',
    streamStatus: 'live',
    streamDescription: 'Live Andar Bahar Game',
    streamQuality: 'auto',
    streamDelay: 5,
    backupStreamUrl: '',
    embedCode: ''
  });


  // All possible cards for dropdown
  const allCards = [
    'A♠', '2♠', '3♠', '4♠', '5♠', '6♠', '7♠', '8♠', '9♠', '10♠', 'J♠', 'Q♠', 'K♠',
    'A♥', '2♥', '3♥', '4♥', '5♥', '6♥', '7♥', '8♥', '9♥', '10♥', 'J♥', 'Q♥', 'K♥',
    'A♦', '2♦', '3♦', '4♦', '5♦', '6♦', '7♦', '8♦', '9♦', '10♦', 'J♦', 'Q♦', 'K♦',
    'A♣', '2♣', '3♣', '4♣', '5♣', '6♣', '7♣', '8♣', '9♣', '10♣', 'J♣', 'Q♣', 'K♣'
  ];

  // Load saved settings on mount
  useEffect(() => {
    const savedGameSettings = localStorage.getItem('gameSettings');
    if (savedGameSettings) {
      setGameSettings(JSON.parse(savedGameSettings));
    }
    
    const savedStreamSettings = localStorage.getItem('streamSettings');
    if (savedStreamSettings) {
      setStreamSettings(JSON.parse(savedStreamSettings));
    }

    const savedSimulationSettings = localStorage.getItem('simulationSettings');
    if (savedSimulationSettings) {
      setSimulationSettings(JSON.parse(savedSimulationSettings));
    }
  }, []);

  // Save settings
  const handleSave = () => {
    localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
    localStorage.setItem('streamSettings', JSON.stringify(streamSettings));
    localStorage.setItem('simulationSettings', JSON.stringify(simulationSettings));
    
    // Here you would also send to backend
    fetch('/api/game/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameSettings, streamSettings })
    }).catch(err => console.error('Failed to save settings:', err));
    
    onClose();
  };

  // Reset to defaults
  const handleReset = () => {
    const defaultGameSettings: GameSettings = {
      maxBetAmount: 50000,
      minBetAmount: 1000,
      timer: 30,
      openingCard: null
    };
    
    const defaultStreamSettings: StreamSettings = {
      streamType: 'video',
      streamUrl: '/hero images/uhd_30fps.mp4',
      rtmpUrl: 'rtmp://localhost:1935/live',
      rtmpStreamKey: 'streamKey',
      streamTitle: 'Andar Bahar Live',
      streamStatus: 'live',
      streamDescription: 'Live Andar Bahar Game',
      streamQuality: 'auto',
      streamDelay: 5,
      backupStreamUrl: '',
      embedCode: ''
    };

    const defaultSimulationSettings: LiveSimulationSettings = {
      viewers: { min: 1000, max: 2000, current: 1234 },
      betAmount: { min: 1000, max: 10000, current: 5000 },
      winAmount: { min: 2000, max: 20000, current: 10000 }
    };
    
    setGameSettings(defaultGameSettings);
    setStreamSettings(defaultStreamSettings);
    setSimulationSettings(defaultSimulationSettings);
  };

  // Get stream preview URL
  const getStreamPreviewUrl = () => {
    switch (streamSettings.streamType) {
      case 'rtmp':
        return streamSettings.streamUrl.replace('rtmp://', 'http://').replace(':1935', ':8000') + '.m3u8';
      case 'embed':
        return streamSettings.embedCode;
      default:
        return streamSettings.streamUrl;
    }
  };

  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal">
        <div className="settings-modal-header">
          <h2><Settings className="inline-icon" /> Game Administration Settings</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="settings-modal-body">
          {/* Game Settings Section */}
          <div className="settings-section">
            <h3>🎮 Game Settings</h3>
            <div className="settings-grid">
              <div className="setting-group">
                <label>Max Bet Amount (₹)</label>
                <input
                  type="number"
                  min="1000"
                  max="100000"
                  step="1000"
                  value={gameSettings.maxBetAmount}
                  onChange={(e) => setGameSettings(prev => ({ ...prev, maxBetAmount: parseInt(e.target.value) || 50000 }))}
                />
              </div>
              
              <div className="setting-group">
                <label>Min Bet Amount (₹)</label>
                <input
                  type="number"
                  min="100"
                  max="10000"
                  step="100"
                  value={gameSettings.minBetAmount}
                  onChange={(e) => setGameSettings(prev => ({ ...prev, minBetAmount: parseInt(e.target.value) || 1000 }))}
                />
              </div>
              
              <div className="setting-group">
                <label>Game Timer (seconds)</label>
                <input
                  type="number"
                  min="10"
                  max="120"
                  value={gameSettings.timer}
                  onChange={(e) => setGameSettings(prev => ({ ...prev, timer: parseInt(e.target.value) || 30 }))}
                />
              </div>
              
              <div className="setting-group">
                <label>Opening Card (Manual Selection)</label>
                <select
                  value={gameSettings.openingCard || ''}
                  onChange={(e) => setGameSettings(prev => ({ ...prev, openingCard: e.target.value || null }))}
                >
                  <option value="">Auto Select</option>
                  {allCards.map(card => (
                    <option key={card} value={card}>{card}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Live Stream Management Section */}
          <div className="settings-section">
            <h3>📹 Live Stream Management</h3>
            <div className="settings-grid">
              <div className="setting-group full-width">
                <label>Live Stream URL</label>
                <input
                  type="text"
                  placeholder="rtmp://localhost:1935/live/streamKey"
                  value={streamSettings.streamUrl}
                  onChange={(e) => setStreamSettings(prev => ({ ...prev, streamUrl: e.target.value }))}
                />
              </div>
              
              <div className="setting-group">
                <label>Stream Title</label>
                <input
                  type="text"
                  value={streamSettings.streamTitle}
                  onChange={(e) => setStreamSettings(prev => ({ ...prev, streamTitle: e.target.value }))}
                />
              </div>
              
              <div className="setting-group">
                <label>Stream Status</label>
                <select
                  value={streamSettings.streamStatus}
                  onChange={(e) => setStreamSettings(prev => ({ ...prev, streamStatus: e.target.value as any }))}
                >
                  <option value="live">🔴 Live</option>
                  <option value="offline">⚫ Offline</option>
                  <option value="maintenance">🟡 Maintenance</option>
                </select>
              </div>
              
              <div className="setting-group full-width">
                <label>Stream Description</label>
                <textarea
                  rows={2}
                  value={streamSettings.streamDescription}
                  onChange={(e) => setStreamSettings(prev => ({ ...prev, streamDescription: e.target.value }))}
                />
              </div>
              
              <div className="setting-group">
                <label>Stream Quality</label>
                <select
                  value={streamSettings.streamQuality}
                  onChange={(e) => setStreamSettings(prev => ({ ...prev, streamQuality: e.target.value as any }))}
                >
                  <option value="auto">Auto</option>
                  <option value="1080p">1080p</option>
                  <option value="720p">720p</option>
                  <option value="480p">480p</option>
                  <option value="360p">360p</option>
                </select>
              </div>
              
              <div className="setting-group">
                <label>Stream Delay (seconds)</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={streamSettings.streamDelay}
                  onChange={(e) => setStreamSettings(prev => ({ ...prev, streamDelay: parseInt(e.target.value) || 0 }))}
                />
              </div>
              
              <div className="setting-group full-width">
                <label>Backup Stream URL</label>
                <input
                  type="text"
                  placeholder="Backup stream URL for failover"
                  value={streamSettings.backupStreamUrl}
                  onChange={(e) => setStreamSettings(prev => ({ ...prev, backupStreamUrl: e.target.value }))}
                />
              </div>
              
              <div className="setting-group full-width">
                <label>Embed Code</label>
                <textarea
                  rows={3}
                  placeholder='<iframe src="..." width="640" height="360"></iframe>'
                  value={streamSettings.embedCode}
                  onChange={(e) => setStreamSettings(prev => ({ ...prev, embedCode: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Stream Preview Section */}
          <div className="settings-section">
            <h3>👁️ Stream Preview</h3>
            <div className="stream-preview">
              {streamSettings.streamType === 'embed' && streamSettings.embedCode ? (
                <div dangerouslySetInnerHTML={{ __html: streamSettings.embedCode }} />
              ) : (
                <video
                  src={getStreamPreviewUrl()}
                  autoPlay
                  muted
                  loop
                  style={{ width: '100%', height: '300px', background: '#000', borderRadius: '8px' }}
                />
              )}
            </div>
          </div>

          {/* Embed Code Preview Section */}
          {streamSettings.embedCode && (
            <div className="settings-section">
              <h3>📋 Embed Code Preview</h3>
              <div className="embed-preview">
                <div dangerouslySetInnerHTML={{ __html: streamSettings.embedCode }} />
              </div>
            </div>
          )}

        </div>
        
        <div className="settings-modal-footer">
          <button className="btn btn-secondary" onClick={handleReset}>
            <AlertCircle /> Reset to Default
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <CheckCircle /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
