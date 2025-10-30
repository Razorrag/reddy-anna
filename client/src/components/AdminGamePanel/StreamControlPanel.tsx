import React, { useState, useRef, useEffect } from 'react';
import { Monitor, Video, StopCircle, Settings, ExternalLink, Radio, Eye, EyeOff, Play, Pause } from 'lucide-react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../lib/api-client'; // Import apiClient

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
  const [showStream, setShowStream] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

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

  useEffect(() => {
    const handleWebRTCAnswer = (event: any) => {
      const { sdp, playerId } = event.detail; // expect SDP under `sdp`
      handleAnswerReceived(sdp, playerId);
    };

    const handleWebRTCIceCandidate = (event: any) => {
      const { candidate, fromPlayer } = event.detail;
      handleIceCandidateReceived(candidate, fromPlayer);
    };

    window.addEventListener('webrtc_answer_received', handleWebRTCAnswer as EventListener);
    window.addEventListener('webrtc_ice_candidate_received', handleWebRTCIceCandidate as EventListener);

    return () => {
      window.removeEventListener('webrtc_answer_received', handleWebRTCAnswer as EventListener);
      window.removeEventListener('webrtc_ice_candidate_received', handleWebRTCIceCandidate as EventListener);
      stopAllStreaming();
    };
  }, []);

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

  const handleAnswerReceived = (answer: RTCSessionDescriptionInit, playerId: string) => {
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
  };

  const handleIceCandidateReceived = (candidate: RTCIceCandidateInit, fromPlayer: string) => {
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
  };

  const stopAllStreaming = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }

    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
  };

  const startWebRTCScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      setScreenStream(stream);
      setIsStreaming(true);
      setStreamMethod('webrtc');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Send stream-start signal to notify players
      const streamId = `stream-${Date.now()}`;
      sendWebSocketMessage({
        type: 'webrtc:signal',
        data: {
          type: 'stream-start',
          streamId: streamId
        }
      });

      // Also send stream status for UI updates
      sendWebSocketMessage({
        type: 'stream_status',
        data: {
          status: 'connecting',
          method: 'webrtc',
        }
      });

      stream.getVideoTracks()[0].onended = () => {
        stopWebRTCScreenShare();
      };

      showNotification('✅ Screen sharing started! Players can now see your screen.', 'success');

      const pc = setupWebRTCConnection(stream);
      if (pc) {
        peerConnectionsRef.current.set('primary', pc);
      }

    } catch (error) {
      console.error('Screen share failed:', error);
      showNotification(`❌ Screen share failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const setupWebRTCConnection = (stream: MediaStream) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      stream.getVideoTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendWebSocketMessage({
            type: 'webrtc:signal',
            data: {
              type: 'ice-candidate',
              candidate: event.candidate,
              fromAdmin: true
            }
          });
        }
      };

      pc.createOffer()
        .then(offer => {
          return pc.setLocalDescription(offer);
        })
        .then(() => {
          sendWebSocketMessage({
            type: 'webrtc:signal',
            data: {
              type: 'offer',
              sdp: pc.localDescription!,
              adminId: '' // adminId is set on the server
            }
          });
        })
        .catch(error => {
          console.error('Error creating WebRTC offer:', error);
          showNotification(`WebRTC setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      peerConnectionsRef.current.set('primary', pc);
      return pc;
    } catch (error) {
      console.error('Error setting up WebRTC connection:', error);
      showNotification(`WebRTC connection setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return null;
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

  const stopWebRTCScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }

    peerConnectionsRef.current.forEach(pc => {
      pc.close();
    });
    peerConnectionsRef.current.clear();

    setIsStreaming(false);
    setIsPaused(false);
    setStreamMethod('none');

    // Send stream-stop signal to notify players
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
        status: 'offline'
      }
    });

    showNotification('Screen sharing stopped', 'info');
  };

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
            <div className="space-y-2">
              {/* Pause/Resume and Stop buttons */}
              <div className="grid grid-cols-2 gap-2">
                {!isPaused ? (
                  <button
                    onClick={pauseWebRTCScreenShare}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={resumeWebRTCScreenShare}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Resume
                  </button>
                )}
                <button
                  onClick={stopWebRTCScreenShare}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
                >
                  <StopCircle className="w-4 h-4" />
                  Stop
                </button>
              </div>
              
              {/* Status indicator */}
              {isPaused && (
                <div className="flex items-center justify-center gap-2 px-3 py-2 bg-yellow-600/20 border border-yellow-400/50 text-yellow-200 rounded-lg text-sm font-semibold">
                  <Pause className="w-4 h-4" />
                  Stream Paused
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {streamMethod === 'webrtc' && screenStream && (
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-2">Preview:</p>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full rounded-lg border border-green-400/30"
              />
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