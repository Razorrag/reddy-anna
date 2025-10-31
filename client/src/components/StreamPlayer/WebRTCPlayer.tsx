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
  const [isPaused, setIsPaused] = useState(false);
  const isMountedRef = useRef(true);
  const { sendWebSocketMessage } = useWebSocket();

  useEffect(() => {
    console.log('🌐 WebRTC Player: Mounting and initializing for room:', roomId);
    isMountedRef.current = true;
    initializeWebRTC();

    // FIXED: Handle WebRTC offers directly from WebSocket messages
    // The WebSocketContext already dispatches 'webrtc_offer_received' events
    const handleOffer = async (event: any) => {
      const { sdp } = event.detail; // expect SDP under `sdp`
      console.log('📡 Received WebRTC offer:', sdp);
      
      if (peerConnectionRef.current && sdp) {
        try {
          await peerConnectionRef.current.setRemoteDescription(sdp);
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          
          console.log('📤 Sending WebRTC answer');
          sendWebSocketMessage({
            type: 'webrtc:signal',
            data: {
              type: 'answer',
              sdp: answer
            },
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

    // Handle stream pause/resume
    const handleStreamPause = () => {
      console.log('⏸️ Stream paused by admin');
      setIsPaused(true);
    };

    const handleStreamResume = () => {
      console.log('▶️ Stream resumed by admin');
      setIsPaused(false);
    };

    window.addEventListener('webrtc_stream_pause', handleStreamPause);
    window.addEventListener('webrtc_stream_resume', handleStreamResume);

    return () => {
      console.log('🌐 WebRTC Player: Unmounting and cleaning up');
      isMountedRef.current = false;
      window.removeEventListener('webrtc_offer_received', handleOffer);
      window.removeEventListener('webrtc_ice_candidate_received', handleIceCandidate);
      window.removeEventListener('webrtc_stream_pause', handleStreamPause);
      window.removeEventListener('webrtc_stream_resume', handleStreamResume);
      cleanup();
    };
  }, [roomId, sendWebSocketMessage]);

  const initializeWebRTC = async () => {
    try {
      console.log('🌐 Initializing WebRTC Player for room:', roomId);
      
      // Create peer connection with enhanced configuration for VPS
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ],
        iceTransportPolicy: 'all' as RTCIceTransportPolicy,
        bundlePolicy: 'max-bundle' as RTCBundlePolicy,
        rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy
      });

      peerConnectionRef.current = peerConnection;

      // Enhanced connection state logging with auto-recovery
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        console.log(`🔌 WebRTC Player Connection State: ${state}`);
        setConnectionState(state as any);
        
        if (state === 'failed') {
          console.error('❌ WebRTC connection failed. Attempting recovery...');
          // Attempt to reinitialize after a delay
          setTimeout(() => {
            if (isMountedRef.current && peerConnectionRef.current?.connectionState === 'failed') {
              console.log('🔄 Attempting to reinitialize WebRTC connection...');
              cleanup();
              initializeWebRTC();
            }
          }, 3000);
        } else if (state === 'disconnected') {
          console.warn('⚠️ WebRTC connection disconnected. Attempting to reconnect...');
          // Auto-reconnect after a short delay
          setTimeout(() => {
            if (isMountedRef.current && peerConnectionRef.current?.connectionState === 'disconnected') {
              console.log('🔄 Attempting to reconnect WebRTC...');
              cleanup();
              initializeWebRTC();
            }
          }, 2000);
        } else if (state === 'connected') {
          console.log('✅ WebRTC connection established!');
        }
      };

      // Enhanced ICE connection state logging
      peerConnection.oniceconnectionstatechange = () => {
        const iceState = peerConnection.iceConnectionState;
        console.log(`🧊 ICE Connection State: ${iceState}`);
        
        if (iceState === 'failed') {
          console.error('❌ ICE connection failed. STUN/TURN servers may be unreachable.');
        }
      };

      // Log ICE gathering state
      peerConnection.onicegatheringstatechange = () => {
        console.log(`🧊 ICE Gathering State: ${peerConnection.iceGatheringState}`);
      };

      // Handle incoming tracks (video/audio from admin)
      peerConnection.ontrack = (event) => {
        console.log('📺 Received remote track:', {
          kind: event.track.kind,
          id: event.track.id,
          streams: event.streams.length
        });
        if (isMountedRef.current && videoRef.current && event.streams[0]) {
          console.log('📺 Setting video stream to video element');
          videoRef.current.srcObject = event.streams[0];
          setConnectionState('connected');
          console.log('✅ Video stream attached successfully');
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 ICE Candidate generated:', {
            candidate: event.candidate.candidate?.substring(0, 50) + '...',
            sdpMLineIndex: event.candidate.sdpMLineIndex
          });
          // Send via WebSocket (type will be handled by backend)
          sendWebSocketMessage({
            type: 'webrtc:signal',
            data: {
              type: 'ice-candidate',
              candidate: event.candidate
            }
          });
        } else {
          console.log('🧊 ICE candidate gathering complete');
        }
      };

      // Enhanced error handling
      peerConnection.onicecandidateerror = (event) => {
        console.error('❌ ICE Candidate Error:', event);
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

  // Show connection status overlay (only for paused or failed states)
  const renderStatusOverlay = () => {
    // Don't show overlay during normal connecting - stream broadcasts automatically
    if (connectionState === 'connected' && !isPaused) return null;
    if (connectionState === 'connecting') return null;

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-10">
        <div className="text-center p-6">
          {isPaused && connectionState === 'connected' && (
            <>
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <div className="flex gap-1">
                  <div className="w-2 h-8 bg-yellow-400 rounded"></div>
                  <div className="w-2 h-8 bg-yellow-400 rounded"></div>
                </div>
              </div>
              <p className="text-white text-lg mb-2">Stream Paused</p>
              <p className="text-gray-400 text-sm">Admin has paused the stream</p>
            </>
          )}
          
          {connectionState === 'disconnected' && (
            <>
              <WifiOff className="w-16 h-16 text-yellow-400 mb-4 mx-auto animate-pulse" />
              <p className="text-white text-lg mb-2">Reconnecting...</p>
              <p className="text-gray-400 text-sm">Attempting to reconnect to stream...</p>
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
        style={{
          imageRendering: 'auto',
          willChange: 'auto'
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            videoRef.current.play().catch(err => {
              console.warn('Video autoplay prevented:', err);
            });
          }
        }}
      />
      
      {renderStatusOverlay()}
    </div>
  );
}
