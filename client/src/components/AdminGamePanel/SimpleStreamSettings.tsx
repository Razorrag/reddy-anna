/**
 * SimpleStreamSettings - Simplified RTMP Configuration
 * 
 * Features:
 * - RTMP URL + Stream Key configuration
 * - Live stream preview using Restream player
 * - Stream status monitoring
 * - Clean and simple interface
 */

import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';

interface StreamSettings {
  restreamRtmpUrl: string;
  restreamStreamKey: string;
  streamTitle: string;
  streamStatus: 'live' | 'offline';
}

const SimpleStreamSettings: React.FC = () => {
  const { showNotification } = useNotification();
  const [settings, setSettings] = useState<StreamSettings>({
    restreamRtmpUrl: 'rtmp://live.restream.io/live',
    restreamStreamKey: 're_10541509_eventd4960ba1734c49369fc0d114295801a0',
    streamTitle: 'Andar Bahar Live',
    streamStatus: 'live'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Load current settings
  useEffect(() => {
    loadSettings();
  }, []);

  // Auto-save Restream credentials on first load
  useEffect(() => {
    const autoSaveRestream = async () => {
      try {
        await fetch('/api/game/stream-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            restreamRtmpUrl: 'rtmp://live.restream.io/live',
            restreamStreamKey: 're_10541509_eventd4960ba1734c49369fc0d114295801a0',
            streamTitle: 'Andar Bahar Live'
          }),
        });
        console.log('✅ Restream credentials auto-saved');
      } catch (error) {
        console.error('Failed to auto-save Restream credentials:', error);
      }
    };
    
    autoSaveRestream();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/game/stream-settings');
      const data = await response.json();
      
      setSettings({
        restreamRtmpUrl: data.restreamRtmpUrl || '',
        restreamStreamKey: data.restreamStreamKey || '',
        streamTitle: data.streamTitle || 'Andar Bahar Live',
        streamStatus: data.streamStatus || 'offline'
      });
    } catch (error) {
      console.error('Failed to load stream settings:', error);
      showNotification('❌ Failed to load stream settings', 'error');
    }
  };

  const saveSettings = async () => {
    if (!settings.restreamRtmpUrl || !settings.restreamStreamKey) {
      showNotification('⚠️ Please fill in both RTMP URL and Stream Key', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/game/stream-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restreamRtmpUrl: settings.restreamRtmpUrl,
          restreamStreamKey: settings.restreamStreamKey,
          streamTitle: settings.streamTitle
        }),
      });

      if (response.ok) {
        showNotification('✅ Stream settings saved successfully', 'success');
        await loadSettings();
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showNotification(`📋 ${label} copied to clipboard`, 'success');
  };

  const copyFullRtmpUrl = () => {
    const fullUrl = `${settings.restreamRtmpUrl}/${settings.restreamStreamKey}`;
    copyToClipboard(fullUrl, 'Full RTMP URL');
  };

  const getStatusColor = () => {
    return settings.streamStatus === 'live' ? 'text-green-400' : 'text-gray-400';
  };

  const getStatusIcon = () => {
    return settings.streamStatus === 'live' ? '🟢' : '⚫';
  };

  const checkStreamStatus = async () => {
    setPreviewLoading(true);
    try {
      await loadSettings();
      showNotification(
        settings.streamStatus === 'live' ? '✅ Stream is live!' : '⚫ Stream is offline',
        settings.streamStatus === 'live' ? 'success' : 'info'
      );
    } catch (error) {
      console.error('Failed to check stream status:', error);
      showNotification('❌ Failed to check stream status', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/90 rounded-lg border-2 border-gold/30 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gold flex items-center gap-2">
          🎥 RTMP Stream Settings
        </h2>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${getStatusColor()}`}>
            {getStatusIcon()} {settings.streamStatus.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="space-y-6">
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

        {/* RTMP Configuration */}
        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <h3 className="text-sm font-semibold text-gold mb-3">🔴 RTMP Configuration for OBS</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                RTMP Server URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.restreamRtmpUrl}
                  onChange={(e) => setSettings(prev => ({ ...prev, restreamRtmpUrl: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm focus:ring-2 focus:ring-gold focus:border-transparent"
                  placeholder="rtmp://live.restream.io/live"
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
                  type={showStreamKey ? 'text' : 'password'}
                  value={settings.restreamStreamKey}
                  onChange={(e) => setSettings(prev => ({ ...prev, restreamStreamKey: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm focus:ring-2 focus:ring-gold focus:border-transparent"
                  placeholder="Enter your Restream stream key"
                />
                <button
                  onClick={() => setShowStreamKey(!showStreamKey)}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm"
                >
                  {showStreamKey ? '👁️' : '👁️‍🗨️'}
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
              onClick={copyFullRtmpUrl}
              className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
            >
              📋 Copy Full RTMP URL (Server + Key)
            </button>
          </div>
        </div>

        {/* Stream Preview */}
        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gold">👁️ Stream Preview</h3>
            <button
              onClick={checkStreamStatus}
              disabled={previewLoading}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded text-xs font-medium"
            >
              {previewLoading ? '🔄 Checking...' : '🔄 Check Status'}
            </button>
          </div>
          
          {settings.restreamRtmpUrl && settings.restreamStreamKey ? (
            <div className="space-y-3">
              {/* Embed Preview */}
              <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                {settings.streamStatus === 'live' ? (
                  <iframe
                    src={`https://player.restream.io?token=${settings.restreamStreamKey}`}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allowFullScreen
                    className="w-full h-full"
                    title="Stream Preview"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">📹</span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        Stream Offline
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        Start streaming from OBS to see preview
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Live Indicator Overlay */}
                {settings.streamStatus === 'live' && (
                  <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    LIVE
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Preview Status:</span>
                <span className={`font-semibold ${
                  settings.streamStatus === 'live' ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {settings.streamStatus === 'live' ? '🟢 Stream Active' : '⚫ Stream Offline'}
                </span>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Open stream in new tab
                    window.open(`https://player.restream.io?token=${settings.restreamStreamKey}`, '_blank');
                  }}
                  className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium"
                >
                  🚀 Open Stream in New Tab
                </button>
                <button
                  onClick={() => {
                    // Copy stream URL
                    copyToClipboard(`https://player.restream.io?token=${settings.restreamStreamKey}`, 'Stream URL');
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  📋
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📹</span>
              </div>
              <p className="text-gray-400 text-sm">
                Configure your RTMP settings above to enable stream preview
              </p>
            </div>
          )}
        </div>

        {/* Stream Status Details */}
        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <h3 className="text-sm font-semibold text-gold mb-3">📊 Stream Status</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300 text-sm">Current Status:</span>
            <span className={`text-sm font-semibold ${getStatusColor()}`}>
              {getStatusIcon()} {settings.streamStatus.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Stream status is automatically detected when you start streaming from OBS.
            Click "Check Status" to manually refresh the stream status.
          </p>
        </div>

        {/* OBS Setup Instructions */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-400 mb-2">📋 OBS Studio Setup Instructions</h3>
          <ol className="text-xs text-gray-300 space-y-2">
            <li>1. Open OBS Studio</li>
            <li>2. Go to Settings → Stream</li>
            <li>3. Service: <span className="text-gold font-mono">Custom</span></li>
            <li>4. Server: <span className="text-gold font-mono">{settings.restreamRtmpUrl || '[Enter RTMP URL above]'}</span></li>
            <li>5. Stream Key: <span className="text-gold font-mono">[Click 👁️ to view, then copy]</span></li>
            <li>6. Click "Apply" then "OK"</li>
            <li>7. Click "Start Streaming" in OBS main window</li>
            <li>8. Check preview above to verify stream is working</li>
          </ol>
        </div>

        {/* Important Notice */}
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-yellow-400 mb-2">⚠️ Important Notice</h3>
          <p className="text-xs text-gray-300">
            This configuration uses RTMP streaming only. Configure OBS with the RTMP settings above and start streaming. 
            The stream preview will appear automatically when your stream is live. You can also open the stream in a new tab to test.
          </p>
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

export default SimpleStreamSettings;
