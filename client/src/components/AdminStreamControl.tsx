// AdminStreamControl.tsx - Unified Stream Control Panel
// Simplified admin interface for managing both RTMP and WebRTC streaming

import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { Play, Pause, MonitorPlay, Video, Settings, Eye, Copy, WifiOff, Wifi } from 'lucide-react';

interface StreamConfig {
  activeMethod: 'rtmp' | 'webrtc' | 'none';
  streamStatus: string;
  rtmpServerUrl: string;
  rtmpStreamKey: string;
  rtmpEnabled: boolean;
  webrtcEnabled: boolean;
  webrtcResolution: string;
  webrtcFps: number;
  webrtcBitrate: number;
  streamWidth: number;
  streamHeight: number;
  showStream: boolean;
  streamTitle: string;
  viewerCount: number;
}

const AdminStreamControl: React.FC = () => {
  const { showNotification } = useNotification();
  const [streamConfig, setStreamConfig] = useState<StreamConfig>({
    activeMethod: 'rtmp',
    streamStatus: 'offline',
    rtmpServerUrl: 'rtmp://live.restream.io/live',
    rtmpStreamKey: '',
    rtmpEnabled: true,
    webrtcEnabled: true,
    webrtcResolution: '720p',
    webrtcFps: 30,
    webrtcBitrate: 2500,
    streamWidth: 1280,
    streamHeight: 720,
    showStream: true,
    streamTitle: 'Andar Bahar Live',
    viewerCount: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Load current configuration
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/stream/config', { 
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setStreamConfig({
          activeMethod: data.data.activeMethod,
          streamStatus: data.data.streamStatus,
          rtmpServerUrl: data.data.rtmpServerUrl,
          rtmpStreamKey: data.data.rtmpStreamKey,
          rtmpEnabled: data.data.rtmpEnabled,
          webrtcEnabled: data.data.webrtcEnabled,
          webrtcResolution: data.data.webrtcResolution,
          webrtcFps: data.data.webrtcFps,
          webrtcBitrate: data.data.webrtcBitrate,
          streamWidth: data.data.streamWidth,
          streamHeight: data.data.streamHeight,
          showStream: data.data.showStream,
          streamTitle: data.data.streamTitle,
          viewerCount: data.data.viewerCount
        });
      }
    } catch (error) {
      console.error('Failed to load stream config:', error);
      showNotification('❌ Failed to load stream settings', 'error');
    }
  };

  // Save RTMP configuration
  const saveRTMPConfig = async () => {
    if (!streamConfig.rtmpServerUrl || !streamConfig.rtmpStreamKey) {
      showNotification('⚠️ Please fill in both RTMP URL and Stream Key', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/stream/config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          method: 'rtmp',
          width: streamConfig.streamWidth,
          height: streamConfig.streamHeight,
          showStream: streamConfig.showStream,
          streamTitle: streamConfig.streamTitle,
          rtmpServerUrl: streamConfig.rtmpServerUrl,
          rtmpStreamKey: streamConfig.rtmpStreamKey
        })
      });

      const data = await response.json();
      if (data.success) {
        showNotification('✅ RTMP configuration saved successfully', 'success');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to save RTMP config:', error);
      showNotification('❌ Failed to save RTMP configuration', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Save WebRTC configuration
  const saveWebRTCConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stream/config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          method: 'webrtc',
          width: streamConfig.streamWidth,
          height: streamConfig.streamHeight,
          showStream: streamConfig.showStream,
          streamTitle: streamConfig.streamTitle,
          webrtcResolution: streamConfig.webrtcResolution,
          webrtcFps: streamConfig.webrtcFps,
          webrtcBitrate: streamConfig.webrtcBitrate
        })
      });

      const data = await response.json();
      if (data.success) {
        showNotification('✅ WebRTC configuration saved successfully', 'success');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to save WebRTC config:', error);
      showNotification('❌ Failed to save WebRTC configuration', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Start/Stop streaming
  const toggleStreamStatus = async (status: 'online' | 'offline') => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stream/status', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();
      if (data.success) {
        setStreamConfig(prev => ({ ...prev, streamStatus: status }));
        showNotification(`✅ Stream ${status === 'online' ? 'started' : 'stopped'}`, 'success');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to toggle stream status:', error);
      showNotification('❌ Failed to update stream status', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showNotification(`📋 ${label} copied to clipboard`, 'success');
  };

  // Get status color and icon
  const getStatusColor = () => {
    switch (streamConfig.streamStatus) {
      case 'online': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (streamConfig.streamStatus) {
      case 'online': return '🟢';
      case 'connecting': return '🟡';
      case 'error': return '🔴';
      default: return '⚫';
    }
  };

  return (
    <div className="bg-gray-800/90 rounded-lg border-2 border-gold/30 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gold flex items-center gap-2">
            🎥 Unified Stream Control
          </h2>
          <p className="text-sm text-gray-400 mt-1">Manage both RTMP and WebRTC streaming</p>
        </div>
        <div className={`px-4 py-2 rounded-lg border font-semibold text-sm ${getStatusColor()}`}>
          {getStatusIcon()} {streamConfig.streamStatus.charAt(0).toUpperCase() + streamConfig.streamStatus.slice(1)}
          {streamConfig.viewerCount > 0 && ` • ${streamConfig.viewerCount} viewers`}
        </div>
      </div>

      {/* Stream Method Tabs */}
      <div className="flex gap-3 p-1 bg-gray-900/50 rounded-lg mb-6">
        <button 
          onClick={() => setStreamConfig(prev => ({ ...prev, activeMethod: 'rtmp' }))}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 ${
            streamConfig.activeMethod === 'rtmp' 
              ? 'bg-gradient-to-r from-red-600 to-red-700 text-white' 
              : 'text-gray-400 hover:bg-gray-800/50'
          }`}
        >
          <Video className="w-5 h-5" /> RTMP (OBS)
        </button>
        <button 
          onClick={() => setStreamConfig(prev => ({ ...prev, activeMethod: 'webrtc' }))}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 ${
            streamConfig.activeMethod === 'webrtc' 
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
              : 'text-gray-400 hover:bg-gray-800/50'
          }`}
        >
          <MonitorPlay className="w-5 h-5" /> WebRTC (Browser)
        </button>
        <button 
          onClick={() => setStreamConfig(prev => ({ ...prev, activeMethod: 'none' }))}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 ${
            streamConfig.activeMethod === 'none' 
              ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white' 
              : 'text-gray-400 hover:bg-gray-800/50'
          }`}
        >
          <WifiOff className="w-5 h-5" /> No Stream
        </button>
      </div>

      {/* RTMP Settings */}
      {streamConfig.activeMethod === 'rtmp' && (
        <RTMPSettings
          config={streamConfig}
          onSave={saveRTMPConfig}
          onToggleStatus={toggleStreamStatus}
          onCopy={copyToClipboard}
          showKey={showKey}
          setShowKey={setShowKey}
          isLoading={isLoading}
        />
      )}

      {/* WebRTC Settings */}
      {streamConfig.activeMethod === 'webrtc' && (
        <WebRTCSettings
          config={streamConfig}
          onSave={saveWebRTCConfig}
          onToggleStatus={toggleStreamStatus}
          isLoading={isLoading}
        />
      )}

      {/* Display Settings (common to both) */}
      <DisplaySettings
        config={streamConfig}
        setConfig={setStreamConfig}
        onSave={() => streamConfig.activeMethod === 'rtmp' ? saveRTMPConfig() : saveWebRTCConfig()}
        isLoading={isLoading}
      />
    </div>
  );
};

// RTMP Settings Component
const RTMPSettings: React.FC<{
  config: StreamConfig;
  onSave: () => void;
  onToggleStatus: (status: 'online' | 'offline') => void;
  onCopy: (text: string, label: string) => void;
  showKey: boolean;
  setShowKey: (show: boolean) => void;
  isLoading: boolean;
}> = ({ config, onSave, onToggleStatus, onCopy, showKey, setShowKey, isLoading }) => {
  return (
    <div className="space-y-6">
      {/* RTMP Configuration */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-gold flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5" /> RTMP Configuration
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">RTMP Server URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={config.rtmpServerUrl}
                onChange={(e) => setStreamConfig(prev => ({ ...prev, rtmpServerUrl: e.target.value }))}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold"
                placeholder="rtmp://your-server/live"
              />
              <button
                onClick={() => onCopy(config.rtmpServerUrl, 'RTMP URL')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Stream Key</label>
            <div className="flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={config.rtmpStreamKey}
                onChange={(e) => setStreamConfig(prev => ({ ...prev, rtmpStreamKey: e.target.value }))}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold"
                placeholder="your-stream-key"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                {showKey ? '👁️' : '👁️‍🗨️'}
              </button>
              <button
                onClick={() => onCopy(config.rtmpStreamKey, 'Stream key')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onCopy(`${config.rtmpServerUrl}/${config.rtmpStreamKey}`, 'Full RTMP URL')}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
            >
              📋 Copy Full RTMP URL
            </button>
          </div>
        </div>
      </div>

      {/* Stream Controls */}
      <div className="flex gap-3">
        <button
          onClick={() => onToggleStatus('online')}
          disabled={isLoading || config.streamStatus === 'online'}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 disabled:from-gray-600 text-white rounded-lg font-semibold"
        >
          {isLoading ? '⏳ Loading...' : '🟢 Start Stream'}
        </button>
        <button
          onClick={() => onToggleStatus('offline')}
          disabled={isLoading || config.streamStatus === 'offline'}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 disabled:from-gray-600 text-white rounded-lg font-semibold"
        >
          {isLoading ? '⏳ Loading...' : '🔴 Stop Stream'}
        </button>
        <button
          onClick={onSave}
          disabled={isLoading}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-gold to-yellow-600 hover:from-gold/90 hover:to-yellow-600/90 disabled:from-gray-600 text-gray-900 rounded-lg font-semibold"
        >
          {isLoading ? '⏳ Saving...' : '💾 Save Settings'}
        </button>
      </div>
    </div>
  );
};

// WebRTC Settings Component
const WebRTCSettings: React.FC<{
  config: StreamConfig;
  onSave: () => void;
  onToggleStatus: (status: 'online' | 'offline') => void;
  isLoading: boolean;
}> = ({ config, onSave, onToggleStatus, isLoading }) => {
  return (
    <div className="space-y-6">
      {/* Quality Settings */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-gold flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5" /> WebRTC Quality Settings
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Resolution</label>
            <select
              value={config.webrtcResolution}
              onChange={(e) => setStreamConfig(prev => ({ ...prev, webrtcResolution: e.target.value }))}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold"
            >
              <option value="480p">480p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">FPS</label>
            <select
              value={config.webrtcFps}
              onChange={(e) => setStreamConfig(prev => ({ ...prev, webrtcFps: parseInt(e.target.value) }))}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold"
            >
              <option value={15}>15 FPS</option>
              <option value={30}>30 FPS</option>
              <option value={60}>60 FPS</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Bitrate (kbps)</label>
            <input
              type="number"
              value={config.webrtcBitrate}
              onChange={(e) => setStreamConfig(prev => ({ ...prev, webrtcBitrate: parseInt(e.target.value) }))}
              min="500"
              max="10000"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold"
            />
          </div>
        </div>
      </div>

      {/* Stream Controls */}
      <div className="flex gap-3">
        <button
          onClick={() => onToggleStatus('online')}
          disabled={isLoading || config.streamStatus === 'online'}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 disabled:from-gray-600 text-white rounded-lg font-semibold"
        >
          {isLoading ? '⏳ Loading...' : '🟢 Start Stream'}
        </button>
        <button
          onClick={() => onToggleStatus('offline')}
          disabled={isLoading || config.streamStatus === 'offline'}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 disabled:from-gray-600 text-white rounded-lg font-semibold"
        >
          {isLoading ? '⏳ Loading...' : '🔴 Stop Stream'}
        </button>
        <button
          onClick={onSave}
          disabled={isLoading}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-gold to-yellow-600 hover:from-gold/90 hover:to-yellow-600/90 disabled:from-gray-600 text-gray-900 rounded-lg font-semibold"
        >
          {isLoading ? '⏳ Saving...' : '💾 Save Settings'}
        </button>
      </div>
    </div>
  );
};

// Display Settings Component (common to both)
const DisplaySettings: React.FC<{
  config: StreamConfig;
  setConfig: React.Dispatch<React.SetStateAction<StreamConfig>>;
  onSave: () => void;
  isLoading: boolean;
}> = ({ config, setConfig, onSave, isLoading }) => {
  return (
    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-semibold text-gold flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5" /> Display Settings
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Stream Width</label>
          <input
            type="number"
            value={config.streamWidth}
            onChange={(e) => setConfig(prev => ({ ...prev, streamWidth: parseInt(e.target.value) }))}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Stream Height</label>
          <input
            type="number"
            value={config.streamHeight}
            onChange={(e) => setConfig(prev => ({ ...prev, streamHeight: parseInt(e.target.value) }))}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.showStream}
            onChange={(e) => setConfig(prev => ({ ...prev, showStream: e.target.checked }))}
            className="w-4 h-4 text-gold bg-gray-600 border-gray-500 rounded focus:ring-gold"
          />
          <label className="text-sm font-medium text-gray-300 cursor-pointer">Show Stream to Players</label>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Stream Title</label>
          <input
            type="text"
            value={config.streamTitle}
            onChange={(e) => setConfig(prev => ({ ...prev, streamTitle: e.target.value }))}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold"
            placeholder="Andar Bahar Live"
          />
        </div>
      </div>
      
      <div className="flex gap-3 mt-4">
        <button
          onClick={onSave}
          disabled={isLoading}
          className="px-6 py-3 bg-gradient-to-r from-gold to-yellow-600 hover:from-gold/90 hover:to-yellow-600/90 disabled:from-gray-600 text-gray-900 rounded-lg font-semibold"
        >
          {isLoading ? '⏳ Saving...' : '💾 Save Display Settings'}
        </button>
      </div>
    </div>
  );
};

export default AdminStreamControl;