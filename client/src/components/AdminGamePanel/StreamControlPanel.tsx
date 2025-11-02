import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Monitor, Video, StopCircle, Settings, ExternalLink, Radio, Eye, EyeOff, Play, Pause } from 'lucide-react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useNotification } from '@/contexts/NotificationContext';
import { apiClient } from '@/lib/api-client'; // Import apiClient
import ScreenShareCropper from './ScreenShareCropper';

interface StreamControlPanelProps {
  className?: string;
}

type StreamMethod = 'webrtc' | 'rtmp' | 'none';

const StreamControlPanel: React.FC<StreamControlPanelProps> = ({ className = '' }) => {
  const { sendWebSocketMessage } = useWebSocket();


  const { showNotification } = useNotification();
  
  const [streamMethod, setStreamMethod] = useState<StreamMethod>('none');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rtmpUrl, setRtmpUrl] = useState('');
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [croppedStream, setCroppedStream] = useState<MediaStream | null>(null);
  const [showStream, setShowStream] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [connectedPlayers, setConnectedPlayers] = useState(0);

  // Define handler functions first before they're used in useEffects
  const handleAnswerReceived = useCallback((answer: RTCSessionDescriptionInit, playerId: string) => {
    console.log('Handling WebRTC answer from player:', playerId);
    const pc = peerConnectionsRef.current.get('primary');
    if (pc && answer) {
      pc.setRemoteDescription(answer)
        .then(() => {
          console.log('✅ Answer set successfully for player:', playerId);
        })
        .catch(error => {
          console.error('Error setting remote answer:', error);
        });
    }
  }, []);

  const handleIceCandidateReceived = useCallback((candidate: RTCIceCandidateInit, fromPlayer: string) => {
    console.log('Handling ICE candidate from player:', fromPlayer);
    const pc = peerConnectionsRef.current.get('primary');
    if (pc && candidate) {
      pc.addIceCandidate(new RTCIceCandidate(candidate))
        .then(() => {
          console.log('✅ ICE candidate added for player:', fromPlayer);
        })
        .catch(error => {
          console.error('Error adding ICE candidate:', error);
        });
    }
  }, []);

  const stopAllStreaming = useCallback(() => {
    console.log('🛑 Stopping all streaming...');
    
    // Stop screen stream
    setScreenStream(prevStream => {
      if (prevStream) {
        console.log('🛑 Stopping screen stream tracks');
        prevStream.getTracks().forEach(track => {
          track.stop();
          console.log(`🛑 Stopped track: ${track.kind}, enabled: ${track.enabled}`);
        });
      }
      return null;
    });

    // Stop cropped stream
    setCroppedStream(prevStream => {
      if (prevStream) {
        console.log('🛑 Stopping cropped stream tracks');
        prevStream.getTracks().forEach(track => {
          track.stop();
        });
      }
      return null;
    });

    // Close all peer connections
    console.log('🛑 Closing peer connections');
    peerConnectionsRef.current.forEach((pc, key) => {
      try {
        pc.close();
        console.log(`🛑 Closed peer connection: ${key}`);
      } catch (error) {
        console.error(`Error closing peer connection ${key}:`, error);
      }
    });
    peerConnectionsRef.current.clear();

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    setIsPaused(false);
    setStreamMethod('none');
    
    console.log('✅ All streaming stopped');
  }, []);

  useEffect(() => {
    const fetchStreamConfig = async () => {
      try {
        const data = await apiClient.get<any>('/stream/config'); // Use apiClient.get
        if (data.success) {
          setShowStream(data.data.showStream);
        }
      } catch (error) {
        console.error('Failed to fetch stream config:', error);
      }
    };
    fetchStreamConfig();
  }, []);

  // Setup WebRTC event listeners
  useEffect(() => {
    const handleWebRTCAnswer = (event: any) => {
      const { sdp, from } = event.detail; // expect SDP under `sdp` and `from` for player ID
      const playerId = from || 'unknown';
      console.log('📥 Admin received WebRTC answer from player:', playerId);
      handleAnswerReceived(sdp, playerId);
    };

    const handleWebRTCIceCandidate = (event: any) => {
      const { candidate, from } = event.detail; // `from` contains the player ID
      const fromPlayer = from || 'unknown';
      console.log('🧊 Admin received ICE candidate from player:', fromPlayer);
      handleIceCandidateReceived(candidate, fromPlayer);
    };

    window.addEventListener('webrtc_answer_received', handleWebRTCAnswer as EventListener);
    window.addEventListener('webrtc_ice_candidate_received', handleWebRTCIceCandidate as EventListener);

    return () => {
      window.removeEventListener('webrtc_answer_received', handleWebRTCAnswer as EventListener);
      window.removeEventListener('webrtc_ice_candidate_received', handleWebRTCIceCandidate as EventListener);
      stopAllStreaming();
    };
  }, [handleAnswerReceived, handleIceCandidateReceived, stopAllStreaming]);

  const setupWebRTCConnection = useCallback((stream: MediaStream) => {
    try {
      console.log('🔌 Setting up WebRTC connection...');
      setConnectionState('connecting');
      
      // CRITICAL: Verify stream before proceeding
      if (!stream || !stream.getTracks().length) {
        console.error('❌ Stream has no tracks');
        setConnectionState('error');
        showNotification('Stream has no tracks. Cannot setup WebRTC connection.', 'error');
        return null;
      }

      // Check if stream tracks are active
      const activeTracks = stream.getTracks().filter(track => track.readyState === 'live');
      if (!activeTracks.length) {
        console.error('❌ Stream has no active tracks');
        showNotification('Stream tracks are not active. Please wait for stream to initialize.', 'error');
        return null;
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ],
        iceTransportPolicy: 'all' as RTCIceTransportPolicy,
        bundlePolicy: 'max-bundle' as RTCBundlePolicy,
        rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy
      });

      // Enhanced connection state logging with auto-cleanup
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log(`🔌 WebRTC Connection State: ${state}`);
        setConnectionState(state as any);
        
        if (state === 'failed' || state === 'disconnected') {
          console.error('❌ WebRTC connection failed. This might be a network/firewall issue on VPS.');
          showNotification(`⚠️ Connection issue: ${state}. Check VPS firewall and network settings.`, 'error');
          
          // Auto-cleanup on failure
          try {
            setTimeout(() => {
              if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                pc.close();
                peerConnectionsRef.current.delete('primary');
                console.log('🧹 Auto-cleaned up failed connection');
              }
            }, 5000);
          } catch (error) {
            console.error('Error during auto-cleanup:', error);
          }
        } else if (state === 'connected') {
          console.log('✅ WebRTC connection established!');
          showNotification('✅ Stream connection established!', 'success');
        }
      };

      // Enhanced ICE connection state logging
      pc.oniceconnectionstatechange = () => {
        const iceState = pc.iceConnectionState;
        console.log(`🧊 ICE Connection State: ${iceState}`);
        
        if (iceState === 'failed') {
          console.error('❌ ICE connection failed. STUN/TURN servers may be unreachable from VPS.');
          showNotification('❌ Network connection failed. Check VPS firewall allows UDP traffic for WebRTC.', 'error');
        }
      };

      // Log ICE gathering state
      pc.onicegatheringstatechange = () => {
        console.log(`🧊 ICE Gathering State: ${pc.iceGatheringState}`);
      };

      // Note: RTCPeerConnection doesn't have onerror handler
      // Errors are handled via connection state changes instead

      // Add all active tracks from stream with error handling
      let tracksAdded = 0;
      stream.getTracks().forEach(track => {
        try {
          if (track.readyState === 'live') {
            pc.addTrack(track, stream);
            tracksAdded++;
            console.log(`📹 Added track: ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
          } else {
            console.warn(`⚠️ Track ${track.kind} is not live (${track.readyState}), skipping`);
          }
        } catch (error) {
          console.error(`❌ Error adding track ${track.kind}:`, error);
        }
      });

      // Verify tracks were added
      if (tracksAdded === 0) {
        console.error('❌ No tracks added to peer connection');
        pc.close();
        showNotification('Failed to add tracks to WebRTC connection', 'error');
        return null;
      }

      console.log(`✅ Added ${tracksAdded} track(s) to peer connection`);

      // ICE candidate handler with error handling
      pc.onicecandidate = (event) => {
        try {
          if (event.candidate) {
            console.log('🧊 ICE Candidate generated:', {
              candidate: event.candidate.candidate.substring(0, 50) + '...',
              sdpMLineIndex: event.candidate.sdpMLineIndex
            });
            sendWebSocketMessage({
              type: 'webrtc:signal',
              data: {
                type: 'ice-candidate',
                candidate: event.candidate,
                fromAdmin: true
              }
            });
          } else {
            console.log('🧊 ICE candidate gathering complete');
          }
        } catch (error) {
          console.error('❌ Error sending ICE candidate:', error);
          // Don't throw - just log to prevent crashes
        }
      };

      // Enhanced error handling for ICE candidates
      pc.onicecandidateerror = (event) => {
        console.error('❌ ICE Candidate Error:', event);
        // Don't show notification for every ICE error to avoid spam
      };

      // Create and send offer with timeout and error handling
      let offerCreated = false;
      let offerSent = false;
      
      const offerTimeout = setTimeout(() => {
        if (!offerSent) {
          console.error('❌ WebRTC offer creation/sending timeout');
          try {
            pc.close();
            peerConnectionsRef.current.delete('primary');
            showNotification('WebRTC setup timed out. Please try again.', 'error');
          } catch (error) {
            console.error('Error during timeout cleanup:', error);
          }
        }
      }, 15000); // 15 second timeout

      pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      })
        .then(offer => {
          offerCreated = true;
          console.log('📤 Created WebRTC offer');
          return pc.setLocalDescription(offer);
        })
        .then(() => {
          console.log('📤 Sending WebRTC offer to server...', {
            type: pc.localDescription?.type,
            sdp: pc.localDescription?.sdp?.substring(0, 100) + '...'
          });
          
          if (!pc.localDescription) {
            throw new Error('Local description not set');
          }
          
          try {
            sendWebSocketMessage({
              type: 'webrtc:signal',
              data: {
                type: 'offer',
                sdp: pc.localDescription,
                adminId: '' // adminId is set on the server
              }
            });
            offerSent = true;
            clearTimeout(offerTimeout);
            console.log('✅ Offer sent successfully');
          } catch (error) {
            console.error('❌ Error sending offer:', error);
            throw error;
          }
        })
        .catch(error => {
          clearTimeout(offerTimeout);
          console.error('❌ Error creating/sending WebRTC offer:', error);
          showNotification(`WebRTC setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
          try {
            pc.close();
            peerConnectionsRef.current.delete('primary');
          } catch (closeError) {
            console.error('Error closing connection after offer failure:', closeError);
          }
        });

      return pc;
    } catch (error) {
      console.error('❌ Error setting up WebRTC connection:', error);
      showNotification(`WebRTC connection setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return null;
    }
  }, [sendWebSocketMessage, showNotification]);

  // Track if WebRTC is already set up to prevent excessive recreations
  const webrtcSetupRef = useRef<boolean>(false);
  const croppedStreamIdRef = useRef<string | null>(null);
  const webrtcSetupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Setup WebRTC connection immediately when screen is captured (don't wait for cropped stream)
  useEffect(() => {
    // Phase 1: Setup WebRTC immediately with screen stream
    if (screenStream && isStreaming && streamMethod === 'webrtc') {
      // Check if we already have a connection
      const existingPc = peerConnectionsRef.current.get('primary');
      if (existingPc && existingPc.connectionState !== 'closed' && existingPc.connectionState !== 'failed') {
        console.log('✅ WebRTC connection already exists');
        return;
      }

      // Setup WebRTC with screen stream immediately
      console.log('🔌 Setting up WebRTC immediately with screen stream...');
      
      // Clear any existing failed connections first
      peerConnectionsRef.current.forEach((pc, key) => {
        try {
          if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
            pc.close();
            console.log(`🧹 Cleaned up old connection: ${key}`);
          }
        } catch (error) {
          console.error(`Error cleaning up peer connection ${key}:`, error);
        }
      });
      
      // Remove closed/failed connections
      Array.from(peerConnectionsRef.current.entries()).forEach(([key, pc]) => {
        if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
          peerConnectionsRef.current.delete(key);
        }
      });

      // Setup connection with screen stream
      const pc = setupWebRTCConnection(screenStream);
      if (pc) {
        peerConnectionsRef.current.set('primary', pc);
        webrtcSetupRef.current = true;
        console.log('✅ WebRTC connection set up with screen stream');
        
        // Send stream-start signal AFTER WebRTC is set up and offer is sent
        // Delay to ensure offer is created and stored on server
        setTimeout(() => {
          sendWebSocketMessage({
            type: 'webrtc:signal',
            data: {
              type: 'stream-start',
              streamId: `stream-${Date.now()}`
            }
          });
          console.log('📡 Stream-start signal sent after WebRTC setup');
        }, 500);
      }
    }

    // Phase 2: When cropped stream becomes available, replace track in existing connection
    if (croppedStream && isStreaming && streamMethod === 'webrtc') {
      const pc = peerConnectionsRef.current.get('primary');
      if (pc && pc.connectionState !== 'closed' && pc.connectionState !== 'failed') {
        console.log('🔄 Replacing track with cropped stream...');
        
        // Get existing senders
        const senders = pc.getSenders();
        const croppedVideoTrack = croppedStream.getVideoTracks()[0];
        
        if (croppedVideoTrack && senders.length > 0) {
          // Find video sender and replace track
          const videoSender = senders.find(sender => 
            sender.track && sender.track.kind === 'video'
          );
          
          if (videoSender && croppedVideoTrack) {
            videoSender.replaceTrack(croppedVideoTrack)
              .then(() => {
                console.log('✅ Successfully replaced video track with cropped stream');
                showNotification('✅ Now streaming cropped area to players', 'success');
              })
              .catch(error => {
                console.error('❌ Error replacing track:', error);
                showNotification('⚠️ Could not switch to cropped stream. Using full screen.', 'warning');
              });
          }
        }
      }
    }

    // Cleanup when streaming stops
    if (!isStreaming || streamMethod !== 'webrtc' || !screenStream) {
      peerConnectionsRef.current.forEach((pc, key) => {
        try {
          if (pc.connectionState !== 'closed') {
            pc.close();
          }
        } catch (error) {
          console.error(`Error closing peer connection ${key}:`, error);
        }
      });
      peerConnectionsRef.current.clear();
      webrtcSetupRef.current = false;
    }
  }, [screenStream, croppedStream, isStreaming, streamMethod, setupWebRTCConnection, sendWebSocketMessage, showNotification]);

  // Final cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('🧹 StreamControlPanel unmounting - cleaning up all resources');
      stopAllStreaming();
    };
  }, [stopAllStreaming]);

  const handleToggleShowStream = async () => {
    try {
      const newShowStream = !showStream;
      const data = await apiClient.post<any>('/stream/show', { show: newShowStream }); // Use apiClient.post
      if (data.success) {
        setShowStream(newShowStream);
        showNotification(`Stream is now ${newShowStream ? 'visible' : 'hidden'}`, 'success');
      } else {
        showNotification('Failed to update stream visibility', 'error');
      }
    } catch (error) {
      console.error('Failed to update stream visibility:', error);
      showNotification('Failed to update stream visibility', 'error');
    }
  };

  const startWebRTCScreenShare = async () => {
    // Prevent multiple simultaneous starts
    if (isStreaming) {
      console.warn('⚠️ Already streaming, ignoring start request');
      showNotification('Already streaming. Please stop the current stream first.', 'info');
      return;
    }

    try {
      // Enhanced diagnostics for VPS issues
      console.log('🖥️ Screen Share Diagnostics:', {
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        origin: window.location.origin,
        hasMediaDevices: !!navigator.mediaDevices,
        hasGetDisplayMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
        userAgent: navigator.userAgent,
        isSecureContext: window.isSecureContext
      });

      // Check if getDisplayMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        const errorMsg = 'Screen sharing is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.';
        console.error('❌ getDisplayMedia not supported:', errorMsg);
        showNotification(`❌ ${errorMsg}`, 'error');
        return;
      }

      // Check if we're in a secure context (HTTPS or localhost)
      // CRITICAL FOR VPS: Screen sharing REQUIRES HTTPS (except localhost)
      const isLocalhost = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1' || 
                          window.location.hostname === '[::1]';
      const isSecure = window.location.protocol === 'https:' || window.isSecureContext;
      
      if (!isSecure && !isLocalhost) {
        const errorMsg = `Screen sharing requires HTTPS connection. Current: ${window.location.protocol}//${window.location.hostname}. Please configure SSL/HTTPS on your VPS.`;
        console.error('❌ Not in secure context:', {
          protocol: window.location.protocol,
          hostname: window.location.hostname,
          isSecureContext: window.isSecureContext
        });
        showNotification(`❌ ${errorMsg}`, 'error');
        return;
      }

      // Show loading notification
      showNotification('🔄 Starting screen share... Please select screen/window to share.', 'info');

      // Request screen capture with comprehensive error handling
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
            frameRate: { ideal: 30, max: 30 }
            // Note: cursor property is not standard but may work in some browsers
          },
          audio: false
        });
      } catch (getDisplayError: any) {
        // Handle user cancellation gracefully (not an error)
        if (getDisplayError.name === 'NotAllowedError' || getDisplayError.name === 'PermissionDeniedError') {
          console.log('ℹ️ User cancelled screen share permission');
          showNotification('ℹ️ Screen sharing cancelled. Please try again when ready.', 'info');
          return;
        } else if (getDisplayError.name === 'NotReadableError' || getDisplayError.name === 'TrackStartError') {
          showNotification('❌ Could not access screen. Make sure no other application is using your screen.', 'error');
          return;
        } else if (getDisplayError.name === 'NotFoundError' || getDisplayError.name === 'DevicesNotFoundError') {
          showNotification('❌ No screen or window available for sharing.', 'error');
          return;
        } else {
          console.error('❌ Unknown screen share error:', getDisplayError);
          throw getDisplayError; // Re-throw unknown errors
        }
      }

      // Verify we got a valid stream with video tracks
      if (!stream) {
        showNotification('❌ Failed to capture screen. No stream returned.', 'error');
        return;
      }

      if (!stream.getVideoTracks().length) {
        showNotification('❌ Failed to capture screen. No video track available.', 'error');
        // Cleanup incomplete stream
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      // Wait a moment for tracks to become live
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack.readyState !== 'live') {
        console.log('⏳ Waiting for video track to become live...');
        await new Promise<void>((resolve) => {
          const checkReady = () => {
            if (videoTrack.readyState === 'live') {
              resolve();
            } else {
              setTimeout(checkReady, 100);
            }
          };
          checkReady();
          
          // Timeout after 5 seconds
          setTimeout(() => {
            if (videoTrack.readyState !== 'live') {
              console.warn('⚠️ Video track did not become live after timeout');
              resolve(); // Continue anyway
            }
          }, 5000);
        });
      }

      console.log('✅ Screen stream captured successfully:', {
        videoTracks: stream.getVideoTracks().length,
        trackReadyState: videoTrack.readyState,
        trackEnabled: videoTrack.enabled
      });

      // Set stream state (in correct order to avoid race conditions)
      // Set method first, then streaming, then stream
      setStreamMethod('webrtc');
      setIsStreaming(true);
      setScreenStream(stream);

      // Set video source with error handling
      if (videoRef.current) {
        try {
          // Stop any existing stream on video element
          const oldStream = videoRef.current.srcObject as MediaStream | null;
          if (oldStream) {
            oldStream.getTracks().forEach(track => track.stop());
          }
          videoRef.current.srcObject = stream;
          
          // Wait for video to load
          videoRef.current.onloadedmetadata = () => {
            console.log('✅ Video metadata loaded');
          };
        } catch (error) {
          console.error('❌ Error setting video source:', error);
          showNotification('Error displaying stream preview', 'error');
        }
      }

      // Note: stream-start signal will be sent AFTER WebRTC setup (in useEffect)
      // This ensures offer is created and stored on server before notifying players

      // Handle track ending (user stops sharing from browser UI)
      // Use a single handler to avoid conflicts
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          console.log(`⚠️ Video track ended by user (browser UI)`);
          // Small delay to ensure state is consistent
          setTimeout(() => {
            // Check if all video tracks are ended
            const activeVideoTracks = stream.getVideoTracks().filter(t => t.readyState !== 'ended');
            if (activeVideoTracks.length === 0) {
              console.log('🛑 All video tracks ended, stopping screen share');
              stopWebRTCScreenShare();
            }
          }, 100);
        };
      });

      showNotification('✅ Screen sharing started! Adjust crop area and players will see the cropped view.', 'success');

      // Note: WebRTC connection will be set up when cropped stream is available
      // This is handled in the useEffect that watches croppedStream

    } catch (error) {
      console.error('❌ Screen share failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Provide user-friendly error messages
      let userMessage = `❌ Screen share failed: ${errorMessage}`;
      if (errorMessage.includes('getDisplayMedia') || errorMessage.includes('get_display')) {
        userMessage = '❌ Screen sharing is not available. Please check your browser permissions and try again.';
      } else if (errorMessage.includes('permission')) {
        userMessage = '❌ Permission denied. Please allow screen sharing when prompted.';
      }
      
      showNotification(userMessage, 'error');
      
      // Cleanup on error
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
      }
      setIsStreaming(false);
      setStreamMethod('none');
    }
  };


  const pauseWebRTCScreenShare = () => {
    if (!screenStream) return;

    // Disable video and audio tracks
    screenStream.getTracks().forEach(track => {
      track.enabled = false;
    });

    setIsPaused(true);

    // Send pause signal to players
    sendWebSocketMessage({
      type: 'webrtc:signal',
      data: {
        type: 'stream-pause'
      }
    });

    // Also send stream status for UI updates
    sendWebSocketMessage({
      type: 'stream_status',
      data: {
        status: 'paused',
        method: 'webrtc'
      }
    });

    showNotification('⏸️ Screen sharing paused', 'info');
  };

  const resumeWebRTCScreenShare = () => {
    if (!screenStream) return;

    // Re-enable video and audio tracks
    screenStream.getTracks().forEach(track => {
      track.enabled = true;
    });

    setIsPaused(false);

    // Send resume signal to players
    sendWebSocketMessage({
      type: 'webrtc:signal',
      data: {
        type: 'stream-resume'
      }
    });

    // Also send stream status for UI updates
    sendWebSocketMessage({
      type: 'stream_status',
      data: {
        status: 'live',
        method: 'webrtc'
      }
    });

    showNotification('▶️ Screen sharing resumed', 'success');
  };

  const stopWebRTCScreenShare = useCallback(() => {
    console.log('🛑 Stopping WebRTC screen share...');
    
    try {
      // Cancel any pending WebRTC setup
      if (webrtcSetupTimeoutRef.current) {
        clearTimeout(webrtcSetupTimeoutRef.current);
        webrtcSetupTimeoutRef.current = null;
      }
      
      // Reset WebRTC setup flags
      webrtcSetupRef.current = false;
      croppedStreamIdRef.current = null;

      // Close all peer connections FIRST (before stopping streams)
      console.log('🛑 Closing peer connections');
      peerConnectionsRef.current.forEach((pc, key) => {
        try {
          if (pc.connectionState !== 'closed') {
            pc.close();
            console.log(`🛑 Closed peer connection: ${key}`);
          }
        } catch (error) {
          console.error(`Error closing peer connection ${key}:`, error);
        }
      });
      peerConnectionsRef.current.clear();

      // Stop cropped stream (stops canvas stream)
      if (croppedStream) {
        console.log('🛑 Stopping cropped stream');
        croppedStream.getTracks().forEach(track => {
          try {
            track.stop();
            console.log(`🛑 Stopped cropped track: ${track.kind}`);
          } catch (error) {
            console.error(`Error stopping cropped track ${track.kind}:`, error);
          }
        });
        setCroppedStream(null);
      }

      // Stop screen stream (stops original display media)
      if (screenStream) {
        console.log('🛑 Stopping screen stream');
        screenStream.getTracks().forEach(track => {
          try {
            track.stop();
            console.log(`🛑 Stopped screen track: ${track.kind}`);
          } catch (error) {
            console.error(`Error stopping screen track ${track.kind}:`, error);
          }
        });
        setScreenStream(null);
      }

      // Clear video source
      if (videoRef.current) {
        try {
          const oldStream = videoRef.current.srcObject as MediaStream | null;
          if (oldStream) {
            oldStream.getTracks().forEach(track => {
              try {
                track.stop();
              } catch (error) {
                console.error('Error stopping video track:', error);
              }
            });
          }
          videoRef.current.srcObject = null;
        } catch (error) {
          console.error('Error clearing video source:', error);
        }
      }

      // Reset state
      setIsStreaming(false);
      setIsPaused(false);
      setStreamMethod('none');

      // Send stream-stop signal to notify players
      try {
        sendWebSocketMessage({
          type: 'webrtc:signal',
          data: {
            type: 'stream-stop'
          }
        });

        // Also send stream status for UI updates
        sendWebSocketMessage({
          type: 'stream_status',
          data: {
            status: 'stopped',
            method: 'webrtc'
          }
        });
      } catch (error) {
        console.error('❌ Error sending stream stop messages:', error);
      }

      showNotification('🛑 Screen sharing stopped', 'info');
      console.log('✅ WebRTC screen share stopped');
    } catch (error) {
      console.error('❌ Error stopping WebRTC screen share:', error);
      showNotification('Error stopping screen share', 'error');
      
      // Force cleanup on error
      setIsStreaming(false);
      setIsPaused(false);
      setStreamMethod('none');
      setScreenStream(null);
      setCroppedStream(null);
    }
  }, [screenStream, croppedStream, sendWebSocketMessage, showNotification]);

  const startRTMPStream = () => {
    if (!rtmpUrl.trim()) {
      showNotification('❌ Please enter an RTMP stream URL', 'error');
      return;
    }

    if (!rtmpUrl.startsWith('rtmp://') && !rtmpUrl.startsWith('https://')) {
      showNotification('❌ Invalid stream URL. Must start with rtmp:// or https://', 'error');
      return;
    }

    setIsStreaming(true);
    setStreamMethod('rtmp');

    sendWebSocketMessage({
      type: 'stream_status',
      data: {
        status: 'online',
        method: 'rtmp',
        url: rtmpUrl
      }
    });

    showNotification('✅ RTMP stream activated! Players will see the stream.', 'success');
  };

  const stopRTMPStream = () => {
    setIsStreaming(false);
    setStreamMethod('none');

    sendWebSocketMessage({
      type: 'stream_status',
      data: {
        status: 'offline'
      }
    });

    showNotification('RTMP stream stopped', 'info');
  };

  return (
    <div className={`bg-black/40 backdrop-blur-sm rounded-xl border border-gold/30 shadow-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Video className="w-6 h-6 text-gold" />
          <h2 className="text-2xl font-bold text-gold">Stream Control</h2>
          {isStreaming && (
            <span className="flex items-center gap-2 px-3 py-1 bg-red-600/30 border border-red-400 text-red-200 rounded-lg text-sm font-semibold animate-pulse">
              <Radio className="w-4 h-4" />
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Stream Visibility</span>
          <button onClick={handleToggleShowStream} className={`p-2 rounded-full transition-colors ${showStream ? 'bg-green-500' : 'bg-gray-600'}`}>
            {showStream ? <Eye className="w-5 h-5 text-white" /> : <EyeOff className="w-5 h-5 text-white" />}
          </button>
        </div>
      </div>

      {/* Stream Method Selection */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* WebRTC Screen Share */}
        <div className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
          streamMethod === 'webrtc' 
            ? 'bg-green-600/20 border-green-400' 
            : 'bg-gray-800/50 border-gray-600 hover:border-gray-500'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <Monitor className="w-6 h-6 text-green-400" />
            <h3 className="text-lg font-bold text-white">WebRTC Screen Share</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Share your screen directly from browser. Best for real-time with low latency (&lt;1s).
          </p>
          
          {streamMethod !== 'webrtc' ? (
            <button
              onClick={startWebRTCScreenShare}
              disabled={isStreaming}
              className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Monitor className="w-4 h-4 inline mr-2" />
              Start Screen Share
            </button>
          ) : (
            <div className="text-center py-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-400/50 text-green-300 rounded-lg text-sm font-semibold">
                <Radio className="w-4 h-4 animate-pulse" />
                Screen Share Active
              </div>
              <p className="text-xs text-gray-500 mt-2">Select crop area below and start streaming</p>
            </div>
          )}

        </div>

        {/* RTMP Streaming */}
        <div className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
          streamMethod === 'rtmp' 
            ? 'bg-blue-600/20 border-blue-400' 
            : 'bg-gray-800/50 border-gray-600 hover:border-gray-500'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <ExternalLink className="w-6 h-6 text-blue-400" />
            <h3 className="text-lg font-bold text-white">RTMP Streaming</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Use OBS Studio or external streaming software. Best for professional quality and scalability.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Stream URL (RTMP or HLS)</label>
              <input
                type="text"
                value={rtmpUrl}
                onChange={(e) => setRtmpUrl(e.target.value)}
                placeholder="rtmp://... or https://..."
                disabled={streamMethod === 'rtmp' && isStreaming}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-400 focus:outline-none disabled:opacity-50"
              />
            </div>

            {streamMethod !== 'rtmp' ? (
              <button
                onClick={startRTMPStream}
                disabled={isStreaming || !rtmpUrl.trim()}
                className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ExternalLink className="w-4 h-4 inline mr-2" />
                Start RTMP Stream
              </button>
            ) : (
              <button
                onClick={stopRTMPStream}
                className="w-full px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105"
              >
                <StopCircle className="w-4 h-4 inline mr-2" />
                Stop Stream
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Screen Share Cropper - Shows when WebRTC screen sharing is active */}
      {streamMethod === 'webrtc' && screenStream && (
        <div className="mt-6 bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <ScreenShareCropper
            sourceStream={screenStream}
            onCroppedStream={setCroppedStream}
          />
        </div>
      )}
      
      {/* Stop Screen Share Button - Only visible when WebRTC is active */}
      {streamMethod === 'webrtc' && screenStream && (
        <div className="mt-4">
          <button
            onClick={stopWebRTCScreenShare}
            className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
          >
            <StopCircle className="w-5 h-5" />
            Stop Screen Share Completely
          </button>
        </div>
      )}

      {/* Stream Info */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-4 h-4 text-gray-400" />
          <h4 className="text-sm font-semibold text-gray-300">Stream Information</h4>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Status:</span>
            <span className={`ml-2 font-semibold ${isStreaming ? 'text-green-400' : 'text-gray-400'}`}>
              {isStreaming ? '🔴 LIVE' : '⚫ Offline'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Method:</span>
            <span className="ml-2 font-semibold text-white">
              {streamMethod === 'webrtc' ? 'WebRTC Screen Share' : streamMethod === 'rtmp' ? 'RTMP Stream' : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Connection Status Display */}
      {streamMethod === 'webrtc' && (
        <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                connectionState === 'connected' ? 'bg-green-400' :
                connectionState === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                connectionState === 'error' ? 'bg-red-400' :
                'bg-gray-400'
              }`}></span>
              <span className="text-sm text-gray-300">
                {connectionState === 'connected' ? 'Connected to players' :
                 connectionState === 'connecting' ? 'Connecting...' :
                 connectionState === 'error' ? 'Connection error' :
                 'Disconnected'}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {connectedPlayers > 0 ? `${connectedPlayers} viewer(s)` : 'No viewers'}
            </span>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-300 mb-2">📝 Quick Guide:</h4>
        <ul className="text-xs text-blue-200 space-y-1">
          <li>• <strong>WebRTC:</strong> Click "Start Screen Share" and select window/screen to share</li>
          <li>• <strong>RTMP:</strong> Enter stream URL from OBS/Restream and click "Start RTMP Stream"</li>
          <li>• Players will automatically see the stream on their game page</li>
          <li>• Use WebRTC for low latency (&lt;1s), RTMP for scalability (1000+ viewers)</li>
        </ul>
      </div>
    </div>
  );
};

export default StreamControlPanel;