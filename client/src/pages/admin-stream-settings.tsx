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
  const [streamUrl, setStreamUrl] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // NEW: Let admin choose how to play the URL
  // "iframe" for YouTube/embed players
  // "video" for direct MP4/HLS (.m3u8)
  const [streamType, setStreamType] = useState<'iframe' | 'video'>('iframe');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

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
        setStreamUrl(cfg.streamUrl || '');
        setIsActive(cfg.isActive || false);
        setIsPaused(cfg.isPaused || false);

        // If backend has streamType, use it, else infer from URL
        if (cfg.streamType === 'video' || cfg.streamType === 'iframe') {
          setStreamType(cfg.streamType);
        } else if (cfg.streamUrl && cfg.streamUrl.toLowerCase().endsWith('.m3u8')) {
          setStreamType('video');
        } else {
          setStreamType('iframe');
        }
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
      if (!streamUrl) {
        setMessage({ type: 'error', text: 'Stream URL is required' });
        setSaving(false);
        return;
      }

      const payload = {
        streamUrl,
        streamType, // 'iframe' or 'video' from UI toggle
        isActive,
        isPaused,
        streamTitle: 'Live Game Stream',
        autoplay: true,
        muted: true,
        controls: streamType === 'video' ? false : true
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
          <p className="text-gray-400">Configure your live stream URL - Simple and easy!</p>
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
              {/* Stream URL Input */}
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

              {/* Stream Type Selector */}
              <div>
                <label className="block text-sm font-semibold text-gold mb-2">
                  How should we play this URL?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStreamType('iframe')}
                    className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                      streamType === 'iframe'
                        ? 'bg-gold text-black shadow-lg'
                        : 'bg-black/40 text-gray-400 border border-gray-700 hover:border-gold/40'
                    }`}
                  >
                    iFrame (YouTube / Embed)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStreamType('video')}
                    className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                      streamType === 'video'
                        ? 'bg-green-500 text-black shadow-lg'
                        : 'bg-black/40 text-gray-400 border border-gray-700 hover:border-green-400/40'
                    }`}
                  >
                    Video (MP4 / HLS .m3u8)
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Select "Video" for HLS (.m3u8) or direct MP4 links. Use "iFrame" only for embed URLs.
                </p>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-green-500/20">
                <div>
                  <p className="font-semibold text-white">Stream Active</p>
                  <p className="text-sm text-gray-400">Enable stream visibility for players</p>
                </div>
                <button
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    isActive ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      isActive ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Pause/Play Control - Only show when stream is active */}
              {isActive && streamUrl && (
                <div className="p-4 bg-gradient-to-r from-purple-900/40 to-blue-900/40 rounded-lg border border-purple-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-white flex items-center gap-2">
                        <span className="text-2xl">{isPaused ? '⏸️' : '▶️'}</span>
                        Stream Playback Control
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        {isPaused
                          ? 'Stream is currently PAUSED for all players (frozen frame visible)'
                          : 'Stream is currently PLAYING for all players'}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={togglePausePlay}
                    disabled={toggling}
                    className={`w-full px-6 py-3 rounded-lg font-bold transition-all duration-200 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                      isPaused
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'
                        : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white'
                    }`}
                  >
                    {toggling ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        {isPaused ? 'Resuming...' : 'Pausing...'}
                      </>
                    ) : (
                      <>
                        <span className="text-xl">{isPaused ? '▶️' : '⏸️'}</span>
                        {isPaused ? 'Resume Stream for All Players' : 'Pause Stream for All Players'}
                      </>
                    )}
                  </button>
                  
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    💡 {isPaused
                      ? 'Click to resume playback - players will see the live stream again'
                      : 'Click to pause - players will see a frozen frame (no black screen)'}
                  </p>
                </div>
              )}

              {/* Status Message */}
              {message && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${
                  message.type === 'success' 
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
                disabled={saving || !streamUrl}
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
              <span className="text-gold font-bold">1.</span>
              <p className="text-gray-400">Enter your stream URL above (HLS, YouTube, or any video URL)</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gold font-bold">2.</span>
              <p className="text-gray-400">Enable "Stream Active" to make it visible to players</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gold font-bold">3.</span>
              <p className="text-gray-400">Click "Save Settings"</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gold font-bold">4.</span>
              <p className="text-gray-400">Players will see the stream full-screen on the game page!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
