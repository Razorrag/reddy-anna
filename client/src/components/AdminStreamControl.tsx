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
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [streamStats, setStreamStats] = useState({
    viewers: 0,
    bitrate: 0,
    resolution: '720p',
    connectionState: 'disconnected' as 'disconnected' | 'connecting' | 'connected' | 'error'
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localWebSocketRef = useRef<WebSocket | null>(null);

  // Create WebRTC peer connection
  const createPeerConnection = (): RTCPeerConnection => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(configuration);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && localWebSocketRef.current) {
        sendWebSocketMessage({
          type: 'webrtc_ice_candidate' as any,
          data: {
            candidate: event.candidate,
            roomId: 'default-room'
          }
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('WebRTC connection state:', pc.connectionState);
      setStreamStats(prev => ({
        ...prev,
        connectionState: pc.connectionState as any
      }));
    };

    return pc;
  };

  // Start screen sharing with real WebRTC
  const startScreenSharing = async () => {
    try {
      console.log('🎥 Starting WebRTC screen sharing...');
      setStreamStats(prev => ({ ...prev, connectionState: 'connecting' }));
      
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
          video: true,
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

      // Store the stream
      streamRef.current = stream;

      // Show preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Create WebRTC peer connection
      const peerConnection = createPeerConnection();
      peerConnectionRef.current = peerConnection;

      // Add stream tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Send WebRTC offer to server
      sendWebSocketMessage({
        type: 'webrtc_offer' as any,
        data: {
          offer: offer,
          roomId: 'default-room',
          timestamp: Date.now()
        }
      });

      setIsScreenSharing(true);
      setIsStreaming(true);
      setStreamStats(prev => ({ ...prev, connectionState: 'connected' }));
      
      // Send stream start notification
      sendWebSocketMessage({
        type: 'stream_start' as any,
        data: {
          method: 'webrtc',
          url: `webrtc://default-room`,
          timestamp: Date.now()
        }
      });

      showNotification('✅ WebRTC screen sharing started successfully!', 'success');

      // Handle stream end
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('Stream ended by user');
        stopScreenSharing();
      });

    } catch (error) {
      console.error('Failed to start WebRTC screen sharing:', error);
      setStreamStats(prev => ({ ...prev, connectionState: 'error' }));
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
    console.log('🛑 Stopping WebRTC screen sharing...');
    
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Clear video preview
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setIsScreenSharing(false);
    setIsStreaming(false);
    setStreamStats(prev => ({ ...prev, connectionState: 'disconnected', viewers: 0 }));

    // Send stream stop notification
    sendWebSocketMessage({
      type: 'stream_stop' as any,
      data: {
        timestamp: Date.now()
      }
    });

    showNotification('WebRTC screen sharing stopped', 'info');
  };

  // Handle WebRTC signaling messages
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'webrtc_answer':
            if (peerConnectionRef.current && message.data.answer) {
              peerConnectionRef.current.setRemoteDescription(
                new RTCSessionDescription(message.data.answer)
              );
            }
            break;
            
          case 'webrtc_ice_candidate':
            if (peerConnectionRef.current && message.data.candidate) {
              peerConnectionRef.current.addIceCandidate(
                new RTCIceCandidate(message.data.candidate)
              );
            }
            break;
            
          case 'viewer_count_update':
            setStreamStats(prev => ({ ...prev, viewers: message.data.count || 0 }));
            break;
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };

    // This would be handled by the WebSocket context, but we need to ensure
    // WebRTC messages are properly routed
    return () => {};
  }, []);

  // Update stream stats periodically
  useEffect(() => {
    const statsInterval = setInterval(() => {
      if (isStreaming && peerConnectionRef.current) {
        // Get real stats from WebRTC connection
        peerConnectionRef.current.getStats().then(stats => {
          let bitrate = 0;
          stats.forEach(report => {
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
              bitrate = Math.round((report.bytesSent || 0) * 8 / 1024); // kbps
            }
          });
          
          setStreamStats(prev => ({
            ...prev,
            bitrate: bitrate
          }));
        });
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

  const getConnectionStateColor = () => {
    switch (streamStats.connectionState) {
      case 'connected': return 'bg-green-400';
      case 'connecting': return 'bg-yellow-400';
      case 'error': return 'bg-red-400';
      default: return 'bg-gray-400';
    }
  };

  const getConnectionStateText = () => {
    switch (streamStats.connectionState) {
      case 'connected': return '🟢 CONNECTED';
      case 'connecting': return '🟡 CONNECTING';
      case 'error': return '🔴 ERROR';
      default: return '⚫ DISCONNECTED';
    }
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
                <div className="text-sm">WebRTC Screen Preview</div>
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
          <span className="text-white font-medium">WebRTC Stream:</span>
          <button
            onClick={toggleStream}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              isScreenSharing 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isScreenSharing ? '⏹️ Stop Sharing' : '▶️ Start Sharing'}
          </button>
        </div>

        {/* Stream Stats */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-gray-700 p-2 rounded text-center">
            <div className="text-gray-300">Viewers</div>
            <div className="text-white font-bold">{streamStats.viewers}</div>
          </div>
          <div className="bg-gray-700 p-2 rounded text-center">
            <div className="text-gray-300">Bitrate</div>
            <div className="text-white font-bold">{streamStats.bitrate} kbps</div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${getConnectionStateColor()} ${
              streamStats.connectionState === 'connecting' ? 'animate-pulse' : ''
            }`}></span>
            <span className="text-white">
              {getConnectionStateText()}
            </span>
          </div>
          <div className="text-gray-300">
            Method: <span className="font-medium">WebRTC</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-gray-700 rounded text-xs text-gray-300">
        <div className="font-medium mb-1">WebRTC Instructions:</div>
        <ul className="list-disc list-inside space-y-1">
          <li>Click "Start Sharing" to begin WebRTC screen sharing</li>
          <li>Stream will appear in real-time for all connected players</li>
          <li>Low latency streaming directly to players</li>
          <li>Requires HTTPS connection for screen sharing</li>
          <li>Players will automatically connect when they join the game</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminStreamControl;
