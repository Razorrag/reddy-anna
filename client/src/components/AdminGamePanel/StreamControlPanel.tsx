/**
 * StreamControlPanel - Stream Configuration Management
 * 
 * Manages live stream settings including:
 * - Stream URL configuration
 * - Stream type selection (YouTube/Direct)
 * - Active/inactive toggle
 * - Fake viewer range settings
 * - Stream pause/play control
 */

import React, { useState, useEffect } from 'react';
import { useNotification } from '@/contexts/NotificationContext';
import { apiClient } from '@/lib/api-client';
import { RefreshCw, Save, Eye, Link, Play, Square, Volume2, VolumeX } from 'lucide-react';

interface StreamConfig {
  streamUrl: string;
  streamType: 'iframe' | 'video'; // ✅ FIX #5: Use same types as admin-stream-settings
  isActive: boolean;
  minViewers: number;
  maxViewers: number;
  isPaused: boolean;
  muted: boolean;
}

const StreamControlPanel: React.FC = () => {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<StreamConfig>({
    streamUrl: '',
    streamType: 'iframe', // ✅ FIX #5: Default to 'iframe' to match server validation
    isActive: false,
    minViewers: 1000,
    maxViewers: 1100,
    isPaused: false,
    muted: true,
  });

  // Load current stream configuration
  useEffect(() => {
    loadStreamConfig();
  }, []);

  const loadStreamConfig = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<any>('/stream/simple-config');
      if (response.success && response.data) {
        setConfig({
          streamUrl: response.data.streamUrl || '',
          streamType: response.data.streamType || 'iframe', // ✅ FIX #5: Default to 'iframe'
          isActive: response.data.isActive || false,
          minViewers: response.data.minViewers || 1000,
          maxViewers: response.data.maxViewers || 1100,
          isPaused: response.data.isPaused || false,
          muted: response.data.muted !== false,
        });
      }
    } catch (error) {
      console.error('Failed to load stream config:', error);
      showNotification('Failed to load stream configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const response = await apiClient.post<any>('/stream/simple-config', config);
      if (response.success) {
        showNotification('Stream configuration saved successfully', 'success');
      } else {
        showNotification(response.error || 'Failed to save configuration', 'error');
      }
    } catch (error: any) {
      console.error('Failed to save stream config:', error);
      showNotification(error?.message || 'Failed to save configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePause = async () => {
    try {
      const newPausedState = !config.isPaused;
      const response = await apiClient.post<any>('/stream/toggle-pause', {
        isPaused: newPausedState,
      });

      if (response.success) {
        setConfig({ ...config, isPaused: newPausedState });
        showNotification(
          `Stream ${newPausedState ? 'paused' : 'resumed'} for all players`,
          'success'
        );
      } else {
        showNotification(response.error || 'Failed to toggle stream pause', 'error');
      }
    } catch (error: any) {
      console.error('Failed to toggle stream pause:', error);
      showNotification(error?.message || 'Failed to toggle stream pause', 'error');
    }
  };

  if (loading) {
    return (
      <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-gold/30 shadow-2xl p-8">
        <div className="flex items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-gold" />
          <span className="text-lg text-gray-300">Loading stream configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-gold/30 shadow-2xl p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gold mb-2">🎥 Stream Configuration</h2>
        <p className="text-sm text-gray-400">Manage live stream settings and viewer display</p>
      </div>

      <div className="space-y-6">
        {/* Stream URL */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
            <Link className="w-4 h-4" />
            Stream URL
          </label>
          <input
            type="text"
            value={config.streamUrl}
            onChange={(e) => setConfig({ ...config, streamUrl: e.target.value })}
            placeholder="Enter YouTube URL or direct stream URL"
            className="w-full px-4 py-3 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        {/* Stream Type */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
            <Play className="w-4 h-4" />
            Stream Type
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setConfig({ ...config, streamType: 'iframe' })}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                config.streamType === 'iframe'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg'
                  : 'bg-slate-800/50 text-gray-400 hover:bg-slate-700/50 border border-slate-600/50'
              }`}
            >
              iFrame (YouTube/Embed)
            </button>
            <button
              onClick={() => setConfig({ ...config, streamType: 'video' })}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                config.streamType === 'video'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'bg-slate-800/50 text-gray-400 hover:bg-slate-700/50 border border-slate-600/50'
              }`}
            >
              Video (HLS/.m3u8)
            </button>
          </div>
        </div>

        {/* Active Status */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
            <Square className="w-4 h-4" />
            Stream Status
          </label>
          <button
            onClick={() => setConfig({ ...config, isActive: !config.isActive })}
            className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
              config.isActive
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white'
            }`}
          >
            {config.isActive ? '✅ Active' : '❌ Inactive'}
          </button>
        </div>

        {/* Fake Viewer Range */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
            <Eye className="w-4 h-4" />
            Fake Viewer Range
          </label>
          <div className="flex gap-3 items-center">
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">Min Viewers</label>
              <input
                type="number"
                value={config.minViewers}
                onChange={(e) => setConfig({ ...config, minViewers: parseInt(e.target.value || '0', 10) })}
                className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-gold"
              />
            </div>
            <span className="text-gray-400 mt-5">—</span>
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">Max Viewers</label>
              <input
                type="number"
                value={config.maxViewers}
                onChange={(e) => setConfig({ ...config, maxViewers: parseInt(e.target.value || '0', 10) })}
                className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-gold"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Random viewer count between these values will be displayed to players
          </p>
        </div>

        {/* Pause/Play Control */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
            Stream Playback Control
          </label>
          <button
            onClick={handleTogglePause}
            className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
              config.isPaused
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg'
            }`}
          >
            {config.isPaused ? '▶️ Resume Stream' : '⏸️ Pause Stream'}
          </button>
          <p className="text-xs text-gray-500 mt-2">
            {config.isPaused
              ? 'Stream is currently paused for all players'
              : 'Stream is currently playing for all players'}
          </p>
        </div>

        {/* Mute Control */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
            <Volume2 className="w-4 h-4" />
            Stream Audio Control
          </label>
          <button
            onClick={() => setConfig({ ...config, muted: !config.muted })}
            className={`w-full px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              config.muted
                ? 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white shadow-lg'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg'
            }`}
          >
            {config.muted ? (
              <>
                <VolumeX className="w-5 h-5" />
                🔇 Muted (Default)
              </>
            ) : (
              <>
                <Volume2 className="w-5 h-5" />
                🔊 Unmuted
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 mt-2">
            {config.muted
              ? 'Stream audio is muted for all players by default'
              : 'Stream audio is unmuted for all players'}
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveConfig}
          disabled={saving}
          className="w-full px-6 py-4 bg-gradient-to-r from-gold to-yellow-600 hover:from-yellow-500 hover:to-gold text-gray-900 rounded-lg font-bold transition-all duration-200 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Saving Configuration...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Configuration
            </>
          )}
        </button>

        {/* Reload Button */}
        <button
          onClick={loadStreamConfig}
          disabled={loading || saving}
          className="w-full px-6 py-3 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Reload Configuration
        </button>
      </div>
    </div>
  );
};

export default StreamControlPanel;
