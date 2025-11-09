/**
 * NEW STREAM SETTINGS PAGE
 * Simple, configurable stream URL system
 * - Admin enters stream URL (YouTube embed, custom player, etc.)
 * - Preview shows how it looks
 * - Players see full-screen video on game page
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Video, Eye, Save, RefreshCw, ExternalLink, Check, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface StreamConfig {
  streamUrl: string;
  streamType: 'iframe' | 'video' | 'custom';
  isActive: boolean;
  streamTitle: string;
  autoplay: boolean;
  muted: boolean;
  controls: boolean;
}

export default function AdminStreamSettingsNew() {
  const [, setLocation] = useLocation();
  const [config, setConfig] = useState<StreamConfig>({
    streamUrl: '',
    streamType: 'iframe',
    isActive: false,
    streamTitle: 'Live Game Stream',
    autoplay: true,
    muted: true,
    controls: false
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [testUrl, setTestUrl] = useState('');

  // Load current config
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<any>('/stream/simple-config');
      if (response.success && response.data) {
        setConfig(response.data);
        setTestUrl(response.data.streamUrl);
      }
    } catch (error) {
      console.error('Failed to load stream config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const response = await apiClient.post<any>('/stream/simple-config', config);
      if (response.success) {
        alert('✅ Stream settings saved successfully!');
      } else {
        alert('❌ Failed to save settings: ' + (response.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Failed to save stream config:', error);
      alert('❌ Failed to save settings: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const getEmbedCode = () => {
    if (!testUrl) return null;

    if (config.streamType === 'iframe') {
      return (
        <iframe
          src={testUrl}
          className="w-full h-full rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    } else if (config.streamType === 'video') {
      return (
        <video
          src={testUrl}
          className="w-full h-full rounded-lg object-cover"
          autoPlay={config.autoplay}
          muted={config.muted}
          controls={config.controls}
          loop
        />
      );
    }
    return null;
  };

  const exampleUrls = [
    {
      name: 'YouTube Live',
      url: 'https://www.youtube.com/embed/LIVE_VIDEO_ID',
      type: 'iframe' as const
    },
    {
      name: 'Vimeo',
      url: 'https://player.vimeo.com/video/VIDEO_ID',
      type: 'iframe' as const
    },
    {
      name: 'Custom HLS',
      url: 'https://your-server.com/stream.m3u8',
      type: 'video' as const
    },
    {
      name: 'MP4 Video',
      url: 'https://your-server.com/video.mp4',
      type: 'video' as const
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
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
          <p className="text-gray-400">Configure your live stream URL - Simple and powerful</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Configuration */}
          <div className="space-y-6">
            {/* Stream URL Input */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-gold/30 p-6">
              <h3 className="text-xl font-bold text-gold mb-4 flex items-center gap-2">
                <Video className="w-5 h-5" />
                Stream Configuration
              </h3>

              <div className="space-y-4">
                {/* Stream URL */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Stream URL *
                  </label>
                  <input
                    type="text"
                    value={config.streamUrl}
                    onChange={(e) => setConfig({ ...config, streamUrl: e.target.value })}
                    placeholder="https://www.youtube.com/embed/YOUR_VIDEO_ID"
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-gold focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter YouTube embed URL, Vimeo player URL, or direct video URL
                  </p>
                </div>

                {/* Stream Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Stream Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setConfig({ ...config, streamType: 'iframe' })}
                      className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                        config.streamType === 'iframe'
                          ? 'bg-gold text-black'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      iFrame (YouTube, Vimeo)
                    </button>
                    <button
                      onClick={() => setConfig({ ...config, streamType: 'video' })}
                      className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                        config.streamType === 'video'
                          ? 'bg-gold text-black'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      Video (MP4, HLS)
                    </button>
                  </div>
                </div>

                {/* Stream Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Stream Title
                  </label>
                  <input
                    type="text"
                    value={config.streamTitle}
                    onChange={(e) => setConfig({ ...config, streamTitle: e.target.value })}
                    placeholder="Live Game Stream"
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-gold focus:outline-none"
                  />
                </div>

                {/* Video Options (only for video type) */}
                {config.streamType === 'video' && (
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.autoplay}
                        onChange={(e) => setConfig({ ...config, autoplay: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-600 text-gold focus:ring-gold"
                      />
                      <span className="text-sm text-gray-300">Autoplay</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.muted}
                        onChange={(e) => setConfig({ ...config, muted: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-600 text-gold focus:ring-gold"
                      />
                      <span className="text-sm text-gray-300">Muted by default</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.controls}
                        onChange={(e) => setConfig({ ...config, controls: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-600 text-gold focus:ring-gold"
                      />
                      <span className="text-sm text-gray-300">Show controls</span>
                    </label>
                  </div>
                )}

                {/* Stream Status */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.isActive}
                      onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-600 text-gold focus:ring-gold"
                    />
                    <span className="text-sm font-semibold text-gray-300">
                      Stream Active (Players can see it)
                    </span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={saveConfig}
                    disabled={saving || !config.streamUrl}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save Settings
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setTestUrl(config.streamUrl);
                      setShowPreview(true);
                    }}
                    disabled={!config.streamUrl}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Eye className="w-5 h-5" />
                    Preview
                  </button>
                </div>
              </div>
            </div>

            {/* Example URLs */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-purple-500/30 p-6">
              <h3 className="text-lg font-bold text-purple-400 mb-4">📝 Example URLs</h3>
              <div className="space-y-3">
                {exampleUrls.map((example, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-purple-500/50 transition-all cursor-pointer"
                    onClick={() => {
                      setConfig({ ...config, streamUrl: example.url, streamType: example.type });
                      setTestUrl(example.url);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-white">{example.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{example.url}</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="space-y-6">
            {/* Preview Box */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-gold/30 p-6">
              <h3 className="text-xl font-bold text-gold mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Live Preview
              </h3>

              <div className="space-y-4">
                {/* Preview Container */}
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden border-2 border-gray-700">
                  {showPreview && testUrl ? (
                    getEmbedCode()
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500">Enter URL and click Preview</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview Info */}
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">Preview Info</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Stream Type:</span>
                      <span className="text-white font-semibold">{config.streamType.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className={`font-semibold ${config.isActive ? 'text-green-400' : 'text-red-400'}`}>
                        {config.isActive ? '🟢 Active' : '🔴 Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">URL Set:</span>
                      <span className={`font-semibold ${config.streamUrl ? 'text-green-400' : 'text-red-400'}`}>
                        {config.streamUrl ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </span>
                    </div>
                  </div>
                </div>

                {/* How it looks on game page */}
                <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-300 mb-2">📱 On Player Game Page</h4>
                  <p className="text-xs text-blue-200">
                    The video will fill the entire video area (65-70% of screen height) with countdown timer overlay. 
                    Players will see a full-screen, immersive stream experience.
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-green-500/30 p-6">
              <h3 className="text-lg font-bold text-green-400 mb-4">🎯 Quick Setup Guide</h3>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <div>
                    <strong className="text-green-300">Get your stream URL</strong>
                    <p className="text-gray-400 text-xs mt-1">
                      YouTube: Share → Embed → Copy iframe src
                      <br />
                      Custom: Use your HLS (.m3u8) or MP4 URL
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <div>
                    <strong className="text-green-300">Paste URL above</strong>
                    <p className="text-gray-400 text-xs mt-1">
                      Select correct stream type (iframe or video)
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <div>
                    <strong className="text-green-300">Click Preview</strong>
                    <p className="text-gray-400 text-xs mt-1">
                      Test how it looks before saving
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <div>
                    <strong className="text-green-300">Enable & Save</strong>
                    <p className="text-gray-400 text-xs mt-1">
                      Check "Stream Active" and click Save Settings
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
