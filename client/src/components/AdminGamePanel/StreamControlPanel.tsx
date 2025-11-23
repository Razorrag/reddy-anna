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
import { RefreshCw, Save, Eye, Link, Play, Square } from 'lucide-react';

interface StreamConfig {
  streamUrl: string;
  streamType: 'iframe' | 'video';
  loopMode: boolean;
  loopNextGameDate: string;
  loopNextGameTime: string;
  minViewers: number;
  maxViewers: number;
  isPaused: boolean;
}

const StreamControlPanel: React.FC = () => {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<StreamConfig>({
    streamUrl: '',
    streamType: 'iframe',
    loopMode: false,
    loopNextGameDate: '',
    loopNextGameTime: '',
    minViewers: 1000,
    maxViewers: 1100,
    isPaused: false,
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
          streamType: response.data.streamType || 'iframe',
          loopMode: response.data.loopMode || false,
          loopNextGameDate: response.data.loopNextGameDate || '',
          loopNextGameTime: response.data.loopNextGameTime || '',
          minViewers: response.data.minViewers || 1000,
          maxViewers: response.data.maxViewers || 1100,
          isPaused: response.data.isPaused || false,
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
        <h2 className="text-2xl font-bold text-gold mb-2">🎥 Stream Settings</h2>
        <p className="text-sm text-gray-400">Simple 2-mode system: Stream or Loop video</p>
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

        {/* Loop Mode Toggle - Main Control */}
        <div className="p-4 bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-lg border border-purple-500/30">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-purple-300">🔁 Loop Video Mode</h3>
              <p className="text-sm text-gray-400">Toggle ON = Loop video | OFF = Stream</p>
            </div>
            <button
              type="button"
              onClick={() => setConfig({ ...config, loopMode: !config.loopMode })}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${config.loopMode ? 'bg-purple-500' : 'bg-gray-600'}`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${config.loopMode ? 'translate-x-7' : 'translate-x-1'}`}
              />
            </button>
          </div>

          {config.loopMode && (
            <div className="space-y-3 mt-4">
              <div>
                <label className="text-sm font-semibold text-purple-300 mb-2 block">
                  📅 Next Game Date
                </label>
                <input
                  type="text"
                  value={config.loopNextGameDate}
                  onChange={(e) => setConfig({ ...config, loopNextGameDate: e.target.value })}
                  placeholder="e.g., 25 Nov 2025"
                  className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/50"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-purple-300 mb-2 block">
                  🕐 Next Game Time
                </label>
                <input
                  type="text"
                  value={config.loopNextGameTime}
                  onChange={(e) => setConfig({ ...config, loopNextGameTime: e.target.value })}
                  placeholder="e.g., 7:00 PM"
                  className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/50"
                />
              </div>
            </div>
          )}
        </div>

        {/* Stream Type - Only show when NOT in loop mode */}
        {!config.loopMode && (
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
                    ? 'bg-gradient-to-r from-gold to-yellow-600 text-black shadow-lg'
                    : 'bg-slate-800/50 text-gray-400 hover:bg-slate-700/50 border border-slate-600/50'
                }`}
              >
                iFrame (YouTube / Embed)
              </button>
              <button
                onClick={() => setConfig({ ...config, streamType: 'video' })}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                  config.streamType === 'video'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                    : 'bg-slate-800/50 text-gray-400 hover:bg-slate-700/50 border border-slate-600/50'
                }`}
              >
                Video (MP4 / HLS)
              </button>
            </div>
          </div>
        )}

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

        {/* Pause/Play Control - Only show when NOT in loop mode and has stream URL */}
        {!config.loopMode && config.streamUrl && (
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
        )}

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
