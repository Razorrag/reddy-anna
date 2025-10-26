/**
 * Dual Stream Settings - Complete Streaming Control with Screen Share & Pause/Play
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { Play, Pause, MonitorPlay, Video, Settings, Eye, Copy, WifiOff } from 'lucide-react';

interface StreamConfig {
  activeMethod: 'rtmp' | 'webrtc';
  streamStatus: string;
  rtmpServerUrl: string;
  rtmpStreamKey: string;
  rtmpPlayerUrl: string;
  webrtcQuality: string;
  webrtcResolution: string;
  webrtcFps: number;
  webrtcBitrate: number;
  webrtcAudioEnabled: boolean;
  viewerCount: number;
}

const DualStreamSettings: React.FC = () => {
  const { showNotification } = useNotification();
  const [config, setConfig] = useState<StreamConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'rtmp' | 'webrtc'>('rtmp');
  const [isSaving, setIsSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  
  // WebRTC state
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Form states
  const [rtmpForm, setRtmpForm] = useState({ serverUrl: '', streamKey: '', playerUrl: '' });
  const [webrtcForm, setWebrtcForm] = useState({ quality: 'high', resolution: '720p', fps: 30, bitrate: 2500, audioEnabled: true });

  useEffect(() => {
    loadConfig();
    return () => { if (mediaStream) mediaStream.getTracks().forEach(t => t.stop()); };
  }, [mediaStream]);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/stream/config', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
        setActiveTab(data.data.activeMethod);
        setRtmpForm({ serverUrl: data.data.rtmpServerUrl || '', streamKey: data.data.rtmpStreamKey || '', playerUrl: data.data.rtmpPlayerUrl || '' });
        setWebrtcForm({ quality: data.data.webrtcQuality || 'high', resolution: data.data.webrtcResolution || '720p', fps: data.data.webrtcFps || 30, bitrate: data.data.webrtcBitrate || 2500, audioEnabled: data.data.webrtcAudioEnabled ?? true });
      }
    } catch (error) {
      showNotification('❌ Failed to load settings', 'error');
    }
  };

  const switchMethod = async (method: 'rtmp' | 'webrtc') => {
    try {
      const res = await fetch('/api/stream/method', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ method }) });
      if (res.ok) {
        showNotification(`✅ Switched to ${method.toUpperCase()}`, 'success');
        setActiveTab(method);
        loadConfig();
      }
    } catch (error) {
      showNotification('❌ Failed to switch method', 'error');
    }
  };

  const saveRTMP = async () => {
    if (!rtmpForm.serverUrl || !rtmpForm.streamKey) return showNotification('⚠️ Fill in RTMP URL and Key', 'error');
    setIsSaving(true);
    try {
      const res = await fetch('/api/stream/rtmp/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(rtmpForm) });
      if (res.ok) { showNotification('✅ RTMP settings saved', 'success'); loadConfig(); }
    } catch (error) {
      showNotification('❌ Failed to save', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const saveWebRTC = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/stream/webrtc/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(webrtcForm) });
      if (res.ok) { showNotification('✅ WebRTC settings saved', 'success'); loadConfig(); }
    } catch (error) {
      showNotification('❌ Failed to save', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: webrtcForm.resolution === '1080p' ? 1920 : 1280, height: webrtcForm.resolution === '1080p' ? 1080 : 720, frameRate: webrtcForm.fps },
        audio: webrtcForm.audioEnabled
      });
      setMediaStream(stream);
      setIsCapturing(true);
      setIsPaused(false);
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      await fetch('/api/stream/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ method: 'webrtc', status: 'online' }) });
      stream.getVideoTracks()[0].addEventListener('ended', stopCapture);
      showNotification('✅ Screen capture started', 'success');
    } catch (error) {
      showNotification('❌ Failed to start capture', 'error');
    }
  };

  const stopCapture = () => {
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setMediaStream(null);
    setIsCapturing(false);
    setIsPaused(false);
    fetch('/api/stream/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ method: 'webrtc', status: 'offline' }) });
    showNotification('🛑 Screen capture stopped', 'info');
  };

  const togglePause = () => {
    if (!mediaStream) return;
    const tracks = [...mediaStream.getVideoTracks(), ...mediaStream.getAudioTracks()];
    tracks.forEach(t => t.enabled = isPaused);
    setIsPaused(!isPaused);
    showNotification(isPaused ? '▶️ Resumed' : '⏸️ Paused', isPaused ? 'success' : 'info');
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    showNotification('📋 Copied', 'success');
  };

  if (!config) return <div className="bg-gray-800/90 rounded-lg border-2 border-gold/30 p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto"></div></div>;

  return (
    <div className="bg-gray-800/90 rounded-lg border-2 border-gold/30 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gold">🎥 Dual Streaming Control</h2>
          <p className="text-sm text-gray-400 mt-1">RTMP (OBS) or WebRTC (Browser Screen Share)</p>
        </div>
        <div className={`px-3 py-1.5 rounded-lg border font-semibold text-sm ${config.streamStatus === 'online' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
          {config.streamStatus === 'online' ? '🟢 LIVE' : '⚫ OFFLINE'} • {config.viewerCount} viewers
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 p-1 bg-gray-900/50 rounded-lg">
        <button onClick={() => switchMethod('rtmp')} className={`flex-1 py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 ${activeTab === 'rtmp' ? 'bg-gradient-to-r from-red-600 to-red-700 text-white' : 'text-gray-400 hover:bg-gray-800/50'}`}>
          <Video className="w-5 h-5" /> RTMP (OBS)
        </button>
        <button onClick={() => switchMethod('webrtc')} className={`flex-1 py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 ${activeTab === 'webrtc' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' : 'text-gray-400 hover:bg-gray-800/50'}`}>
          <MonitorPlay className="w-5 h-5" /> WebRTC (Browser)
        </button>
      </div>

      {/* RTMP Tab */}
      {activeTab === 'rtmp' && (
        <div className="space-y-4">
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 space-y-4">
            <h3 className="text-lg font-semibold text-gold flex items-center gap-2"><Settings className="w-5 h-5" /> RTMP Configuration</h3>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">RTMP Server URL</label>
              <div className="flex gap-2">
                <input type="text" value={rtmpForm.serverUrl} onChange={(e) => setRtmpForm(p => ({ ...p, serverUrl: e.target.value }))} className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold" placeholder="rtmp://live.restream.io/live" />
                <button onClick={() => copy(rtmpForm.serverUrl)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"><Copy className="w-5 h-5" /></button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Stream Key</label>
              <div className="flex gap-2">
                <input type={showKey ? 'text' : 'password'} value={rtmpForm.streamKey} onChange={(e) => setRtmpForm(p => ({ ...p, streamKey: e.target.value }))} className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold" />
                <button onClick={() => setShowKey(!showKey)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"><Eye className="w-5 h-5" /></button>
                <button onClick={() => copy(rtmpForm.streamKey)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"><Copy className="w-5 h-5" /></button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Player URL (Optional)</label>
              <input type="text" value={rtmpForm.playerUrl} onChange={(e) => setRtmpForm(p => ({ ...p, playerUrl: e.target.value }))} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold" placeholder="https://player.restream.io?token=xxx" />
            </div>
            <button onClick={saveRTMP} disabled={isSaving} className="w-full px-6 py-3 bg-gradient-to-r from-gold to-yellow-600 hover:from-gold/90 hover:to-yellow-600/90 disabled:from-gray-600 text-gray-900 rounded-lg font-semibold">{isSaving ? '⏳ Saving...' : '💾 Save RTMP Settings'}</button>
          </div>
          {config.streamStatus === 'online' && rtmpForm.playerUrl && (
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-gold mb-3">Live Preview</h3>
              <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                <iframe src={rtmpForm.playerUrl} width="100%" height="100%" frameBorder="0" allowFullScreen title="RTMP Preview" />
                <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold"><div className="w-2 h-2 bg-white rounded-full animate-pulse inline-block mr-1"></div>LIVE</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* WebRTC Tab */}
      {activeTab === 'webrtc' && (
        <div className="space-y-4">
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-gold mb-4 flex items-center gap-2"><MonitorPlay className="w-5 h-5" /> Screen Capture</h3>
            <div className="aspect-video bg-black rounded-lg overflow-hidden relative mb-4">
              {isCapturing ? (
                <>
                  <video ref={videoRef} autoPlay muted className="w-full h-full object-contain" />
                  <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold"><div className="w-2 h-2 bg-white rounded-full animate-pulse inline-block mr-1"></div>{isPaused ? 'PAUSED' : 'LIVE'}</div>
                  <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs">{webrtcForm.resolution} • {webrtcForm.fps}fps</div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center"><div className="text-center"><MonitorPlay className="w-16 h-16 text-gray-600 mx-auto mb-3" /><p className="text-gray-400 text-sm">Click "Start Screen Capture"</p></div></div>
              )}
            </div>
            <div className="flex gap-2">
              {!isCapturing ? (
                <button onClick={startCapture} className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"><Play className="w-5 h-5" /> Start Screen Capture</button>
              ) : (
                <>
                  <button onClick={togglePause} className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2">{isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />} {isPaused ? 'Resume' : 'Pause'}</button>
                  <button onClick={stopCapture} className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"><WifiOff className="w-5 h-5" /> Stop</button>
                </>
              )}
            </div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-gold mb-4 flex items-center gap-2"><Settings className="w-5 h-5" /> Quality Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Resolution</label><select value={webrtcForm.resolution} onChange={(e) => setWebrtcForm(p => ({ ...p, resolution: e.target.value }))} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold"><option value="480p">480p</option><option value="720p">720p</option><option value="1080p">1080p</option></select></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">FPS</label><select value={webrtcForm.fps} onChange={(e) => setWebrtcForm(p => ({ ...p, fps: parseInt(e.target.value) }))} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold"><option value="15">15</option><option value="30">30</option><option value="60">60</option></select></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Bitrate (kbps)</label><input type="number" value={webrtcForm.bitrate} onChange={(e) => setWebrtcForm(p => ({ ...p, bitrate: parseInt(e.target.value) }))} min="500" max="10000" className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-gold" /></div>
              <div className="flex items-center"><label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer"><input type="checkbox" checked={webrtcForm.audioEnabled} onChange={(e) => setWebrtcForm(p => ({ ...p, audioEnabled: e.target.checked }))} className="w-4 h-4 rounded border-gray-600 text-gold focus:ring-gold" /> Enable Audio</label></div>
            </div>
            <button onClick={saveWebRTC} disabled={isSaving} className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-gold to-yellow-600 hover:from-gold/90 hover:to-yellow-600/90 disabled:from-gray-600 text-gray-900 rounded-lg font-semibold">{isSaving ? '⏳ Saving...' : '💾 Save WebRTC Settings'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DualStreamSettings;
