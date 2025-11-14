import React, { useState, useEffect } from 'react';
import { Video, Settings, RefreshCw, Save } from 'lucide-react';
import { useNotification } from '@/contexts/NotificationContext';
import { apiClient } from '@/lib/api-client'; // Import apiClient

interface StreamControlPanelProps {
  className?: string;
}
const StreamControlPanel: React.FC<StreamControlPanelProps> = ({ className = '' }) => {
  const { showNotification } = useNotification();

  // SIMPLE STREAM CONFIG (mirrors /admin/stream-settings)
  const [streamUrl, setStreamUrl] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [streamType, setStreamType] = useState<'iframe' | 'video'>('iframe');
  const [minViewers, setMinViewers] = useState<number>(1000);
  const [maxViewers, setMaxViewers] = useState<number>(1100);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load SIMPLE STREAM CONFIG used by player VideoArea
  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get<any>('/stream/simple-config');
        if (response.success && response.data) {
          const cfg = response.data;
          setStreamUrl(cfg.streamUrl || '');
          setIsActive(cfg.isActive || false);
          setIsPaused(cfg.isPaused || false);

          if (cfg.streamType === 'video' || cfg.streamType === 'iframe') {
            setStreamType(cfg.streamType);
          } else if (cfg.streamUrl && cfg.streamUrl.toLowerCase().endsWith('.m3u8')) {
            setStreamType('video');
          } else {
            setStreamType('iframe');
          }

          setMinViewers(cfg.minViewers ?? 1000);
          setMaxViewers(cfg.maxViewers ?? 1100);
        }
      } catch (error) {
        console.error('Failed to load stream config:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    setMessage(null);

    try {
      if (!streamUrl) {
        setMessage({ type: 'error', text: 'Stream URL is required' });
        setSaving(false);
        return;
      }

      const payload = {
        streamUrl,
        streamType,
        isActive,
        isPaused,
        streamTitle: 'Live Game Stream',
        autoplay: true,
        muted: true,
        controls: streamType === 'video' ? false : true,
        minViewers,
        maxViewers,
      };

      const response = await apiClient.post<any>('/stream/simple-config', payload);

      if (response.success) {
        setMessage({ type: 'success', text: 'Stream settings saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
        showNotification('Stream settings saved successfully', 'success');
      } else {
        const errText = response.error || 'Failed to save settings';
        setMessage({ type: 'error', text: errText });
        showNotification(errText, 'error');
      }
    } catch (error: any) {
      console.error('Failed to save stream config:', error);
      const msg = error?.message || 'Failed to save settings';
      setMessage({ type: 'error', text: msg });
      showNotification(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePause = async () => {
    setToggling(true);
    setMessage(null);

    try {
      const newPausedState = !isPaused;
      const response = await apiClient.post<any>('/stream/toggle-pause', {
        isPaused: newPausedState,
      });

      if (response.success) {
        setIsPaused(newPausedState);
        setMessage({
          type: 'success',
          text: `Stream ${newPausedState ? 'paused' : 'resumed'} for all players!`,
        });
        setTimeout(() => setMessage(null), 3000);
        showNotification(
          `Stream ${newPausedState ? 'paused' : 'resumed'} for all players!`,
          'success'
        );
      } else {
        const errText = response.error || 'Failed to toggle pause state';
        setMessage({ type: 'error', text: errText });
        showNotification(errText, 'error');
      }
    } catch (error: any) {
      console.error('Failed to toggle stream pause:', error);
      const msg = error?.message || 'Failed to toggle pause state';
      setMessage({ type: 'error', text: msg });
      showNotification(msg, 'error');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className={`bg-black/40 backdrop-blur-sm rounded-xl border border-gold/30 shadow-2xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Video className="w-6 h-6 text-gold" />
          <div>
            <h2 className="text-2xl font-bold text-gold">Live Stream Settings</h2>
            <p className="text-xs text-gray-400 mt-1">
              Configure the stream URL shown on the player game page video area.
            </p>
          </div>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Loading...
          </div>
        )}
      </div>

      {/* Simple Stream Settings */}
      <div className="mb-6 bg-gray-900/40 rounded-lg border border-gold/30 p-4">
        <h3 className="text-lg font-bold text-gold mb-3 flex items-center gap-2">
          <Video className="w-4 h-4" />
          Stream Settings (Simple URL)
        </h3>

        <div className="space-y-4">
          {/* Stream URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Stream URL
            </label>
            <input
              type="text"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="https://www.youtube.com/embed/YOUR_VIDEO_ID"
              className="w-full px-3 py-2 bg-gray-900/60 border border-gray-600 rounded-lg text-white text-sm focus:border-gold focus:outline-none"
            />
          </div>

          {/* Stream Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Stream Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setStreamType('iframe')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  streamType === 'iframe'
                    ? 'bg-gold text-black'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                iFrame (YouTube, Vimeo)
              </button>
              <button
                onClick={() => setStreamType('video')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  streamType === 'video'
                    ? 'bg-gold text-black'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Video (MP4, HLS)
              </button>
            </div>
          </div>

          {/* Viewer Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Min Viewers
              </label>
              <input
                type="number"
                value={minViewers}
                onChange={(e) => setMinViewers(parseInt(e.target.value || '0', 10))}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-600 rounded-lg text-white text-xs focus:border-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Max Viewers
              </label>
              <input
                type="number"
                value={maxViewers}
                onChange={(e) => setMaxViewers(parseInt(e.target.value || '0', 10))}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-600 rounded-lg text-white text-xs focus:border-gold focus:outline-none"
              />
            </div>
          </div>

          {/* Status + Pause */}
          <div className="flex flex-wrap gap-3 items-center">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 text-gold focus:ring-gold"
              />
              <span className="font-semibold">Stream Active (Players see it)</span>
            </label>

            <button
              onClick={togglePause}
              disabled={toggling}
              className="px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2"
            >
              {toggling ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  {isPaused ? 'Resume Stream' : 'Pause Stream'}
                </>
              )}
            </button>
          </div>

          {/* Actions + Message */}
          <div className="flex flex-wrap gap-3 items-center pt-1">
            <button
              onClick={saveConfig}
              disabled={saving || !streamUrl}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3 h-3" />
                  Save Settings
                </>
              )}
            </button>

            {message && (
              <span
                className={`text-xs ${
                  message.type === 'success' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {message.text}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 flex items-start gap-3">
        <Settings className="w-4 h-4 text-gray-400 mt-0.5" />
        <div className="text-xs text-gray-300 space-y-1">
          <div>
            This stream configuration is used on the player game page video area.
          </div>
          <div className="text-gray-400">
            Make sure the URL is a valid YouTube embed, Vimeo URL, or direct video (MP4/HLS).
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamControlPanel;