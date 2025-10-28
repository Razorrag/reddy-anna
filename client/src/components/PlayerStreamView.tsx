/**
 * PlayerStreamView - Component to display the admin's screen share
 * 
 * This component handles receiving the WebRTC stream from the admin
 * and displaying it to players during the game.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useGameState } from '../contexts/GameStateContext';

interface PlayerStreamViewProps {
  className?: string;
}

const PlayerStreamView: React.FC<PlayerStreamViewProps> = ({ className = '' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { sendWebSocketMessage } = useWebSocket();
  const { gameState } = useGameState();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState<'offline' | 'connecting' | 'online'>('offline');
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // WebRTC Configuration
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Initialize WebRTC connection when component mounts
  useEffect(() => {
    // Listen for WebRTC events
    const handleWebRTCOffer = (event: any) => {
      const { offer, adminId } = event.detail;
      handleOfferReceived(offer, adminId);
    };

    const handleWebRTCAnswer = (event: any) => {
      const { answer } = event.detail;
      handleAnswerReceived(answer);
    };

    const handleWebRTCIceCandidate = (event: any) => {
      const { candidate, fromAdmin } = event.detail;
      handleIceCandidateReceived(candidate, fromAdmin);
    };

    const handleStreamStatus = (event: any) => {
      const { status } = event.detail;
      setStreamStatus(status as any);
      setIsStreaming(status === 'online' || status === 'connecting');
    };

    window.addEventListener('webrtc_offer_received', handleWebRTCOffer as EventListener);
    window.addEventListener('webrtc_answer_received', handleWebRTCAnswer as EventListener);
    window.addEventListener('webrtc_ice_candidate_received', handleWebRTCIceCandidate as EventListener);
    
    // Also listen for stream status updates via custom events
    const streamStatusHandler = (event: any) => {
      const status = event.detail?.status || event.detail;
      if (status) {
        setStreamStatus(status as any);
        setIsStreaming(status === 'online' || status === 'connecting');
      }
    };
    window.addEventListener('stream_status_update', streamStatusHandler as EventListener);

    // Join stream when component mounts
    sendWebSocketMessage({
      type: 'stream_viewer_join',
      data: {}
    });

    return () => {
      // Leave stream when component unmounts
      sendWebSocketMessage({
        type: 'stream_viewer_leave',
        data: {}
      });

      // Clean up event listeners
      window.removeEventListener('webrtc_offer_received', handleWebRTCOffer as EventListener);
      window.removeEventListener('webrtc_answer_received', handleWebRTCAnswer as EventListener);
      window.removeEventListener('webrtc_ice_candidate_received', handleWebRTCIceCandidate as EventListener);
      window.removeEventListener('stream_status_update', streamStatusHandler as EventListener);

      // Close peer connection if it exists
      if (peerConnection) {
        peerConnection.close();
        setPeerConnection(null);
      }

      if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        setRemoteStream(null);
      }
    };
  }, [peerConnection, remoteStream, sendWebSocketMessage]);

  // Handle incoming WebRTC offer from admin
  const handleOfferReceived = async (offer: RTCSessionDescriptionInit, adminId: string) => {
    try {
      console.log('Handling WebRTC offer from admin:', adminId);

      // Create new peer connection if needed
      if (!peerConnection) {
        const pc = new RTCPeerConnection(rtcConfig);
        
        // Set up remote stream handling
        pc.ontrack = (event) => {
          console.log('Received remote track:', event.track.kind);
          const newStream = new MediaStream([event.track]);
          setRemoteStream(newStream);
          
          if (videoRef.current) {
            videoRef.current.srcObject = newStream;
          }
        };

        // Handle ICE candidate generation
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('Sending ICE candidate to admin');
            sendWebSocketMessage({
              type: 'webrtc_ice_candidate',
              data: {
                candidate: event.candidate
              }
            });
          }
        };

        setPeerConnection(pc);
      }

      // Set remote description
      await peerConnection!.setRemoteDescription(offer);

      // Create answer
      const answer = await peerConnection!.createAnswer();
      await peerConnection!.setLocalDescription(answer);

      // Send answer back to admin
      sendWebSocketMessage({
        type: 'webrtc_answer',
        data: {
          answer: peerConnection!.localDescription
        }
      });

    } catch (error) {
      console.error('Error handling WebRTC offer:', error);
    }
  };

  // Handle incoming WebRTC answer (shouldn't be needed for player view, but added for completeness)
  const handleAnswerReceived = async (answer: RTCSessionDescriptionInit) => {
    if (peerConnection && peerConnection.remoteDescription) {
      try {
        await peerConnection.setRemoteDescription(answer);
        console.log('WebRTC answer set successfully');
      } catch (error) {
        console.error('Error setting remote answer:', error);
      }
    }
  };

  // Handle incoming ICE candidate
  const handleIceCandidateReceived = (candidate: RTCIceCandidateInit, fromAdmin: boolean) => {
    if (peerConnection && fromAdmin) {
      try {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('Added ICE candidate');
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  };

  // Handle stream status change
  useEffect(() => {
    if (streamStatus === 'online') {
      setIsStreaming(true);
    } else {
      setIsStreaming(false);
      if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        setRemoteStream(null);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    }
  }, [streamStatus, remoteStream]);

  return (
    <div className={`bg-black/30 backdrop-blur-sm rounded-xl border border-gray-600 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
          Admin Screen Share
        </h3>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          streamStatus === 'online' ? 'bg-green-600/30 text-green-300' :
          streamStatus === 'connecting' ? 'bg-yellow-600/30 text-yellow-300' :
          'bg-gray-600/30 text-gray-300'
        }`}>
          {streamStatus.toUpperCase()}
        </span>
      </div>

      {/* Stream display area */}
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
        {isStreaming ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain bg-black"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="text-center p-4">
              <div className="text-5xl mb-4">📺</div>
              <p className="text-gray-400 text-lg">
                {streamStatus === 'connecting' 
                  ? 'Connecting to stream...' 
                  : 'No active screen share'}
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {streamStatus === 'offline' 
                  ? 'Admin has not started screen sharing' 
                  : 'Establishing connection...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stream info */}
      <div className="mt-3 text-xs text-gray-400 flex items-center justify-between">
        <span>Stream quality: Auto</span>
        <span>Mode: WebRTC</span>
      </div>
    </div>
  );
};

export default PlayerStreamView;