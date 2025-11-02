import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';

interface WebRTCPlayerProps {
  roomId: string;
}

const WebRTCPlayer: React.FC<WebRTCPlayerProps> = ({ roomId }) => {
  const { sendWebSocketMessage } = useWebSocket();
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [isReconnecting, setIsReconnecting] = useState(false);

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
      if (event.candidate) {
        sendWebSocketMessage({
          type: 'webrtc_ice_candidate' as any,
          data: {
            candidate: event.candidate,
            roomId: roomId
          }
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('🎥 WebRTC connection state:', pc.connectionState);
      setConnectionState(pc.connectionState as any);
      
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        // Attempt reconnection after a delay
        setTimeout(() => {
          if (!isReconnecting) {
            console.log('🔄 Attempting to reconnect WebRTC...');
            reconnectWebRTC();
          }
        }, 3000);
      }
    };

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log('🎥 Received remote track:', event.track.kind);
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        videoRef.current.play().catch(error => {
          console.error('Error playing video:', error);
        });
      }
    };

    return pc;
  };

  // Initialize WebRTC connection
  const initializeWebRTC = useCallback(async () => {
    try {
      console.log('🎥 Initializing WebRTC player for room:', roomId);
      setConnectionState('connecting');

      // Create peer connection
      const peerConnection = createPeerConnection();
      peerConnectionRef.current = peerConnection;

      // Request current stream from server
      sendWebSocketMessage({
        type: 'request_stream' as any,
        data: {
          roomId: roomId
        }
      });

    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      setConnectionState('error');
    }
  }, [roomId, sendWebSocketMessage]);

  // Reconnection logic
  const reconnectWebRTC = async () => {
    if (isReconnecting) return;
    
    setIsReconnecting(true);
    
    // Clean up existing connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Wait a bit before reconnecting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Reinitialize
    await initializeWebRTC();
    setIsReconnecting(false);
  };

  // Cleanup WebRTC connection
  const cleanupWebRTC = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setConnectionState('disconnected');
  }, []);

  // Handle WebRTC offer signal
  const handleOfferSignal = useCallback(async (data: any) => {
    if (!peerConnectionRef.current) {
      console.log('🎥 Creating peer connection for offer');
      peerConnectionRef.current = createPeerConnection();
    }

    try {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(data.sdp)
      );
      
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      sendWebSocketMessage({
        type: 'webrtc_answer' as any,
        data: {
          answer: answer,
          roomId: roomId
        }
      });

      console.log('🎥 Sent WebRTC answer');
    } catch (error) {
      console.error('Error handling WebRTC offer:', error);
      setConnectionState('error');
    }
  }, [roomId, sendWebSocketMessage]);

  // Handle WebRTC answer signal
  const handleAnswerSignal = useCallback(async (data: any) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(data.sdp)
      );
      console.log('🎥 WebRTC answer received and set');
    } catch (error) {
      console.error('Error handling WebRTC answer:', error);
      setConnectionState('error');
    }
  }, []);

  // Handle ICE candidate signal
  const handleIceCandidateSignal = useCallback(async (data: any) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.addIceCandidate(
        new RTCIceCandidate(data.candidate)
      );
      console.log('🎥 ICE candidate added');
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }, []);

  // Handle WebRTC signaling messages via CustomEvents from WebSocketContext
  useEffect(() => {
    const handleOffer = (event: CustomEvent) => {
      const signalData = event.detail;
      console.log('🎥 Player received WebRTC offer:', signalData);
      handleOfferSignal(signalData);
    };

    const handleAnswer = (event: CustomEvent) => {
      const signalData = event.detail;
      console.log('🎥 Player received WebRTC answer:', signalData);
      handleAnswerSignal(signalData);
    };

    const handleIceCandidate = (event: CustomEvent) => {
      const signalData = event.detail;
      console.log('🧊 Player received ICE candidate:', signalData);
      handleIceCandidateSignal(signalData);
    };

    const handleStreamStart = () => {
      console.log('🎥 Stream started, initializing WebRTC...');
      initializeWebRTC();
    };

    const handleStreamStop = () => {
      console.log('🎥 Stream stopped, cleaning up...');
      cleanupWebRTC();
    };

    // Listen to CustomEvents dispatched by WebSocketContext
    window.addEventListener('webrtc_offer_received', handleOffer as EventListener);
    window.addEventListener('webrtc_answer_received', handleAnswer as EventListener);
    window.addEventListener('webrtc_ice_candidate_received', handleIceCandidate as EventListener);
    
    // Listen to stream status events (dispatched by WebSocketContext when stream-start/stop messages arrive)
    window.addEventListener('webrtc_stream_start', handleStreamStart);
    window.addEventListener('webrtc_stream_stop', handleStreamStop);

    return () => {
      window.removeEventListener('webrtc_offer_received', handleOffer as EventListener);
      window.removeEventListener('webrtc_answer_received', handleAnswer as EventListener);
      window.removeEventListener('webrtc_ice_candidate_received', handleIceCandidate as EventListener);
      window.removeEventListener('webrtc_stream_start', handleStreamStart);
      window.removeEventListener('webrtc_stream_stop', handleStreamStop);
    };
  }, [roomId, handleOfferSignal, handleAnswerSignal, handleIceCandidateSignal, cleanupWebRTC, initializeWebRTC, sendWebSocketMessage]);


  // Initialize on mount
  useEffect(() => {
    console.log('🎥 WebRTCPlayer mounted for room:', roomId);
    
    // Request current stream status
    sendWebSocketMessage({
      type: 'request_stream' as any,
      data: {
        roomId: roomId
      }
    });

    // Cleanup on unmount
    return () => {
      console.log('🎥 WebRTCPlayer unmounting, cleaning up...');
      cleanupWebRTC();
    };
  }, [roomId, cleanupWebRTC]);

  // Get connection state color and text
  const getConnectionInfo = () => {
    switch (connectionState) {
      case 'connected':
        return { color: 'text-green-400', text: '🟢 Connected', bg: 'bg-green-900/20' };
      case 'connecting':
        return { color: 'text-yellow-400', text: '🟡 Connecting...', bg: 'bg-yellow-900/20' };
      case 'error':
        return { color: 'text-red-400', text: '🔴 Connection Error', bg: 'bg-red-900/20' };
      default:
        return { color: 'text-gray-400', text: '⚫ Disconnected', bg: 'bg-gray-900/20' };
    }
  };

  const connectionInfo = getConnectionInfo();

  return (
    <div className="relative w-full h-full bg-black">
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-cover"
        style={{ display: connectionState === 'connected' ? 'block' : 'none' }}
      />

      {/* Connection Status Overlay */}
      {connectionState !== 'connected' && (
        <div className={`absolute inset-0 flex items-center justify-center ${connectionInfo.bg}`}>
          <div className="text-center">
            <div className={`text-6xl mb-4 ${connectionInfo.color}`}>
              {connectionState === 'connecting' ? '🔄' : connectionState === 'error' ? '❌' : '📺'}
            </div>
            <div className={`text-xl font-semibold ${connectionInfo.color}`}>
              {connectionInfo.text}
            </div>
            {connectionState === 'disconnected' && (
              <div className="text-sm text-gray-400 mt-2">
                Waiting for admin to start sharing...
              </div>
            )}
            {connectionState === 'error' && (
              <button
                onClick={reconnectWebRTC}
                className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                disabled={isReconnecting}
              >
                {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Connection Indicator */}
      <div className="absolute top-4 right-4">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${connectionInfo.bg} ${connectionInfo.color} backdrop-blur-sm`}>
          {connectionInfo.text}
        </div>
      </div>

      {/* Room Info */}
      <div className="absolute bottom-4 left-4">
        <div className="px-3 py-1 rounded-full text-xs font-medium bg-black/50 text-white backdrop-blur-sm">
          Room: {roomId}
        </div>
      </div>
    </div>
  );
};

export default WebRTCPlayer;
