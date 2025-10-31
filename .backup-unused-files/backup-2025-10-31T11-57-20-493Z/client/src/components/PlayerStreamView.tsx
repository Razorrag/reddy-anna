import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useNotification } from '../contexts/NotificationContext';

interface PlayerStreamViewProps {
  className?: string;
  showControls?: boolean;
}

const PlayerStreamView: React.FC<PlayerStreamViewProps> = ({ 
  className = '', 
  showControls = true 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { sendWebSocketMessage } = useWebSocket();
  const { showNotification } = useNotification();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [streamStatus, setStreamStatus] = useState<'offline' | 'connecting' | 'online'>('offline');
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const initializeWebRTC = useCallback(async (offer: RTCSessionDescriptionInit) => {
    try {
      console.log('Initializing WebRTC connection with offer...');
      
      const pc = new RTCPeerConnection({
        iceServers: [
          {
            urls: 'stun:stun.l.google.com:19302',
          },
          {
            urls: 'stun:stun1.l.google.com:19302',
          }
        ]
      });

      pc.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        if (event.track.kind === 'video' && videoRef.current) {
          const [remoteStream] = event.streams;
          if (remoteStream) {
            videoRef.current.srcObject = remoteStream;
            setIsPlaying(true);
            setStreamStatus('online');
            showNotification('Stream connected successfully!', 'success');
          }
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate...');
          sendWebSocketMessage({
            type: 'webrtc_ice_candidate',
            data: {
              candidate: event.candidate,
            }
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('WebRTC connection state:', pc.connectionState);
        switch (pc.connectionState) {
          case 'connected':
            setIsConnected(true);
            setStreamStatus('online');
            break;
          case 'disconnected':
          case 'failed':
            setIsConnected(false);
            setIsPlaying(false);
            setStreamStatus('offline');
            showNotification('Stream disconnected', 'warning');
            break;
          case 'connecting':
            setStreamStatus('connecting');
            break;
        }
      };

      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendWebSocketMessage({
        type: 'webrtc_answer',
        data: { 
          answer,
          playerId: '' // Player ID is set on the server
         },
      });

      peerConnectionRef.current = pc;
      setIsConnected(false);
      setStreamStatus('connecting');

    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      showNotification('Failed to connect to stream', 'error');
      setStreamStatus('offline');
    }
  }, [sendWebSocketMessage, showNotification]);

  useEffect(() => {
    const handleOffer = (event: any) => {
      initializeWebRTC(event.detail.offer);
    };

    const handleIceCandidate = (event: any) => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.addIceCandidate(event.detail.candidate);
      }
    };

    window.addEventListener('webrtc_offer_received', handleOffer);
    window.addEventListener('webrtc_ice_candidate_received', handleIceCandidate);

    return () => {
      window.removeEventListener('webrtc_offer_received', handleOffer);
      window.removeEventListener('webrtc_ice_candidate_received', handleIceCandidate);
    };
  }, [initializeWebRTC]);

  useEffect(() => {
    const handleStreamStatus = (event: any) => {
      const { status } = event.detail;
      setStreamStatus(status);
      if (status === 'offline') {
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
        setIsConnected(false);
        setIsPlaying(false);
      }
    };

    window.addEventListener('stream_status_update', handleStreamStatus as EventListener);
    
    return () => {
      window.removeEventListener('stream_status_update', handleStreamStatus as EventListener);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        showNotification('Stream paused', 'info');
      } else {
        videoRef.current.play().catch(error => {
          console.error('Failed to play stream:', error);
          showNotification('Failed to play stream', 'error');
        });
        setIsPlaying(true);
        showNotification('Stream resumed', 'success');
      }
    }
  };

  const handleRetry = () => {
    // Retry logic can be improved, for now, we just log it
    console.log("Retry logic needs to be implemented");
  };

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
        onLoadedData={() => {
          setIsPlaying(true);
        }}
        onError={(error) => {
          showNotification('Stream playback error', 'error');
        }}
      />
      
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
        {streamStatus === 'offline' && (
          <div className="text-center">
            <div className="text-4xl mb-4">?</div>
            <div className="text-lg font-semibold mb-2">Stream Offline</div>
            <div className="text-sm opacity-75">Waiting for admin to start streaming...</div>
          </div>
        )}
        
        {streamStatus === 'connecting' && (
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">?</div>
            <div className="text-lg font-semibold mb-2">Connecting to Stream</div>
            <div className="text-sm opacity-75">Please wait while we connect...</div>
          </div>
        )}
        
        {streamStatus === 'online' && !isPlaying && (
          <div className="text-center">
            <div className="text-4xl mb-4">⏸️</div>
            <div className="text-lg font-semibold mb-2">Stream Paused</div>
            <div className="text-sm opacity-75">Click to resume playback</div>
          </div>
        )}
      </div>

      {showControls && streamStatus === 'online' && (
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <button
            onClick={togglePlayPause}
            className="bg-black bg-opacity-75 text-white p-2 rounded-full hover:bg-opacity-90 transition-all"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          
          <div className="flex space-x-2">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            } text-white`}>
              {isConnected ? 'Connected' : 'Connecting...'}
            </div>
            
            <button
              onClick={handleRetry}
              className="bg-black bg-opacity-75 text-white p-2 rounded-full hover:bg-opacity-90 transition-all"
              title="Retry Connection"
            >
              ?
            </button>
          </div>
        </div>
      )}

      {streamStatus === 'online' && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
          HD Stream
        </div>
      )}
    </div>
  );
};

export default PlayerStreamView;