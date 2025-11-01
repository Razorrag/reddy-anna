import React, { useState, useRef, useEffect } from 'react';
import { useAdminStream } from '@/contexts/AdminStreamContext';
import { useStreamSettings } from '@/hooks/useStreamSettings';
import { Button } from '@/components/ui/button';
import { Play, StopCircle, Pause, Monitor, Camera, Crop, Save } from 'lucide-react';
import ScreenShareCropper from './ScreenShareCropper';

const StreamControlPanelAdvanced: React.FC = () => {
  const {
    isStreaming,
    isPaused,
    isInitializing,
    isCropReady,
    startWebRTCScreenShare,
    stopWebRTCScreenShare,
    pauseStream,
    resumeStream,
    screenStream,
    originalStream,
    croppedStream,
    cropSettings,
    setCropSettings,
    confirmCropAndStart,
    skipCropAndStart,
    error
  } = useAdminStream();
  
  // ✅ Unified settings hook - syncs between admin dashboard and admin game control
  const { settings, loading: settingsLoading, saving: settingsSaving, saveSettings, loadSettings } = useStreamSettings();
  
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  
  // ✅ Sync local settings when loaded settings change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Update video preview when stream changes
  useEffect(() => {
    // ✅ CRITICAL: Prioritize cropped stream when crop is active and ready
    let previewStream: MediaStream | null = null;
    
    if (isCropReady && cropSettings?.enabled && croppedStream) {
      // ✅ After crop confirmation, show cropped stream (what players see)
      previewStream = croppedStream;
      console.log('✅ Preview: Using cropped stream (crop confirmed)');
    } else if (croppedStream && cropSettings?.enabled) {
      // ✅ Crop enabled but not ready yet, still show cropped if available
      previewStream = croppedStream;
      console.log('✅ Preview: Using cropped stream (crop pending)');
    } else if (screenStream) {
      // ✅ Fallback to screen stream
      previewStream = screenStream;
      console.log('✅ Preview: Using screen stream');
    } else if (originalStream) {
      // ✅ Last fallback to original stream
      previewStream = originalStream;
      console.log('✅ Preview: Using original stream');
    }
    
    if (videoPreviewRef.current) {
      // ✅ CRITICAL: Clear old stream first
      if (videoPreviewRef.current.srcObject) {
        videoPreviewRef.current.srcObject = null;
      }
      
      // Set new stream
      if (previewStream) {
        console.log('✅ Setting preview stream:', {
          hasCropped: !!croppedStream,
          hasScreen: !!screenStream,
          hasOriginal: !!originalStream,
          isCropReady,
          cropEnabled: cropSettings?.enabled,
          tracks: previewStream.getTracks().length
        });
        videoPreviewRef.current.srcObject = previewStream;
        
        // ✅ Ensure video plays
        videoPreviewRef.current.play().catch(err => {
          console.warn('⚠️ Video play error:', err);
        });
      }
    }
    
    // ✅ CRITICAL: Cleanup on unmount
    return () => {
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
      }
    };
  }, [screenStream, originalStream, croppedStream, isCropReady, cropSettings?.enabled]);

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gold flex items-center gap-3">
        <Monitor className="w-7 h-7" />
        Stream Control & Preview
      </h2>

      {/* Status Badge */}
      <div className="flex items-center justify-between bg-black/30 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isCropReady ? 'bg-green-500 animate-pulse' : isStreaming ? 'bg-yellow-500' : 'bg-gray-500'}`} />
          <span className="text-white font-medium">
            {isCropReady ? '🔴 Live Streaming' : isStreaming ? '⏳ Ready to Start' : 'Offline'}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm text-gray-400">Method: WebRTC</span>
          <span className="text-xs text-gray-500">~1 second latency</span>
        </div>
      </div>

      {/* Crop Confirmation Banner */}
      {isStreaming && !isCropReady && (
        <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-yellow-300 font-medium mb-2">
                Stream Ready - Configure Crop Area
              </p>
              <p className="text-sm text-gray-400 mb-3">
                {showCropper 
                  ? 'Adjust the crop area below, then click "Start Streaming" to broadcast to players.'
                  : 'Click "Crop Area" to select which part of your screen players will see, or click "Start Without Crop" to stream the full screen.'}
              </p>
              <div className="flex gap-2">
                {showCropper && cropSettings?.enabled && (
                  <Button
                    onClick={confirmCropAndStart}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Start Streaming
                  </Button>
                )}
                <Button
                  onClick={skipCropAndStart}
                  variant="outline"
                  className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10 font-bold py-2 px-4"
                >
                  Start Without Crop
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- STREAM PREVIEW WITH CROP --- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Live Preview
          </h3>
          {isStreaming && (
            <button
              onClick={() => setShowCropper(!showCropper)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
            >
              <Crop className="w-4 h-4" />
              {showCropper ? 'Hide Crop' : 'Crop Area'}
            </button>
          )}
        </div>
        
        {/* Show ScreenShareCropper if streaming and cropper enabled */}
        {isStreaming && showCropper && originalStream && !isCropReady ? (
          <div className="bg-black rounded-lg border-2 border-slate-600 shadow-2xl">
            <ScreenShareCropper
              sourceStream={originalStream}
              onCropChange={(crop) => {
                // ✅ Update crop settings in context - this triggers canvas rendering
                // Use try-catch to prevent crashes
                try {
                  if (crop) {
                    setCropSettings({
                      enabled: true,
                      ...crop
                    });
                  } else {
                    setCropSettings(null);
                  }
                } catch (err) {
                  console.error('Error setting crop:', err);
                }
              }}
            />
          </div>
        ) : (
          <div className="bg-black rounded-lg aspect-video overflow-hidden border-2 border-slate-600 shadow-2xl relative">
            {isStreaming ? (
              <>
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full"
                  style={{ 
                    objectFit: 'contain' // ✅ Always use contain to show full area without magnification
                  }}
                />
                {/* ✅ Show crop indicator when crop is active (before or after confirmation) */}
                {cropSettings?.enabled && (
                  <div className="absolute top-2 left-2 bg-green-900/80 border border-green-500/50 rounded px-2 py-1 text-xs text-green-300 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span>
                      {isCropReady ? '🔴 Live' : 'Crop'} {Math.round(cropSettings.width)}×{Math.round(cropSettings.height)}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                <div className="text-center text-slate-400">
                  <Monitor className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Preview will appear here</p>
                  <p className="text-sm mt-2">Click "Start Screen Share" below</p>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Crop status indicator */}
        {isStreaming && cropSettings?.enabled && !showCropper && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 text-green-300 mb-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="font-medium">Crop Active</span>
            </div>
            <div className="text-gray-400 text-xs">
              Players see: {Math.round(cropSettings.width)}×{Math.round(cropSettings.height)} at ({Math.round(cropSettings.x)}, {Math.round(cropSettings.y)})
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-300 text-sm">⚠️ {error}</p>
        </div>
      )}

      {/* --- MAIN CONTROLS --- */}
      <div className="grid grid-cols-2 gap-4">
        {!isStreaming ? (
          <Button 
            onClick={() => startWebRTCScreenShare()} 
            disabled={isInitializing} 
            className="col-span-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold text-lg py-6 flex items-center justify-center gap-3 shadow-lg"
          >
            <Play className="w-6 h-6" />
            {isInitializing ? 'Starting...' : 'Start Screen Share'}
          </Button>
        ) : (
          <>
            {isPaused ? (
              <Button 
                onClick={resumeStream} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-6 flex items-center justify-center gap-3"
              >
                <Play className="w-6 h-6" />
                Resume
              </Button>
            ) : (
              <Button 
                onClick={pauseStream} 
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold text-lg py-6 flex items-center justify-center gap-3"
              >
                <Pause className="w-6 h-6" />
                Pause
              </Button>
            )}
            <Button 
              onClick={stopWebRTCScreenShare} 
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-lg py-6 flex items-center justify-center gap-3"
            >
              <StopCircle className="w-6 h-6" />
              Stop
            </Button>
          </>
        )}
      </div>

      {/* --- INSTRUCTIONS --- */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <h3 className="text-blue-300 font-semibold mb-2 flex items-center gap-2">
          <Monitor className="w-4 h-4" />
          Quick Guide
        </h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Click "Start Screen Share" to begin streaming</li>
          <li>• Select which screen/window to share</li>
          <li>• Preview shows what players will see</li>
          <li>• Stream continues even if you switch tabs</li>
          <li>• Click "Stop" when done</li>
        </ul>
      </div>

      {/* --- STREAM SETTINGS (UNIFIED) --- */}
      <div className="space-y-4 pt-4 border-t border-slate-700">
        <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          Stream Settings
          <span className="text-xs text-gray-400 font-normal">(Synced across all admin pages)</span>
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Resolution */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Resolution</label>
            <select
              value={localSettings.resolution}
              onChange={(e) => setLocalSettings({ ...localSettings, resolution: e.target.value as any })}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600 focus:border-gold focus:outline-none"
              disabled={settingsSaving}
            >
              <option value="480p">480p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>
          </div>

          {/* FPS */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Frame Rate</label>
            <select
              value={localSettings.fps}
              onChange={(e) => setLocalSettings({ ...localSettings, fps: parseInt(e.target.value) as any })}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600 focus:border-gold focus:outline-none"
              disabled={settingsSaving}
            >
              <option value={15}>15 fps</option>
              <option value={24}>24 fps</option>
              <option value={30}>30 fps</option>
              <option value={60}>60 fps</option>
            </select>
          </div>

          {/* Bitrate */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Bitrate (kbps)</label>
            <input
              type="number"
              value={localSettings.bitrate}
              onChange={(e) => setLocalSettings({ ...localSettings, bitrate: Math.max(500, Math.min(10000, parseInt(e.target.value) || 2500)) })}
              min={500}
              max={10000}
              step={100}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600 focus:border-gold focus:outline-none"
              disabled={settingsSaving}
            />
          </div>
        </div>

        {/* Save Settings Button */}
        <Button
          onClick={async () => {
            const success = await saveSettings(localSettings);
            if (success) {
              // Settings saved successfully
            }
          }}
          disabled={settingsSaving || JSON.stringify(localSettings) === JSON.stringify(settings)}
          className="w-full bg-gradient-to-r from-gold to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-gray-900 font-bold py-2 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {settingsSaving ? 'Saving...' : 'Save Stream Settings'}
        </Button>

        {JSON.stringify(localSettings) !== JSON.stringify(settings) && (
          <p className="text-xs text-yellow-400 text-center">
            ⚠️ You have unsaved changes. Click "Save Stream Settings" to apply.
          </p>
        )}
      </div>

      {/* --- STREAM INFO --- */}
      <div className="grid grid-cols-3 gap-3 text-sm pt-4 border-t border-slate-700">
        <div className="bg-black/20 rounded-lg p-3">
          <div className="text-gray-400 mb-1">Method</div>
          <div className="text-white font-semibold">WebRTC</div>
        </div>
        <div className="bg-black/20 rounded-lg p-3">
          <div className="text-gray-400 mb-1">Latency</div>
          <div className="text-white font-semibold">~1 second</div>
        </div>
        <div className="bg-black/20 rounded-lg p-3">
          <div className="text-gray-400 mb-1">Quality</div>
          <div className="text-white font-semibold">{settings.resolution} {settings.fps}fps</div>
        </div>
      </div>

      {/* Status Messages */}
      {isStreaming && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <p className="text-green-300 text-sm text-center">
            ✅ Streaming active! Players can now see your screen.
          </p>
        </div>
      )}
    </div>
  );
};

export default StreamControlPanelAdvanced;


