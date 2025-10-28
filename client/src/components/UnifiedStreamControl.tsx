/**
 * Unified Stream Control Component
 * 
 * Consolidates both RTMP and WebRTC streaming into a single comprehensive interface
 * Replaces the duplicate DualStreamSettings and AdminStreamControl components
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { webrtcClient } from '../lib/webrtc-client';
import { Play, Pause, MonitorPlay, Video, Settings, Eye, Copy, WifiOff, Wifi, RefreshCw } from 'lucide-react';

interface StreamConfig {
  id: string;
  activeMethod: 'rtmp' | 'webrtc' | 'none';
  streamStatus: 'online' | 'offline' | 'connecting' | 'error';
  streamTitle: string;
  
  // RTMP
  rtmpServerUrl: string;
  rtmpStreamKey: string;
  rtmpPlayerUrl: string;
  rtmpStatus: string;
  rtmpLastCheck: string | null;
  
  // WebRTC
  webrtcEnabled: boolean;
  webrtcQuality: 'low' | 'medium' | 'high' | 'ultra';
  webrtcResolution: '480p' | '720p' | '1080p';
  webrtcFps: number;
  webrtcBitrate: number;
  webrtcAudioEnabled: boolean;
  webrtcScreenSource: 'screen' | 'window' | 'tab';
  webrtcRoomId: string;
  webrtcLastCheck: string | null;
  
  // Analytics
  viewerCount: number;
  totalViews: number;
  streamDurationSeconds: number;
}

const UnifiedStreamControl: React.FC = () => {
  const { showNotification } = useNotification();
  const { token } = useAuth();
  const [config, setConfig] = useState<StreamConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'rtmp' | 'webrtc'>('rtmp');
  
  // WebRTC state
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [webrtcStatus, setWebrtcStatus] = useState<string>('disconnected');
  const [activeStreams, setActiveStreams] = useState<Array<{streamId: string; adminUserId: string}>>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Form states
  const [rtmpForm, setRtmpForm] = useState({ serverUrl: '', streamKey: '', playerUrl: '' });
  const [webrtcForm, setWebrtcForm] = useState({ 
    quality: 'high', 
    resolution: '720p', 
    fps: 30, 
    bitrate: 2500, 
    audioEnabled: true,
    screenSource: 'screen' 
  });

  useEffect(() => {
    loadConfig();
    loadActiveStreams();
    setupWebSocket();
    
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (webrtcClient.getLocalStream()) {
      webrtcClient.getLocalStream()!.getTracks().forEach(t => t.stop());
    }
    webrtcClient.destroy();
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/stream/config', { 
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      if (data.success) {
        setConfig(data.data);
        setActiveTab(data.data.activeMethod === 'webrtc' ? 'webrtc' : 'rtmp');
        setRtmpForm({ 
          serverUrl: data.data.rtmpServerUrl || '', 
          streamKey: data.data.rtmpStreamKey || '', 
          playerUrl: data.data.rtmpPlayerUrl || '' 
        });
        setWebrtcForm({ 
          quality: data.data.webrtcQuality || 'high', 
          resolution: data.data.webrtcResolution || '720p', 
          fps: data.data.webrtcFps || 30, 
          bitrate: data.data.webrtcBitrate || 2500, 
          audioEnabled: data.data.webrtcAudioEnabled ?? true,
          screenSource: data.data.webrtcScreenSource || 'screen'
        });
      }
    } catch (error) {
      console.error('Failed to load unified stream config:', error);
      showNotification('❌ Failed to load stream settings', 'error');
    }
  };

  const loadActiveStreams = async () => {
    try {
      const res = await fetch('/api/stream/sessions', { 
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      if (data.success) {
        setActiveStreams(data.data);
      }
    } catch (error) {
      console.error('Failed to load active streams:', error);
    }
  };

  const setupWebSocket = () => {
    if (!token) return;

    try {
      wsRef.current = new WebSocket(`ws://localhost:3001?token=${token}`);
      
      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected for unified streaming');
      };
      
      wsRef.current.onmessage = (event) => {
        handleWebSocketMessage(event.data);
      };
      
      wsRef.current.onclose = () => {
        console.log('⚠️ WebSocket disconnected');
        // Attempt to reconnect after 3 seconds
        setTimeout(setupWebSocket, 3000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Failed to setup WebSocket:', error);
    }
  };

  const handleWebSocketMessage = (data: string) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'webrtc:signal':
          handleWebRTCSignal(message.data);
          break;
        case 'stream_status':
          handleStreamStatusUpdate(message.data);
          break;
        case 'viewer_count':
          handleViewerCountUpdate(message.data);
          break;
      }
    } catch (error) {
      console.error('Failed to handle WebSocket message:', error);
    }
  };

  const handleWebRTCSignal = (signal: any) => {
    const { type, from, streamId, sdp, candidate } = signal;
    
    switch (type) {
      case 'offer':
        // webrtcClient.emit('offer_received', { from, streamId, sdp });
        break;
      case 'answer':
        webrtcClient.handleAnswer(sdp);
        break;
      case 'ice-candidate':
        webrtcClient.addIceCandidate(candidate);
        break;
      case 'stream-start':
        loadActiveStreams();
        break;
      case 'stream-stop':
        loadActiveStreams();
        break;
    }
  };

  const handleStreamStatusUpdate = (data: any) => {
    if (data.method === 'webrtc') {
      setWebrtcStatus(data.status);
      if (data.status === 'online' && !isCapturing) {
        setIsCapturing(true);
      } else if (data.status === 'offline') {
        setIsCapturing(false);
        setIsPaused(false);
      }
    }
    loadConfig(); // Refresh config
  };

  const handleViewerCountUpdate = (data: any) => {
    setConfig(prev => prev ? { ...prev, viewerCount: data.count } : null);
  };

  const switchMethod = async (method: 'rtmp' | 'webrtc') => {
    if (isCapturing && method === 'rtmp') {
      const confirmed = window.confirm('Switching to RTMP will stop the current WebRTC stream. Continue?');
      if (!confirmed) return;
      stopCapture();
    }

    try {
      const res = await fetch('/api/stream/method', { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include', 
        body: JSON.stringify({ method }) 
      });
      
      if (res.ok) {
        showNotification(`✅ Switched to ${method.toUpperCase()}`, 'success');
        setActiveTab(method);
        loadConfig();
      } else {
        throw new Error('Failed to switch method');
      }
    } catch (error) {
      showNotification('❌ Failed to switch method', 'error');
    }
  };

  const saveRTMP = async () => {
    if (!rtmpForm.serverUrl || !rtmpForm.streamKey) {
      return showNotification('⚠️ Fill in RTMP URL and Key', 'error');
    }
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/stream/rtmp/config', { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include', 
        body: JSON.stringify(rtmpForm) 
      });
      
      if (res.ok) { 
        showNotification('✅ RTMP settings saved', 'success'); 
        loadConfig(); 
      } else {
        throw new Error('Failed to save RTMP config');
      }
    } catch (error) {
      showNotification('❌ Failed to save', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const saveWebRTC = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/stream/webrtc/config', { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include', 
        body: JSON.stringify(webrtcForm) 
      });
      
      if (res.ok) { 
        showNotification('✅ WebRTC settings saved', 'success'); 
        loadConfig(); 
      } else {
        throw new Error('Failed to save WebRTC config');
      }
    } catch (error) {
      showNotification('❌ Failed to save', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const startCapture = async () => {
    try {
      // Initialize WebRTC client
      await webrtcClient.initialize();
      
      // Setup event listeners
      webrtcClient.on('status_change', (status: string) => {
        setWebrtcStatus(status);
        if (status === 'connected') {
          showNotification('✅ WebRTC connection established', 'success');
        }
      });
      
      webrtcClient.on('screen_captured', (stream: MediaStream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setIsCapturing(true);
        setIsPaused(false);
      });
      
      webrtcClient.on('error', (error: Error) => {
        showNotification(`❌ WebRTC error: ${error.message}`, 'error');
      });
      
      // Start screen capture
      await webrtcClient.startCapture();
      
      // Update stream status
      await fetch('/api/stream/status', { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include', 
        body: JSON.stringify({ method: 'webrtc', status: 'online' }) 
      });
      
      showNotification('✅ Screen capture started', 'success');
    } catch (error) {
      showNotification('❌ Failed to start capture', 'error');
    }
  };

  const stopCapture = () => {
    webrtcClient.stopCapture();
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsCapturing(false);
    setIsPaused(false);
    
    // Update stream status
    fetch('/api/stream/status', { 
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include', 
      body: JSON.stringify({ method: 'webrtc', status: 'offline' }) 
    });
    
    showNotification('🛑 Screen capture stopped', 'info');
  };

  const togglePause = () => {
    if (!webrtcClient.getLocalStream()) return;
    
    const tracks = [...webrtcClient.getLocalStream()!.getVideoTracks(), ...webrtcClient.getLocalStream()!.getAudioTracks()];
    tracks.forEach(t => t.enabled = !isPaused);
    setIsPaused(!isPaused);
    
    showNotification(isPaused ? '▶️ Resumed' : '⏸️ Paused', isPaused ? 'success' : 'info');
  };

  const updateStreamTitle = async () => {
    if (!config?.streamTitle?.trim()) {
      return showNotification('⚠️ Stream title is required', 'error');
    }
    
    try {
      const res = await fetch('/api/stream/title', { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include', 
        body: JSON.stringify({ title: config.streamTitle }) 
      });
      
      if (res.ok) {
        showNotification('✅ Stream title updated', 'success');
      } else {
        throw new Error('Failed to update title');
      }
    } catch (error) {
      showNotification('❌ Failed to update title', 'error');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showNotification(`📋 ${label} copied`, 'success');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return '🟢';
      case 'connecting': return '🟡';
      case 'error': return '🔴';
      default: return '⚫';
    }
  };

  if (!config) {
    return (
      <div className="bg-gray-800/90 rounded-lg border-2 border-gold/30 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/90 rounded-lg border-2 border-gold/30 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gold flex items-center gap-2">
            🎥 Unified Streaming Control
          </h2>
          <p className="text-sm text-gray-400 mt-1">RTMP (OBS) or WebRTC (Browser Screen Share)</p>
        </div>
        <div className={`px-4 py-2 rounded-lg border font-semibold text-sm ${getStatusColor(config.streamStatus)}`}>
          {getStatusIcon(config.streamStatus)} {config.streamStatus.charAt(0).toUpperCase() + config.streamStatus.slice(1)}
          {config.viewerCount > 0 && ` • ${config.viewerCount} viewers`}
          {config.totalViews > 0 && ` • ${config.totalViews} total views`}
        </div>
      </div>

      {/* Stream Method Tabs */}
      <div className="flex gap-3 p-1 bg-gray-900/50 rounded-lg">
        <button 
          onClick={() => switchMethod('rtmp')} 
          className={`flex-1 py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 ${
            activeTab === 'rtmp' 
              ? 'bg-gradient-to-r from-red-600 to-red-700 text-white' 
              : 'text-gray-400 hover:bg-gray-800/50'
          }`}
        >
          <Video className="w-5 h-5" /> RTMP (OBS)
        </button>
        <button 
          onClick={() => switchMethod('webrtc')} 
          className={`flex-1 py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 ${
            activeTab === 'webrtc' 
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
              : 'text-gray-400 hover:bg-gray-800/50'
          }`}
        >
          <MonitorPlay className="w-5 h-5" /> WebRTC (Browser)
        </button>
      </div>

      {/* Stream Title */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-gold flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5" /> Stream Configuration
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={config.streamTitle || ''}
            onChange={(e) => setConfig(prev => prev ? { ...prev, streamTitle: e.target.value } : null)}
            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold"
            placeholder="Enter stream title..."
          />
          <button
            onClick={updateStreamTitle}
            className="px-6 py-2 bg-gradient-to-r from-gold to-yellow-600 hover:from-gold/90 hover:to-yellow-600/90 text-gray-900 rounded-lg font-semibold"
          >
            💾 Save Title
          </button>
        </div>
      </div>

      {/* RTMP Tab */}
      {activeTab === 'rtmp' && (
        <div className="space-y-4">
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 space-y-4">
            <h3 className="text-lg font-semibold text-gold flex items-center gap-2">
              <Settings className="w-5 h-5" /> RTMP Configuration
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">RTMP Server URL</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={rtmpForm.serverUrl} 
                  onChange={(e) => setRtmpForm(p => ({ ...p, serverUrl: e.target.value }))} 
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold" 
                  placeholder="rtmp://live.restream.io/live" 
                />
                <button 
                  onClick={() => copyToClipboard(rtmpForm.serverUrl, 'RTMP URL')} 
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
                  value={rtmpForm.streamKey} 
                  onChange={(e) => setRtmpForm(p => ({ ...p, streamKey: e.target.value }))} 
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold" 
                />
                <button 
                  onClick={() => setShowKey(!showKey)} 
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                >
                  {showKey ? '👁️' : '👁️‍🗨️'}
                </button>
                <button 
                  onClick={() => copyToClipboard(rtmpForm.streamKey, 'Stream key')} 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Player URL (Optional)</label>
              <input 
                type="text" 
                value={rtmpForm.playerUrl} 
                onChange={(e) => setRtmpForm(p => ({ ...p, playerUrl: e.target.value }))} 
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold" 
                placeholder="https://player.restream.io?token=xxx" 
              />
            </div>
            <button 
              onClick={saveRTMP} 
              disabled={isLoading} 
              className="w-full px-6 py-3 bg-gradient-to-r from-gold to-yellow-600 hover:from-gold/90 hover:to-yellow-600/90 disabled:from-gray-600 text-gray-900 rounded-lg font-semibold"
            >
              {isLoading ? '⏳ Saving...' : '💾 Save RTMP Settings'}
            </button>
          </div>
          
          {config.streamStatus === 'online' && rtmpForm.playerUrl && (
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-gold mb-3">Live Preview</h3>
              <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                <iframe 
                  src={rtmpForm.playerUrl} 
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  allowFullScreen 
                  title="RTMP Preview" 
                />
                <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse inline-block mr-1"></div>LIVE
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* WebRTC Tab */}
      {activeTab === 'webrtc' && (
        <div className="space-y-4">
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-gold mb-4 flex items-center gap-2">
              <MonitorPlay className="w-5 h-5" /> Screen Capture
            </h3>
            <div className="aspect-video bg-black rounded-lg overflow-hidden relative mb-4">
              {isCapturing ? (
                <>
                  <video ref={videoRef} autoPlay muted className="w-full h-full object-contain" />
                  <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse inline-block mr-1"></div>
                    {isPaused ? 'PAUSED' : 'LIVE'}
                  </div>
                  <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                    {webrtcForm.resolution} • {webrtcForm.fps}fps • {webrtcStatus}
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <MonitorPlay className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Click "Start Screen Capture"</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {!isCapturing ? (
                <button 
                  onClick={startCapture} 
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" /> Start Screen Capture
                </button>
              ) : (
                <>
                  <button 
                    onClick={togglePause} 
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                  >
                    {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />} {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button 
                    onClick={stopCapture} 
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                  >
                    <WifiOff className="w-5 h-5" /> Stop
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-gold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" /> Quality Settings
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Resolution</label>
                <select 
                  value={webrtcForm.resolution} 
                  onChange={(e) => setWebrtcForm(p => ({ ...p, resolution: e.target.value as any }))} 
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
                  value={webrtcForm.fps} 
                  onChange={(e) => setWebrtcForm(p => ({ ...p, fps: parseInt(e.target.value) }))} 
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold"
                >
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={60}>60</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bitrate (kbps)</label>
                <input 
                  type="number" 
                  value={webrtcForm.bitrate} 
                  onChange={(e) => setWebrtcForm(p => ({ ...p, bitrate: parseInt(e.target.value) }))} 
                  min="500" 
                  max="10000" 
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold" 
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={webrtcForm.audioEnabled} 
                    onChange={(e) => setWebrtcForm(p => ({ ...p, audioEnabled: e.target.checked }))} 
                    className="w-4 h-4 rounded border-gray-600 text-gold focus:ring-gold" 
                  /> 
                  Enable Audio
                </label>
              </div>
            </div>
            <button 
              onClick={saveWebRTC} 
              disabled={isLoading} 
              className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-gold to-yellow-600 hover:from-gold/90 hover:to-yellow-600/90 disabled:from-gray-600 text-gray-900 rounded-lg font-semibold"
            >
              {isLoading ? '⏳ Saving...' : '💾 Save WebRTC Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Active Streams */}
      {activeStreams.length > 0 && (
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-semibold text-gold mb-3 flex items-center gap-2">
            <Wifi className="w-5 h-5" /> Active WebRTC Streams
          </h3>
          <div className="space-y-2">
            {activeStreams.map(stream => (
              <div key={stream.streamId} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                <span className="text-sm text-gray-300">Stream: {stream.streamId}</span>
                <span className="text-sm text-green-400">🟢 Active</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={() => { loadConfig(); loadActiveStreams(); }}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </div>
  );
};

export default UnifiedStreamControl;