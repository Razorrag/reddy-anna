/**
 * SIMPLE STREAM SETTINGS PAGE
 * Configure stream URL - No WebRTC/RTMP complexity!
 * Just enter the stream URL and it shows on game page
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Video, Save, Eye, Check, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function AdminStreamSettings() {
  const [, setLocation] = useLocation();

  // ✅ MODE SELECTOR: Stream or Loop
  const [mode, setMode] = useState<'stream' | 'loop'>('stream');

  // Stream mode settings
  const [streamUrl, setStreamUrl] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [streamType, setStreamType] = useState<'iframe' | 'video'>('iframe');
  const [minViewers, setMinViewers] = useState<number>(1000);
  const [maxViewers, setMaxViewers] = useState<number>(1100);

  // Loop mode settings
  const [loopNextGameDate, setLoopNextGameDate] = useState('');
  const [loopNextGameTime, setLoopNextGameTime] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Load current config
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      // Fetch existing simple stream configuration
      const response = await apiClient.get<any>('/stream/simple-config');
      if (response.success && response.data) {
        const cfg = response.data;

        // Set mode based on loopMode
        setMode(cfg.loopMode ? 'loop' : 'stream');

        // Stream settings
        setStreamUrl(cfg.streamUrl || '');
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

        // Loop settings
        setLoopNextGameDate(cfg.loopNextGameDate || '');
        setLoopNextGameTime(cfg.loopNextGameTime || '');
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        streamUrl: streamUrl, // Always preserve the stream URL regardless of mode
        streamType,
        isPaused,
        streamTitle: 'Live Game Stream',
        autoplay: true,
        muted: true,
        controls: streamType === 'video' ? false : true,
        minViewers,
        maxViewers,
        loopMode: mode === 'loop',
        loopNextGameDate: mode === 'loop' ? loopNextGameDate : '',
        loopNextGameTime: mode === 'loop' ? loopNextGameTime : '',
        loopVideoUrl: '/shared/uhd_30fps.mp4'
      };

      const response = await apiClient.post<any>('/stream/simple-config', payload);

      if (response.success) {
        setMessage({ type: 'success', text: 'Stream settings saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to save settings' });
      }
    } catch (error: any) {
      console.error('Failed to save config:', error);
      setMessage({ type: 'error', text: error?.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const togglePausePlay = async () => {
    setToggling(true);
    setMessage(null);

    try {
      const newPausedState = !isPaused;

      const response = await apiClient.post<any>('/stream/toggle-pause', {
        isPaused: newPausedState
      });

      if (response.success) {
        setIsPaused(newPausedState);
        setMessage({
          type: 'success',
          text: `Stream ${newPausedState ? 'paused' : 'resumed'} for all players!`
        });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to toggle pause state' });
      }
    } catch (error: any) {
      console.error('Failed to toggle pause:', error);
      setMessage({ type: 'error', text: error?.message || 'Failed to toggle pause state' });
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => setLocation('/admin')}
            className="mb-4 px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-lg flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <h1 className="text-4xl font-bold bg-gradient-to-r from-gold to-yellow-600 bg-clip-text text-transparent drop-shadow-lg mb-2">
            🎥 Stream Settings
          </h1>
          <p className="text-gray-400">Configure your live stream or maintenance loop video</p>
        </div>

        {/* Main Settings Card */}
        <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-gold/30 p-6 shadow-2xl">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
              <p className="text-gray-400">Loading settings...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ✅ MODE SELECTOR */}
              <div className="p-4 bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-lg border border-blue-500/30">
                <h3 className="text-lg font-semibold text-white mb-3">📺 Select Mode</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setMode('stream')}
                    className={`px-6 py-4 rounded-lg font-semibold transition-all ${mode === 'stream'
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105'
                        : 'bg-black/40 text-gray-400 border border-gray-700 hover:border-green-400/40'
                      }`}
                  >
                    <div className="text-2xl mb-1">📡</div>
                    <div>Stream Mode</div>
                    <div className="text-xs mt-1 opacity-75">Show live stream</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('loop')}
                    className={`px-6 py-4 rounded-lg font-semibold transition-all ${mode === 'loop'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
                        : 'bg-black/40 text-gray-400 border border-gray-700 hover:border-purple-400/40'
                      }`}
                  >
                    <div className="text-2xl mb-1">🔁</div>
                    <div>Loop Mode</div>
                    <div className="text-xs mt-1 opacity-75">Show maintenance video</div>
                  </button>
                </div>
              </div>

              {/* ✅ STREAM MODE SETTINGS */}
              {mode === 'stream' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gold mb-2">
                      Stream URL *
                    </label>
                    <input
                      type="text"
                      value={streamUrl}
                      onChange={(e) => setStreamUrl(e.target.value)}
                      placeholder="Enter your stream URL (HLS .m3u8, MP4, or YouTube embed)"
                      className="w-full px-4 py-3 bg-black/50 border border-green-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      For HLS use: https://yourserver.com/live/stream/index.m3u8
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gold mb-2">
                      Stream Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setStreamType('iframe')}
                        className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${streamType === 'iframe'
                            ? 'bg-gold text-black shadow-lg'
                            : 'bg-black/40 text-gray-400 border border-gray-700 hover:border-gold/40'
                          }`}
                      >
                        iFrame (YouTube / Embed)
                      </button>
                      <button
                        type="button"
                        onClick={() => setStreamType('video')}
                        className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${streamType === 'video'
                            ? 'bg-green-500 text-black shadow-lg'
                            : 'bg-black/40 text-gray-400 border border-gray-700 hover:border-green-400/40'
                          }`}
                      >
                        Video (MP4 / HLS .m3u8)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-lg border border-indigo-500/30">
                    <h3 className="text-lg font-semibold text-indigo-300 mb-2">👥 Viewer Count Range</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-indigo-300 mb-2">Min</label>
                        <input
                          type="number"
                          value={minViewers}
                          onChange={(e) => setMinViewers(Number(e.target.value))}
                          min={0}
                          className="w-full px-4 py-3 bg-black/50 border border-indigo-500/30 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-indigo-300 mb-2">Max</label>
                        <input
                          type="number"
                          value={maxViewers}
                          onChange={(e) => setMaxViewers(Number(e.target.value))}
                          min={0}
                          className="w-full px-4 py-3 bg-black/50 border border-indigo-500/30 rounded-lg text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {streamUrl && (
                    <div className="p-4 bg-gradient-to-r from-purple-900/40 to-blue-900/40 rounded-lg border border-purple-500/30">
                      <p className="font-semibold text-white flex items-center gap-2 mb-3">
                        <span className="text-2xl">{isPaused ? '⏸️' : '▶️'}</span>
                        Stream Control
                      </p>
                      <button
                        onClick={togglePausePlay}
                        disabled={toggling}
                        className={`w-full px-6 py-3 rounded-lg font-bold transition-all hover:scale-105 shadow-lg disabled:opacity-50 ${isPaused
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                            : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
                          }`}
                      >
                        {toggling ? 'Processing...' : isPaused ? '▶️ Resume Stream' : '⏸️ Pause Stream'}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* ✅ LOOP MODE SETTINGS */}
              {mode === 'loop' && (
                <div className="space-y-4 p-4 bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-lg border border-purple-500/30">
                  <h3 className="text-lg font-semibold text-purple-300 mb-2">🔁 Loop Video Message</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Configure the message shown to players during maintenance
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-purple-300 mb-2">
                        📅 Next Game Date
                      </label>
                      <input
                        type="text"
                        value={loopNextGameDate}
                        onChange={(e) => setLoopNextGameDate(e.target.value)}
                        placeholder="e.g., 25 Nov 2025"
                        className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-purple-300 mb-2">
                        🕐 Next Game Time
                      </label>
                      <input
                        type="text"
                        value={loopNextGameTime}
                        onChange={(e) => setLoopNextGameTime(e.target.value)}
                        placeholder="e.g., 7:00 PM"
                        className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-purple-900/20 rounded border border-purple-500/20 mt-4">
                    <p className="text-xs text-purple-300">
                      📺 Preview: Players will see the loop video with message overlay
                    </p>
                    <div className="mt-2 p-2 bg-black/40 rounded">
                      <p className="text-sm text-white text-center font-semibold">
                        {loopNextGameDate || '[Date]'}
                      </p>
                      <p className="text-lg text-gold text-center font-bold">
                        {loopNextGameTime || '[Time]'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Message */}
              {message && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success'
                  ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                  : 'bg-red-500/20 border border-red-500/30 text-red-400'
                  }`}>
                  {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                  <span>{message.text}</span>
                </div>
              )}

              {/* Save Button */}
              <button
                onClick={saveConfig}
                disabled={saving}
                className="w-full px-6 py-3 bg-gradient-to-r from-gold to-yellow-600 hover:from-yellow-600 hover:to-gold text-black font-bold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Example URLs */}
        <div className="mt-6 bg-black/40 backdrop-blur-sm rounded-xl border border-blue-500/30 p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-4">📺 Supported Stream Types</h3>
          <div className="space-y-4 text-sm text-gray-300">
            <div>
              <strong className="text-blue-300">HLS Stream (.m3u8):</strong>
              <p className="text-gray-400 font-mono text-xs mt-1">
                Use with "Video" type. Example: https://yourserver.com/live/stream/index.m3u8
              </p>
            </div>
            <div>
              <strong className="text-blue-300">YouTube Embed (iFrame):</strong>
              <p className="text-gray-400 font-mono text-xs mt-1">
                Use with "iFrame" type. Example: https://www.youtube.com/embed/VIDEO_ID
              </p>
            </div>
            <div>
              <strong className="text-blue-300">Direct MP4 (Video):</strong>
              <p className="text-gray-400 font-mono text-xs mt-1">
                Use with "Video" type. Example: https://yourserver.com/video.mp4
              </p>
            </div>
          </div>
        </div>

        {/* Quick Guide */}
        <div className="mt-6 bg-gradient-to-r from-gold/20 to-yellow-600/20 border border-gold/30 rounded-xl p-6">
          <h3 className="text-xl font-bold text-gold mb-4">💡 How It Works</h3>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-start gap-3">
              <span className="text-gold font-bold">🎥</span>
              <div>
                <p className="text-gold font-semibold">Stream Mode (Loop OFF):</p>
                <p className="text-gray-400">Enter stream URL → Save → Players see your live stream</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gold font-bold">🔁</span>
              <div>
                <p className="text-purple-300 font-semibold">Loop Mode (Loop ON):</p>
                <p className="text-gray-400">Toggle Loop Mode ON → Set date/time message → Save → Players see loop video with your message</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
