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
      
      // Enhanced diagnostics
      const isLocalhost = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1' || 
                          window.location.hostname === '[::1]';
      const isSecure = window.location.protocol === 'https:' || window.isSecureContext;
      
      const diagnostics = {
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        hasMediaDevices: !!navigator.mediaDevices,
        hasGetDisplayMedia: typeof navigator.mediaDevices?.getDisplayMedia,
        isSecureContext: window.isSecureContext,
        isLocalhost,
        isSecure
      };
      console.log('🖥️ Screen Share Diagnostics:', diagnostics);
      
      // Check 1: Basic browser API availability
      if (!navigator.mediaDevices) {
        showNotification('❌ Screen sharing is not supported in this browser. navigator.mediaDevices is not available. Please use a modern browser like Chrome, Firefox, or Edge.', 'error');
        return;
      }
      
      // Check 2: getDisplayMedia method exists
      if (typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
        // This could mean: browser doesn't support it OR not in secure context
        if (!isSecure && !isLocalhost) {
          showNotification('❌ Screen sharing requires HTTPS connection. Current: ' + window.location.protocol + '//' + window.location.hostname + '. Please use https:// instead of http:// on your VPS.', 'error');
        } else {
          showNotification('❌ Screen sharing is not supported in this browser. getDisplayMedia API is not available. Please use Chrome 72+, Firefox 66+, or Edge 79+.', 'error');
        }
        return;
      }

      // Check 3: Secure context for VPS
      if (!isSecure && !isLocalhost) {
        showNotification('❌ Screen sharing requires HTTPS connection. Please use https:// instead of http:// on your VPS.', 'error');
        return;
      }
      
      // Request screen capture with comprehensive error handling
      let stream: MediaStream;
      try {
        // Double-check secure context before attempting getDisplayMedia
        const isLocalhost = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1' || 
                            window.location.hostname === '[::1]';
        if (!window.isSecureContext && !isLocalhost) {
          throw new DOMException('Screen sharing requires HTTPS on VPS. Please use https:// instead of http://', 'SecurityError');
        }

        // Check if getDisplayMedia is available one more time before calling
        if (typeof navigator.mediaDevices?.getDisplayMedia !== 'function') {
          throw new DOMException('getDisplayMedia is not available. Please use a modern browser (Chrome, Firefox, Edge)', 'NotSupportedError');
        }

        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'never' // Hide cursor in screen share
          },
          audio: true
        });
      } catch (getDisplayError: any) {
        // Prevent the "get sidplay error" by catching all possible errors
        console.error('❌ getDisplayMedia error caught:', {
          name: getDisplayError?.name,
          message: getDisplayError?.message
        });

        // Handle user cancellation gracefully (not an error)
        if (getDisplayError?.name === 'NotAllowedError' || getDisplayError?.name === 'PermissionDeniedError' || getDisplayError?.name === 'AbortError') {
          showNotification('ℹ️ Screen sharing cancelled. Please try again when ready.', 'info');
          return;
        } 
        // Handle security context errors
        else if (getDisplayError?.name === 'SecurityError' || getDisplayError?.message?.includes('HTTPS')) {
          const errorMsg = '❌ Screen sharing requires HTTPS connection. Current: ' + window.location.protocol + '//' + window.location.hostname + '. Please use https:// instead of http:// on your VPS.';
          showNotification(errorMsg, 'error');
          return;
        } 
        // Handle browser not supported
        else if (getDisplayError?.name === 'NotSupportedError' || getDisplayError?.message?.includes('not available') || getDisplayError?.message?.includes('not supported')) {
          showNotification('❌ Screen sharing is not supported in this browser. Please use Chrome, Firefox, or Edge.', 'error');
          return;
        }
        // Handle screen access errors
        else if (getDisplayError?.name === 'NotReadableError' || getDisplayError?.name === 'TrackStartError') {
          showNotification('❌ Could not access screen. Make sure no other application is using your screen.', 'error');
          return;
        } 
        // Handle device not found
        else if (getDisplayError?.name === 'NotFoundError' || getDisplayError?.name === 'DevicesNotFoundError') {
          showNotification('❌ No screen or window available for sharing.', 'error');
          return;
        } 
        // Handle generic errors with helpful message
        else {
          const errorMsg = getDisplayError?.message || 'Unknown error occurred';
          let userMessage = '❌ Screen sharing failed. ';
          if (errorMsg.includes('getDisplayMedia') || errorMsg.includes('get_display') || errorMsg.includes('getDisplay')) {
            userMessage += 'The browser API is not available. Please check HTTPS configuration and browser permissions.';
          } else if (errorMsg.includes('permission') || errorMsg.includes('denied')) {
            userMessage += 'Permission was denied. Please allow screen sharing when prompted.';
          } else if (errorMsg.includes('HTTPS') || errorMsg.includes('secure') || errorMsg.includes('SSL')) {
            userMessage += 'HTTPS is required for screen sharing on VPS. Please configure SSL certificate.';
          } else {
            userMessage += errorMsg;
          }
          showNotification(userMessage, 'error');
          return; // Don't throw - prevent "get sidplay error" from propagating
        }
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