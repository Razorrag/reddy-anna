/**
 * WebRTC Player Component - SIMPLIFIED
 * 
 * Direct approach: Just receive stream and display it
 */

import { useEffect, useRef } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';

interface WebRTCPlayerProps {
  roomId: string;
  streamTitle?: string;
}

export default function WebRTCPlayer({ roomId: _roomId }: WebRTCPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const adminIdRef = useRef<string | null>(null);
  const { sendWebSocketMessage } = useWebSocket();

  useEffect(() => {
    console.log('🚨 [PLAYER] SIMPLIFIED: WebRTCPlayer mounted');
    
    // Create peer connection
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ]
    });
    
    peerConnectionRef.current = pc;

    // ✅ CHECKPOINT 8: Track received and validation - CRITICAL for preventing black screen
    pc.ontrack = (event) => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎬 [PLAYER] CHECKPOINT 8: Track received!');
      
      const track = event.track;
      const trackDetails = {
        trackId: track.id,
        trackKind: track.kind,
        trackState: track.readyState,
        trackEnabled: track.enabled,
        trackMuted: track.muted,
        streams: event.streams.length
      };
      console.log('🎬 [PLAYER] Track details:', trackDetails);
      
      // ✅ VALIDATION 8.1: CRITICAL - Check if track is muted (PRIMARY ISSUE)
      if (track.muted) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ [PLAYER] CHECKPOINT 8.1 FAILED: Track is MUTED on receipt!');
        console.error('❌ [PLAYER] This will prevent frames and cause black screen.');
        console.error('❌ [PLAYER] Note: Tracks CANNOT be unmuted from receiver side.');
        console.error('❌ [PLAYER] This is the ROOT CAUSE of black screen.');
        console.error('❌ [PLAYER] Admin must restart screen share with unmuted track.');
        console.error('❌ [PLAYER] Track details:', {
          id: track.id,
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted,
          label: track.label
        });
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // ✅ ENHANCED: Show user-facing error message with better visibility
        // Try to display error to user
        let errorMsg = document.getElementById('webrtc-muted-error');
        if (!errorMsg) {
          errorMsg = document.createElement('div');
          errorMsg.id = 'webrtc-muted-error';
          errorMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(239, 68, 68, 0.95); color: white; padding: 24px; border-radius: 12px; z-index: 10000; text-align: center; max-width: 90%; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-family: Arial, sans-serif;';
          errorMsg.innerHTML = `
            <div style="font-weight: bold; font-size: 18px; margin-bottom: 12px;">⚠️ Stream Error</div>
            <div style="font-size: 14px; margin-bottom: 8px;">Video track is muted. Stream cannot be displayed.</div>
            <div style="font-size: 12px; opacity: 0.9;">Please ask admin to restart screen share.</div>
          `;
          document.body.appendChild(errorMsg);
          
          // Remove error after 15 seconds
          setTimeout(() => {
            if (errorMsg && errorMsg.parentElement) {
              errorMsg.parentElement.removeChild(errorMsg);
            }
          }, 15000);
        }
        
        // ✅ CRITICAL: Even though we can't unmute, try to enable and play anyway
        // Sometimes muted tracks still send frames (browser/OS dependent)
        track.enabled = true;
        console.warn('⚠️ [PLAYER] Track is muted but attempting to play anyway - frames may still arrive');
        console.warn('⚠️ [PLAYER] If black screen persists, admin must restart screen share.');
        
        // ✅ NEW: Monitor track for potential unmute (though rare)
        const monitorUnmute = () => {
          if (!track.muted) {
            console.log('✅ [PLAYER] Track was unmuted! Removing error message.');
            if (errorMsg && errorMsg.parentElement) {
              errorMsg.parentElement.removeChild(errorMsg);
            }
            track.removeEventListener('unmute', monitorUnmute);
          }
        };
        track.addEventListener('unmute', monitorUnmute);
        
        // Stop monitoring after 30 seconds
        setTimeout(() => {
          track.removeEventListener('unmute', monitorUnmute);
        }, 30000);
      } else {
        console.log('✅ [PLAYER] CHECKPOINT 8.1 PASSED: Track is NOT muted - ready to receive frames.');
        
        // ✅ Remove any existing error message if track is not muted
        const errorMsg = document.getElementById('webrtc-muted-error');
        if (errorMsg && errorMsg.parentElement) {
          errorMsg.parentElement.removeChild(errorMsg);
        }
      }
      
      // ✅ VALIDATION 8.2: Ensure track is enabled
      if (!track.enabled) {
        console.warn('⚠️ [PLAYER] CHECKPOINT 8.2: Track disabled, enabling...');
        track.enabled = true;
      }
      console.log('✅ [PLAYER] CHECKPOINT 8.2 PASSED: Track is enabled');
      
      // ✅ VALIDATION 8.3: Ensure track is live
      if (track.readyState !== 'live') {
        console.warn('⚠️ [PLAYER] CHECKPOINT 8.3: Track not live yet:', track.readyState);
      } else {
        console.log('✅ [PLAYER] CHECKPOINT 8.3 PASSED: Track is live');
      }
      
      console.log('🎬 [PLAYER] Track validation complete:', {
        readyState: track.readyState,
        enabled: track.enabled,
        muted: track.muted,
        kind: track.kind
      });
      
      // ✅ VALIDATION 8.4: Attach stream to video
      if (event.streams[0] && videoRef.current) {
        const stream = event.streams[0];
        const video = videoRef.current;
        
        console.log('✅ [PLAYER] CHECKPOINT 8.4: Attaching stream to video element');
        
        // ✅ CRITICAL: Clear any existing stream first
        if (video.srcObject) {
          const oldStream = video.srcObject as MediaStream;
          oldStream.getTracks().forEach(t => {
            t.stop();
          });
          video.srcObject = null;
        }
        
        // Attach new stream
        video.srcObject = stream;
        console.log('✅ [PLAYER] CHECKPOINT 8.4 PASSED: Stream attached to video');
        
        // ✅ VALIDATION 8.5: Wait for video element to be ready, then play
        const attemptPlay = () => {
          // ✅ Check if video element is in DOM
          if (!document.contains(video)) {
            console.warn('⚠️ [PLAYER] CHECKPOINT 8.5: Video element not in DOM, retrying...');
            const retryCount = (attemptPlay as any).retryCount || 0;
            (attemptPlay as any).retryCount = retryCount + 1;
            if (retryCount < 60) {
              setTimeout(attemptPlay, 500);
            } else {
              console.error('❌ [PLAYER] CHECKPOINT 8.5 FAILED: Video element never appeared in DOM');
            }
            return;
          }
          
          // ✅ VALIDATION 8.5: Enhanced video element readiness checks
          const rect = video.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(video);
          const parentElement = video.parentElement;
          const parentRect = parentElement ? parentElement.getBoundingClientRect() : null;
          const parentStyle = parentElement ? window.getComputedStyle(parentElement) : null;
          
          // ✅ ENHANCED: Check if element is actually visible (not just has dimensions)
          const isVisible = computedStyle.display !== 'none' && 
                           computedStyle.visibility !== 'hidden' && 
                           parseFloat(computedStyle.opacity) > 0;
          
          // Check dimensions
          if (rect.width === 0 || rect.height === 0 || !isVisible) {
            console.warn('⚠️ [PLAYER] Video element not ready:', {
              width: rect.width,
              height: rect.height,
              visible: isVisible,
              display: computedStyle.display,
              visibility: computedStyle.visibility,
              opacity: computedStyle.opacity,
              parentDisplay: parentStyle?.display,
              parentVisibility: parentStyle?.visibility,
              parentWidth: parentRect?.width,
              parentHeight: parentRect?.height,
              inDOM: document.contains(video)
            });
          // ✅ Enhanced retry logic - longer timeout, more retries
          const retryCount = (attemptPlay as any).retryCount || 0;
          (attemptPlay as any).retryCount = retryCount + 1;
          if (retryCount < 120) {
            // Log progress every 10 retries (every 5 seconds)
            if (retryCount % 10 === 0) {
              console.log(`⏳ [PLAYER] CHECKPOINT 8.5: Retrying video element readiness (${retryCount}/120)...`);
            }
            setTimeout(attemptPlay, 500);
          } else {
            console.error('❌ [PLAYER] CHECKPOINT 8.5 FAILED: Video element still not ready after 60 seconds!');
            console.error('❌ [PLAYER] Final state:', {
              width: rect.width,
              height: rect.height,
              visible: isVisible,
              display: computedStyle.display,
              visibility: computedStyle.visibility,
              inDOM: document.contains(video)
            });
          }
          return;
        }
        
        console.log('✅ [PLAYER] CHECKPOINT 8.5 PASSED: Video element is ready');
          
          // Check visibility - video might be hidden by CSS
          if (computedStyle.display === 'none') {
            console.warn('⚠️ [PLAYER] Video element is hidden (display: none), waiting...');
            const retryCount = (attemptPlay as any).retryCount || 0;
            (attemptPlay as any).retryCount = retryCount + 1;
            if (retryCount < 60) {
              setTimeout(attemptPlay, 500);
            }
            return;
          }
          
          if (computedStyle.visibility === 'hidden') {
            console.warn('⚠️ [PLAYER] Video element is hidden (visibility: hidden), waiting...');
            const retryCount = (attemptPlay as any).retryCount || 0;
            (attemptPlay as any).retryCount = retryCount + 1;
            if (retryCount < 60) {
              setTimeout(attemptPlay, 500);
            }
            return;
          }
          
          if (parseFloat(computedStyle.opacity) === 0) {
            console.warn('⚠️ [PLAYER] Video element is transparent (opacity: 0), waiting...');
            const retryCount = (attemptPlay as any).retryCount || 0;
            (attemptPlay as any).retryCount = retryCount + 1;
            if (retryCount < 60) {
              setTimeout(attemptPlay, 500);
            }
            return;
          }
          
          // Check parent container
          if (parentElement) {
            if (parentStyle?.display === 'none') {
              console.warn('⚠️ [PLAYER] Parent container is hidden (display: none), waiting...');
              const retryCount = (attemptPlay as any).retryCount || 0;
              (attemptPlay as any).retryCount = retryCount + 1;
              if (retryCount < 60) {
                setTimeout(attemptPlay, 500);
              }
              return;
            }
            
            if (parentRect && (parentRect.width === 0 || parentRect.height === 0)) {
              console.warn('⚠️ [PLAYER] Parent container has zero dimensions, waiting...');
              const retryCount = (attemptPlay as any).retryCount || 0;
              (attemptPlay as any).retryCount = retryCount + 1;
              if (retryCount < 60) {
                setTimeout(attemptPlay, 500);
              }
              return;
            }
          }
          
          // ✅ VALIDATION 8.6: Play video
          const playPromise = video.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('✅ [PLAYER] CHECKPOINT 8.6 PASSED: Video playing!');
                console.log('✅ [PLAYER] Video state:', {
                  videoWidth: video.videoWidth,
                  videoHeight: video.videoHeight,
                  readyState: video.readyState,
                  paused: video.paused,
                  currentTime: video.currentTime
                });
                
                // ✅ VALIDATION 8.7: Verify frames are arriving
                setTimeout(() => {
                  if (video.videoWidth === 0 || video.videoHeight === 0) {
                    console.error('❌ [PLAYER] CHECKPOINT 8.7 FAILED: No frames received after 2 seconds!');
                    console.error('❌ [PLAYER] This indicates black screen issue.');
                  } else {
                    console.log('✅ [PLAYER] CHECKPOINT 8.7 PASSED: Frames arriving:', {
                      width: video.videoWidth,
                      height: video.videoHeight
                    });
                  }
                }, 2000);
              })
              .catch((err: any) => {
                console.error('❌ [PLAYER] SIMPLIFIED: Play failed:', err);
                console.error('❌ [PLAYER] Error:', {
                  name: err.name,
                  message: err.message
                });
                // Retry after a short delay
                setTimeout(() => {
                  if (video.srcObject && video.paused) {
                    video.play().catch(() => {});
                  }
                }, 500);
              });
          }
        };
        
        // ✅ CRITICAL: Wait for loadedmetadata before attempting play
        const handleMetadata = () => {
          console.log('📊 [PLAYER] SIMPLIFIED: Metadata loaded:', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState
          });
          
          // ✅ CRITICAL: Even if track is muted, frames might still arrive
          // Check dimensions first - if non-zero, frames are arriving despite muted state
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            console.warn('⚠️ [PLAYER] Video has zero dimensions - waiting for frames...');
            console.warn('⚠️ [PLAYER] Track muted:', track.muted, 'but frames may still arrive');
            
            // Monitor for frames arriving (even if track is muted)
            let frameCheckCount = 0;
            const checkFrames = setInterval(() => {
              frameCheckCount++;
              const currentWidth = video.videoWidth;
              const currentHeight = video.videoHeight;
              
              if (currentWidth > 0 && currentHeight > 0) {
                console.log('✅ [PLAYER] Frames arrived!', {
                  videoWidth: currentWidth,
                  videoHeight: currentHeight,
                  trackMuted: track.muted,
                  trackEnabled: track.enabled,
                  trackReadyState: track.readyState
                });
                clearInterval(checkFrames);
                attemptPlay();
              } else if (frameCheckCount > 30) {
                console.error('❌ [PLAYER] No frames received after 15 seconds!');
                console.error('❌ [PLAYER] Track state:', {
                  readyState: track.readyState,
                  enabled: track.enabled,
                  muted: track.muted,
                  videoWidth: video.videoWidth,
                  videoHeight: video.videoHeight
                });
                console.error('❌ [PLAYER] If track is muted, check admin side - track might be muted at source');
                clearInterval(checkFrames);
              } else if (frameCheckCount % 5 === 0) {
                // Log progress every 2.5 seconds
                console.log(`⏳ [PLAYER] Still waiting for frames... (${frameCheckCount * 0.5}s)`, {
                  videoWidth: currentWidth,
                  videoHeight: currentHeight,
                  trackMuted: track.muted,
                  trackEnabled: track.enabled
                });
              }
            }, 500);
          } else {
            // Dimensions are valid, frames are arriving - try to play
            console.log('✅ [PLAYER] Video has dimensions - frames are arriving!', {
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              trackMuted: track.muted
            });
            attemptPlay();
          }
        };
        
        video.addEventListener('loadedmetadata', handleMetadata, { once: true });
        
        // ✅ CRITICAL: Also try immediate play if metadata already loaded
        if (video.readyState >= 1) {
          handleMetadata();
        }
        
        // Listen for playing event
        video.addEventListener('playing', () => {
          console.log('✅ [PLAYER] SIMPLIFIED: Video is playing!');
          console.log('✅ [PLAYER] Final state:', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            currentTime: video.currentTime
          });
        }, { once: true });
        
        // ✅ CRITICAL: Monitor track state
        track.addEventListener('ended', () => {
          console.error('❌ [PLAYER] Track ended!');
        });
        
        track.addEventListener('mute', () => {
          console.warn('⚠️ [PLAYER] Track muted! Trying to re-enable...');
          // Try to re-enable track when it gets muted
          track.enabled = true;
          // Check if video element needs to be restarted
          if (video.paused && video.srcObject) {
            console.log('🔄 [PLAYER] Restarting video after track mute...');
            video.play().catch(err => {
              console.error('❌ [PLAYER] Failed to restart video after mute:', err);
            });
          }
        });
        
        track.addEventListener('unmute', () => {
          console.log('✅ [PLAYER] Track unmuted!');
          // Ensure video is playing when track unmutes
          if (video.paused && video.srcObject) {
            console.log('▶️ [PLAYER] Resuming video after track unmute...');
            video.play().catch(err => {
              console.error('❌ [PLAYER] Failed to resume video after unmute:', err);
            });
          }
        });
        
        // ✅ CRITICAL: Monitor for track readyState changes
        const checkTrackPeriodically = setInterval(() => {
          const trackState = {
            readyState: track.readyState,
            enabled: track.enabled,
            muted: track.muted,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState_video: video.readyState,
            paused: video.paused
          };
          
          if (track.muted) {
            console.warn('⚠️ [PLAYER] Track still muted:', trackState);
          }
          
          if (track.readyState === 'ended') {
            console.error('❌ [PLAYER] Track ended!', trackState);
            clearInterval(checkTrackPeriodically);
          }
          
          // If track is live and unmuted but no frames, log warning
          if (track.readyState === 'live' && !track.muted && track.enabled && video.videoWidth === 0 && video.videoHeight === 0) {
            console.warn('⚠️ [PLAYER] Track live but no frames received:', trackState);
          }
          
          // Stop checking after 30 seconds
          setTimeout(() => clearInterval(checkTrackPeriodically), 30000);
        }, 2000);
      } else {
        console.error('❌ [PLAYER] Missing stream or video element!');
        console.error('❌ Stream:', !!event.streams[0]);
        console.error('❌ Video element:', !!videoRef.current);
      }
    };

    // Handle offer
    const handleOffer = async (event: any) => {
      const detail = event.detail;
      const { sdp, from } = detail;
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📥 [PLAYER] SIMPLIFIED: Offer received from:', from);
      console.log('📥 [PLAYER] SDP type:', typeof sdp);
      console.log('📥 [PLAYER] SDP:', sdp);
      
      if (!pc || !sdp) {
        console.error('❌ [PLAYER] No PC or SDP in offer');
        return;
      }
      
      // If already have remote description, skip
      if (pc.remoteDescription) {
        console.log('⚠️ [PLAYER] Already have remote description, skipping duplicate offer');
        return;
      }
      
      adminIdRef.current = from;
      
      try {
        // Handle both string and object SDP formats
        let offer: RTCSessionDescriptionInit;
        if (typeof sdp === 'string') {
          offer = { type: 'offer', sdp };
        } else if (sdp.type && sdp.sdp) {
          offer = { type: sdp.type as RTCSdpType, sdp: typeof sdp.sdp === 'string' ? sdp.sdp : sdp.sdp.sdp };
        } else {
          offer = sdp as RTCSessionDescriptionInit;
        }
        
        console.log('📥 [PLAYER] Processing offer:', { type: offer.type, sdpLength: offer.sdp?.length });
        await pc.setRemoteDescription(offer);
        console.log('✅ [PLAYER] SIMPLIFIED: Remote description set');
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('✅ [PLAYER] SIMPLIFIED: Answer created');
        
        if (!from) {
          console.error('❌ [PLAYER] No from ID to send answer to');
          return;
        }
        
        sendWebSocketMessage({
          type: 'webrtc:signal',
          data: {
            type: 'answer',
            to: from,
            sdp: answer
          }
        });
        console.log('✅ [PLAYER] SIMPLIFIED: Answer sent to:', from);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      } catch (err) {
        console.error('❌ [PLAYER] SIMPLIFIED: Offer handling failed:', err);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }
    };

    // Handle ICE candidates
    const handleICE = async (event: any) => {
      const { candidate, from } = event.detail;
      if (pc && candidate) {
        if (from) adminIdRef.current = from;
        try {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            // Queue if remote description not set yet
            setTimeout(() => {
              pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
            }, 100);
          }
        } catch (err) {
          console.error('❌ [PLAYER] ICE candidate failed:', err);
        }
      }
    };

    // Listen for events
    window.addEventListener('webrtc_offer_received', handleOffer);
    window.addEventListener('webrtc_ice_candidate_received', handleICE);

    // ✅ CRITICAL FIX #6: Only send viewer-join if streamId exists (stream-start was received)
    // Don't send immediately on mount - wait for stream-start signal first
    const storedStreamId = sessionStorage.getItem('webrtc_streamId');
    
    let streamStartHandler: (() => void) | null = null;
    
    if (storedStreamId && storedStreamId !== 'default-stream') {
      // Stream-start was already received, send viewer-join
      sendWebSocketMessage({
        type: 'webrtc:signal',
        data: {
          type: 'viewer-join',
          streamId: storedStreamId
        }
      });
      console.log('✅ [PLAYER] viewer-join sent with streamId:', storedStreamId);
    } else {
      console.log('⏳ [PLAYER] Waiting for stream-start before sending viewer-join...');
      // Set up listener for stream-start to send viewer-join when ready
      const handleStreamStart = () => {
        const streamId = sessionStorage.getItem('webrtc_streamId');
        if (streamId && streamId !== 'default-stream') {
          sendWebSocketMessage({
            type: 'webrtc:signal',
            data: {
              type: 'viewer-join',
              streamId: streamId
            }
          });
          console.log('✅ [PLAYER] viewer-join sent after stream-start:', streamId);
          window.removeEventListener('webrtc_stream_start', handleStreamStart);
        }
      };
      window.addEventListener('webrtc_stream_start', handleStreamStart);
      streamStartHandler = handleStreamStart;
    }

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      console.log('🔌 [PLAYER] SIMPLIFIED: Connection state:', pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('🧊 [PLAYER] SIMPLIFIED: ICE state:', pc.iceConnectionState);
    };

    // Cleanup
    return () => {
      console.log('🧹 [PLAYER] SIMPLIFIED: Cleaning up');
      if (streamStartHandler) {
        window.removeEventListener('webrtc_stream_start', streamStartHandler);
      }
      window.removeEventListener('webrtc_offer_received', handleOffer);
      window.removeEventListener('webrtc_ice_candidate_received', handleICE);
      if (pc) {
        pc.close();
      }
    };
  }, [sendWebSocketMessage]);

  // ✅ SIMPLIFIED: Minimal video element - NO complex CSS
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
        backgroundColor: 'black',
        zIndex: 1
      }}
      onLoadedMetadata={() => {
        console.log('📊 [PLAYER] SIMPLIFIED: Metadata loaded event');
        if (videoRef.current) {
          console.log('📊 [PLAYER] Metadata state:', {
            videoWidth: videoRef.current.videoWidth,
            videoHeight: videoRef.current.videoHeight,
            readyState: videoRef.current.readyState
          });
          if (videoRef.current.paused) {
            videoRef.current.play().catch((err) => {
              console.error('❌ [PLAYER] Play failed in onLoadedMetadata:', err);
            });
          }
        }
      }}
      onPlaying={() => {
        console.log('✅ [PLAYER] SIMPLIFIED: Playing event fired');
        if (videoRef.current) {
          console.log('✅ [PLAYER] Playing state:', {
            videoWidth: videoRef.current.videoWidth,
            videoHeight: videoRef.current.videoHeight,
            currentTime: videoRef.current.currentTime
          });
        }
      }}
      onError={(e) => {
        console.error('❌ [PLAYER] SIMPLIFIED: Video error:', e);
        if (videoRef.current?.error) {
          console.error('❌ [PLAYER] Error code:', videoRef.current.error.code);
          console.error('❌ [PLAYER] Error message:', videoRef.current.error.message);
        }
      }}
      onCanPlay={() => {
        console.log('✅ [PLAYER] SIMPLIFIED: canplay event');
        if (videoRef.current?.paused) {
          videoRef.current.play().catch(() => {});
        }
      }}
      onLoadedData={() => {
        console.log('✅ [PLAYER] SIMPLIFIED: loadeddata event');
      }}
    />
  );
}
