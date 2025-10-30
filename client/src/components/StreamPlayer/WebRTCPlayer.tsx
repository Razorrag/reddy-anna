/**
 * WebRTC Player Component
 * 
 * Receives WebRTC stream from admin's screen share
 * Used for browser-based streaming
 */

import { useEffect, useRef, useState } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { Wifi, WifiOff } from 'lucide-react';

interface WebRTCPlayerProps {
  roomId: string;
  streamTitle?: string;
}

export default function WebRTCPlayer({ roomId }: WebRTCPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'failed'>('connecting');
  const { sendWebSocketMessage } = useWebSocket();

  useEffect(() => {
    console.log('🌐 WebRTC Player initializing for room:', roomId);
    initializeWebRTC();

    // FIXED: Handle WebRTC offers directly from WebSocket messages
    // The WebSocketContext already dispatches 'webrtc_offer_received' events
    const handleOffer = async (event: any) => {
      const { offer } = event.detail;
      console.log('📡 Received WebRTC offer:', offer);
      
      if (peerConnectionRef.current && offer) {
        try {
          await peerConnectionRef.current.setRemoteDescription(offer);
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          
          console.log('📤 Sending WebRTC answer');
          sendWebSocketMessage({
            type: 'webrtc_answer',
            data: { answer },
          });
        } catch (error) {
          console.error('❌ Error handling WebRTC offer:', error);
        }
      }
    };

    // Listen for WebRTC offers from WebSocket context
    window.addEventListener('webrtc_offer_received', handleOffer);
    
    // Also handle ICE candidates
    const handleIceCandidate = async (event: any) => {
      const { candidate } = event.detail;
      console.log('🧊 Received ICE candidate:', candidate);
      
      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(candidate);
        } catch (error) {
          console.error('❌ Error adding ICE candidate:', error);
        }
      }
    };
    
    window.addEventListener('webrtc_ice_candidate_received', handleIceCandidate);

    return () => {
      window.removeEventListener('webrtc_offer_received', handleOffer);
      window.removeEventListener('webrtc_ice_candidate_received', handleIceCandidate);
      cleanup();
    };
  }, [roomId, sendWebSocketMessage]);

  const initializeWebRTC = async () => {
    try {
      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = peerConnection;

      // Handle incoming tracks (video/audio from admin)
      peerConnection.ontrack = (event) => {
        console.log('📺 Received remote track:', event.track.kind);
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setConnectionState('connected');
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Sending ICE candidate');
          // Send via WebSocket (type will be handled by backend)
          sendWebSocketMessage({
            type: 'webrtc_ice_candidate' as any,
            data: {
              candidate: event.candidate
            }
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('🔌 Connection state:', peerConnection.connectionState);
        setConnectionState(peerConnection.connectionState as any);
      };

      // Note: WebRTC signaling (offers, answers, ICE candidates) will be handled
      // via WebSocket messages. The WebSocket context will need to be extended
      // to handle these message types in a future enhancement.
      
      // For now, this component is ready to receive WebRTC streams
      // when the signaling is properly connected.
      
      console.log('🔌 WebRTC Player waiting for admin to start screen share');
      
      // Notify that we're ready to receive stream (if backend supports it)
      try {
        sendWebSocketMessage({
          type: 'stream_viewer_join' as any,
          data: { roomId }
        });
      } catch (err) {
        console.log('Note: Stream viewer notifications not yet enabled');
      }

      console.log('✅ WebRTC Player initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing WebRTC:', error);
      setConnectionState('failed');
    }
  };

  const cleanup = () => {
    console.log('🧹 Cleaning up WebRTC Player');
    
    // Notify we're leaving (if backend supports it)
    try {
      sendWebSocketMessage({
        type: 'stream_viewer_leave' as any,
        data: { roomId }
      });
    } catch (err) {
      console.log('Note: Stream viewer notifications not yet enabled');
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Show connection status overlay
  const renderStatusOverlay = () => {
    if (connectionState === 'connected') return null;

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-10">
        <div className="text-center p-6">
          {connectionState === 'connecting' && (
            <>
              <Wifi className="w-16 h-16 text-gold mb-4 mx-auto animate-pulse" />
              <p className="text-white text-lg mb-2">Connecting to stream...</p>
              <p className="text-gray-400 text-sm">Establishing WebRTC connection</p>
            </>
          )}
          
          {connectionState === 'disconnected' && (
            <>
              <WifiOff className="w-16 h-16 text-yellow-400 mb-4 mx-auto" />
              <p className="text-white text-lg mb-2">Connection Lost</p>
              <p className="text-gray-400 text-sm">Attempting to reconnect...</p>
            </>
          )}
          
          {connectionState === 'failed' && (
            <>
              <WifiOff className="w-16 h-16 text-red-400 mb-4 mx-auto" />
              <p className="text-white text-lg mb-2">Connection Failed</p>
              <p className="text-gray-400 text-sm">Unable to establish connection</p>
              <button
                onClick={initializeWebRTC}
                className="mt-4 px-4 py-2 bg-gold hover:bg-gold/80 text-gray-900 rounded-lg font-semibold transition-colors"
              >
                Retry
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-black">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
        muted={false}
      />
      
      {renderStatusOverlay()}
    </div>
  );
}
