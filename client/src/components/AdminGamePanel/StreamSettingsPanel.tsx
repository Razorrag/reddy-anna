/**
 * StreamSettingsPanel - Professional Streaming Configuration Panel
 * 
 * Features:
 * - Restream.io configuration management
 * - RTMP credentials display (read-only)
 * - Stream status monitoring
 * - Fallback settings
 * - Real-time stream testing
 */

import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';

interface StreamSettings {
  streamUrl: string;
  streamType: 'video' | 'rtmp' | 'embed';
  streamTitle: string;
  streamProvider: string;
  restreamEmbedToken: string;
  restreamRtmpUrl: string;
  restreamStreamKey: string;
  restreamBackupUrl: string;
  enableFallback: boolean;
  streamStatus: 'live' | 'offline' | 'error';
  streamViewers: string;
  streamBitrate: string;
  lastStreamCheck: string;
}

const StreamSettingsPanel: React.FC = () => {
  const { showNotification } = useNotification();
  const [settings, setSettings] = useState<StreamSettings>({
    streamUrl: 'https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1',
    streamType: 'embed',
    streamTitle: 'Andar Bahar Live - Powered by Restream',
    streamProvider: 'restream',
    restreamEmbedToken: '2123471e69ed8bf8cb11cd207c282b1',
    restreamRtmpUrl: 'rtmps://live.restream.io:1937/live',
    restreamStreamKey: 're_10541509_eventd4960ba1734c49369fc0d114295801a0',
    restreamBackupUrl: 'https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1',
    enableFallback: true,
    streamStatus: 'offline',
    streamViewers: '0',
    streamBitrate: '0',
    lastStreamCheck: new Date().toISOString()
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showRtmpKey, setShowRtmpKey] = useState(false);

  // Load current settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/game/stream-settings');
      const data = await response.json();
      
      setSettings(prev => ({
        ...prev,
        ...data,
        restreamEmbedToken: data.restreamEmbedToken || '2123471e69ed8bf8cb11cd207c282b1',
        restreamRtmpUrl: data.restreamRtmpUrl || 'rtmps://live.restream.io:1937/live',
        restreamStreamKey: data.restreamStreamKey || 're_10541509_eventd4960ba1734c49369fc0d114295801a0',
        restreamBackupUrl: data.restreamBackupUrl || data.streamUrl
      }));
    } catch (error) {
      console.error('Failed to load stream settings:', error);
      showNotification('❌ Failed to load stream settings', 'error');
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/game/stream-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamUrl: settings.streamUrl,
          streamType: settings.streamType,
          streamTitle: settings.streamTitle,
          streamProvider: settings.streamProvider,
          restreamEmbedToken: settings.restreamEmbedToken,
          restreamBackupUrl: settings.restreamBackupUrl,
          enableFallback: settings.enableFallback
        }),
      });

      if (response.ok) {
        showNotification('✅ Stream settings saved successfully', 'success');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save stream settings:', error);
      showNotification('❌ Failed to save stream settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const testStream = async () => {
    setIsTesting(true);
    try {
      // Test if the stream URL is accessible
      const response = await fetch(settings.streamUrl, { method: 'HEAD' });
      
      if (response.ok) {
        showNotification('✅ Stream test successful - URL is accessible', 'success');
        setSettings(prev => ({ ...prev, streamStatus: 'live' }));
      } else {
        showNotification('⚠️ Stream test failed - URL not accessible', 'warning');
        setSettings(prev => ({ ...prev, streamStatus: 'error' }));
      }
    } catch (error) {
      showNotification('❌ Stream test failed - Network error', 'error');
      setSettings(prev => ({ ...prev, streamStatus: 'error' }));
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showNotification(`📋 ${label} copied to clipboard`, 'success');
  };

  const copyAllRtmpSettings = () => {
    const fullRtmpUrl = `${settings.restreamRtmpUrl}/${settings.restreamStreamKey}`;
    navigator.clipboard.writeText(fullRtmpUrl);
    showNotification('📋 Full RTMP URL copied to clipboard', 'success');
  };

  const generateNewToken = () => {
    const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const newUrl = `https://player.restream.io?token=${newToken}`;
    
    setSettings(prev => ({
      ...prev,
      restreamEmbedToken: newToken,
      streamUrl: newUrl,
      restreamBackupUrl: newUrl
    }));
    
    showNotification('🔄 New embed token generated (save to apply)', 'info');
  };

  const getStatusColor = () => {
    switch (settings.streamStatus) {
      case 'live': return 'text-green-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (settings.streamStatus) {
      case 'live': return '🟢';
      case 'error': return '🔴';
      default: return '⚫';
    }
  };

  return (
    <div className="bg-gray-800/90 rounded-lg border-2 border-gold/30 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gold flex items-center gap-2">
          🎥 Stream Settings
        </h2>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${getStatusColor()}`}>
            {getStatusIcon()} {settings.streamStatus.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Stream Provider Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Stream Provider
          </label>
          <select
            value={settings.streamProvider}
            onChange={(e) => setSettings(prev => ({ ...prev, streamProvider: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold focus:border-transparent"
          >
            <option value="restream">Restream.io</option>
            <option value="youtube">YouTube</option>
            <option value="twitch">Twitch</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Stream Title */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Stream Title
          </label>
          <input
            type="text"
            value={settings.streamTitle}
            onChange={(e) => setSettings(prev => ({ ...prev, streamTitle: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold focus:border-transparent"
            placeholder="Enter stream title"
          />
        </div>

        {/* Embed Settings */}
        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <h3 className="text-sm font-semibold text-gold mb-3">📡 Embed Settings</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Embed Token
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.restreamEmbedToken}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    restreamEmbedToken: e.target.value,
                    streamUrl: `https://player.restream.io?token=${e.target.value}`,
                    restreamBackupUrl: `https://player.restream.io?token=${e.target.value}`
                  }))}
                  className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm focus:ring-2 focus:ring-gold focus:border-transparent"
                  placeholder="Enter Restream embed token"
                />
                <button
                  onClick={() => copyToClipboard(settings.restreamEmbedToken, 'Embed token')}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  📋
                </button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={testStream}
                disabled={isTesting}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium"
              >
                {isTesting ? '⏳ Testing...' : '🔍 Test Connection'}
              </button>
              <button
                onClick={generateNewToken}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium"
              >
                🔄 Generate New
              </button>
            </div>
          </div>
        </div>

        {/* RTMP Settings (Read-only) */}
        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <h3 className="text-sm font-semibold text-gold mb-3">🔴 RTMP Settings (Read-only)</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                RTMP URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.restreamRtmpUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm"
                />
                <button
                  onClick={() => copyToClipboard(settings.restreamRtmpUrl, 'RTMP URL')}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  📋
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Stream Key
              </label>
              <div className="flex gap-2">
                <input
                  type={showRtmpKey ? 'text' : 'password'}
                  value={settings.restreamStreamKey}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm"
                />
                <button
                  onClick={() => setShowRtmpKey(!showRtmpKey)}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm"
                >
                  {showRtmpKey ? '👁️' : '👁️‍🗨️'}
                </button>
                <button
                  onClick={() => copyToClipboard(settings.restreamStreamKey, 'Stream key')}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  📋
                </button>
              </div>
            </div>
            
            <button
              onClick={copyAllRtmpSettings}
              className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
            >
              📋 Copy Full RTMP URL
            </button>
          </div>
        </div>

        {/* Fallback Settings */}
        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <h3 className="text-sm font-semibold text-gold mb-3">🔄 Fallback Settings</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                Enable Fallback
              </label>
              <input
                type="checkbox"
                checked={settings.enableFallback}
                onChange={(e) => setSettings(prev => ({ ...prev, enableFallback: e.target.checked }))}
                className="w-4 h-4 text-gold bg-gray-600 border-gray-500 rounded focus:ring-gold"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Fallback URL
              </label>
              <input
                type="text"
                value={settings.restreamBackupUrl}
                onChange={(e) => setSettings(prev => ({ ...prev, restreamBackupUrl: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm focus:ring-2 focus:ring-gold focus:border-transparent"
                placeholder="Enter fallback stream URL"
              />
            </div>
          </div>
        </div>

        {/* Stream Status */}
        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <h3 className="text-sm font-semibold text-gold mb-3">📊 Stream Status</h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Status:</span>
              <span className={`ml-2 font-semibold ${getStatusColor()}`}>
                {getStatusIcon()} {settings.streamStatus.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Viewers:</span>
              <span className="ml-2 font-semibold text-white">
                {settings.streamViewers}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Bitrate:</span>
              <span className="ml-2 font-semibold text-white">
                {settings.streamBitrate}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Last Check:</span>
              <span className="ml-2 font-semibold text-white">
                {new Date(settings.lastStreamCheck).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-600">
          <button
            onClick={saveSettings}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-gold to-yellow-600 hover:from-gold/90 hover:to-yellow-600/90 disabled:from-gray-600 disabled:to-gray-700 text-gray-900 rounded-lg font-semibold"
          >
            {isLoading ? '⏳ Saving...' : '💾 Save Settings'}
          </button>
          <button
            onClick={loadSettings}
            className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default StreamSettingsPanel;
