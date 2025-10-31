import React, { useState, useRef, useEffect } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useNotification } from '@/contexts/NotificationContext';

interface AdminStreamControlProps {
  className?: string;
}

const AdminStreamControl: React.FC<AdminStreamControlProps> = ({ 
  className = '' 
}) => {
  const { sendWebSocketMessage } = useWebSocket();
  const { showNotification } = useNotification();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamMethod, setStreamMethod] = useState<'webrtc' | 'hls' | 'rtmp'>('webrtc');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [streamStats, setStreamStats] = useState({
    viewers: 0,
    bitrate: 0,
    resolution: '720p'
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start screen sharing
  const startScreenSharing = async () => {
    try {
      console.log('Starting screen sharing...');
      
      // Check if getDisplayMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        showNotification('❌ Screen sharing is not supported in this browser. Please use Chrome, Firefox, or Edge.', 'error');
        return;
      }

      // Check secure context
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        showNotification('❌ Screen sharing requires HTTPS connection. Please use HTTPS or localhost.', 'error');
        return;
      }
      
      // Request screen capture
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'never' // Hide cursor in screen share
          },
          audio: true
        });
      } catch (getDisplayError: any) {
        if (getDisplayError.name === 'NotAllowedError' || getDisplayError.name === 'PermissionDeniedError') {
          showNotification('❌ Screen sharing permission denied. Please allow screen sharing when prompted.', 'error');
          return;
        } else if (getDisplayError.name === 'NotReadableError' || getDisplayError.name === 'TrackStartError') {
          showNotification('❌ Could not access screen. Make sure no other application is using your screen.', 'error');
          return;
        } else if (getDisplayError.name === 'NotFoundError' || getDisplayError.name === 'DevicesNotFoundError') {
          showNotification('❌ No screen or window available for sharing.', 'error');
          return;
        }
        throw getDisplayError;
      }

      if (!stream || !stream.getVideoTracks().length) {
        showNotification('❌ Failed to capture screen. No video track available.', 'error');
        return;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Start recording/broadcasting
        if (streamMethod === 'webrtc') {
          startWebRTCStream(stream);
        } else {
          startMediaRecorder(stream);
        }

        setIsScreenSharing(true);
        setIsStreaming(true);
        
        // Send stream start notification
        sendWebSocketMessage({
          type: 'stream_start' as any,
          data: {
            method: streamMethod,
            url: `stream/${Date.now()}`,
            timestamp: Date.now()
          }
        });

        showNotification('✅ Screen sharing started successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to start screen sharing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      let userMessage = `❌ Failed to start screen sharing: ${errorMessage}`;
      if (errorMessage.includes('getDisplayMedia') || errorMessage.includes('get_display')) {
        userMessage = '❌ Screen sharing is not available. Please check your browser permissions and try again.';
      }
      showNotification(userMessage, 'error');
    }
  };

  // Stop screen sharing
  const stopScreenSharing = () => {
    console.log('Stopping screen sharing...');
    
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Stop media recorder if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    setIsScreenSharing(false);
    setIsStreaming(false);

    // Send stream stop notification
    sendWebSocketMessage({
      type: 'stream_stop' as any,
      data: {
        timestamp: Date.now()
      }
    });

    showNotification('Screen sharing stopped', 'info');
  };

  // Start WebRTC stream
  const startWebRTCStream = (stream: MediaStream) => {
    console.log('Starting WebRTC stream...');
    
    // This would typically send the stream to a WebRTC server
    // For now, we'll just simulate the connection
    setStreamStats(prev => ({ ...prev, viewers: 1 }));
  };

  // Start media recorder for HLS/RTMP
  const startMediaRecorder = (stream: MediaStream) => {
    console.log('Starting media recorder...');
    
    try {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Send chunks to server for HLS/RTMP processing
          console.log('Media chunk available:', event.data.size);
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;
    } catch (error) {
      console.error('Failed to start media recorder:', error);
    }
  };

  // Handle stream control commands from frontend
  useEffect(() => {
    const handleStreamControl = (event: any) => {
      const { action, data } = event.detail;
      console.log('Admin received stream control:', action, data);
      
      switch (action) {
        case 'pause':
          if (isStreaming) {
            // Pause the stream
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => {
                track.enabled = false;
              });
            }
            setIsStreaming(false);
            showNotification('Stream paused', 'warning');
          }
          break;
          
        case 'resume':
          if (!isStreaming && isScreenSharing) {
            // Resume the stream
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => {
                track.enabled = true;
              });
            }
            setIsStreaming(true);
            showNotification('Stream resumed', 'success');
          }
          break;
          
        case 'change_method':
          if (data?.method && data.method !== streamMethod) {
            const newMethod = data.method;
            setStreamMethod(newMethod);
            
            // Restart stream with new method if currently streaming
            if (isStreaming && streamRef.current) {
              stopScreenSharing();
              setTimeout(() => {
                startScreenSharing();
              }, 500);
            }
            
            showNotification(`Stream method changed to ${newMethod.toUpperCase()}`, 'info');
          }
          break;
      }
    };

    window.addEventListener('stream_control', handleStreamControl as EventListener);
    
    return () => {
      window.removeEventListener('stream_control', handleStreamControl as EventListener);
    };
  }, [isStreaming, isScreenSharing, streamMethod, showNotification]);

  // Update stream stats periodically
  useEffect(() => {
    const statsInterval = setInterval(() => {
      if (isStreaming) {
        setStreamStats(prev => ({
          ...prev,
          bitrate: Math.floor(Math.random() * 5000) + 1000, // Simulate bitrate
          viewers: Math.floor(Math.random() * 10) + 1 // Simulate viewers
        }));
      }
    }, 3000);

    return () => clearInterval(statsInterval);
  }, [isStreaming]);

  const toggleStream = () => {
    if (isScreenSharing) {
      stopScreenSharing();
    } else {
      startScreenSharing();
    }
  };

  const handleMethodChange = (method: 'webrtc' | 'hls' | 'rtmp') => {
    setStreamMethod(method);
    
    // Send method change notification
    sendWebSocketMessage({
      type: 'stream_status_update' as any,
      data: {
        status: isStreaming ? 'online' : 'offline',
        method: method,
        timestamp: Date.now()
      }
    });
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      {/* Stream Preview */}
      <div className="mb-4">
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-48 object-cover"
            style={{ display: isScreenSharing ? 'block' : 'none' }}
          />
          {!isScreenSharing && (
            <div className="w-full h-48 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-2">📹</div>
                <div className="text-sm">Screen Preview</div>
                <div className="text-xs opacity-75">Start sharing to see preview</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stream Controls */}
      <div className="space-y-4">
        {/* Stream Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-white font-medium">Stream Status:</span>
          <button
            onClick={toggleStream}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              isScreenSharing 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isScreenSharing ? '⏹️ Stop Stream' : '▶️ Start Stream'}
          </button>
        </div>

        {/* Stream Method Selection */}
        <div className="flex items-center justify-between">
          <span className="text-white font-medium">Stream Method:</span>
          <div className="flex space-x-2">
            <button
              onClick={() => handleMethodChange('webrtc')}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                streamMethod === 'webrtc' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-600 text-gray-300 hover:text-white'
              }`}
            >
              WebRTC
            </button>
            <button
              onClick={() => handleMethodChange('hls')}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                streamMethod === 'hls' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-600 text-gray-300 hover:text-white'
              }`}
            >
              HLS
            </button>
            <button
              onClick={() => handleMethodChange('rtmp')}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                streamMethod === 'rtmp' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-600 text-gray-300 hover:text-white'
              }`}
            >
              RTMP
            </button>
          </div>
        </div>

        {/* Stream Stats */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="bg-gray-700 p-2 rounded text-center">
            <div className="text-gray-300">Viewers</div>
            <div className="text-white font-bold">{streamStats.viewers}</div>
          </div>
          <div className="bg-gray-700 p-2 rounded text-center">
            <div className="text-gray-300">Bitrate</div>
            <div className="text-white font-bold">{streamStats.bitrate} kbps</div>
          </div>
          <div className="bg-gray-700 p-2 rounded text-center">
            <div className="text-gray-300">Resolution</div>
            <div className="text-white font-bold">{streamStats.resolution}</div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${
              isStreaming ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`}></span>
            <span className="text-white">
              {isStreaming ? '🔴 LIVE' : '⚫ OFFLINE'}
            </span>
          </div>
          <div className="text-gray-300">
            Method: <span className="font-medium">{streamMethod.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-gray-700 rounded text-xs text-gray-300">
        <div className="font-medium mb-1">Instructions:</div>
        <ul className="list-disc list-inside space-y-1">
          <li>Click "Start Stream" to begin screen sharing</li>
          <li>Choose WebRTC for low-latency, HLS/RTMP for broader compatibility</li>
          <li>Stream will automatically appear in the game area for players</li>
          <li>Use pause/resume controls to manage stream during gameplay</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminStreamControl;