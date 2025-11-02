/**
 * AdminStreamContext - PERSISTENT WebRTC Streaming Management
 * 
 * CRITICAL: This context manages WebRTC connections at app level,
 * ensuring streams survive component unmounts and tab switches.
 * 
 * The stream state and peer connections are maintained here,
 * not in any UI component, so they persist regardless of navigation.
 */

import React, { createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode } from 'react';
import { useWebSocket } from './WebSocketContext';
import { useNotification } from './NotificationContext';
import { useAuth } from './AuthContext';

export interface CropSettings {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AdminStreamContextType {
  isStreaming: boolean;
  isPaused: boolean;
  isInitializing: boolean;
  isCropReady: boolean; // New: Whether crop is ready and stream can start
  error: string | null;
  startWebRTCScreenShare: () => Promise<void>;
  stopWebRTCScreenShare: () => void;
  pauseStream: () => void;
  resumeStream: () => void;
  screenStream: MediaStream | null;
  originalStream: MediaStream | null; // Original screen share
  croppedStream: MediaStream | null; // Canvas-based cropped stream
  cropSettings: CropSettings | null;
  setCropSettings: (settings: CropSettings | null) => void;
  confirmCropAndStart: () => void; // New: Confirm crop and start broadcasting
  skipCropAndStart: () => void; // New: Skip crop and start with full screen
  // Internal refs for ScreenShareCropper component
  getVideoRef: () => HTMLVideoElement | null;
  getCanvasRef: () => HTMLCanvasElement | null;
}

const AdminStreamContext = createContext<AdminStreamContextType | undefined>(undefined);

export const useAdminStream = () => {
  const context = useContext(AdminStreamContext);
  if (!context) {
    throw new Error('useAdminStream must be used within AdminStreamProvider');
  }
  return context;
};

export const AdminStreamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isCropReady, setIsCropReady] = useState(false); // Crop confirmed or skipped
  const [isBroadcasting, setIsBroadcasting] = useState(false); // Actually broadcasting to players
  const [error, setError] = useState<string | null>(null);
  const { sendWebSocketMessage } = useWebSocket();
  const { showNotification } = useNotification();
  const { state: authState } = useAuth();

  // Refs for core WebRTC objects to persist across re-renders
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const originalStreamRef = useRef<MediaStream | null>(null); // Original screen share
  const croppedStreamRef = useRef<MediaStream | null>(null); // Canvas cropped stream
  const streamRef = useRef<MediaStream | null>(null); // Active stream (original or cropped)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cropSettingsRef = useRef<CropSettings | null>(null);
  const trackEndedHandlerRef = useRef<(() => void) | null>(null); // ✅ Store handler for cleanup
  const metadataHandlerRef = useRef<(() => void) | null>(null); // ✅ Store handler for cleanup
  const pendingViewersRef = useRef<Set<string>>(new Set()); // ✅ Queue viewers waiting for broadcast
  const streamIdRef = useRef<string>(`stream-${Date.now()}`); // ✅ Unique stream ID for this session
  const retryCountRef = useRef<Map<string, number>>(new Map()); // ✅ Track retry counts per client
  
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [originalStream, setOriginalStream] = useState<MediaStream | null>(null);
  const [croppedStream, setCroppedStream] = useState<MediaStream | null>(null);
  const [cropSettings, setCropSettingsState] = useState<CropSettings | null>(null);

  // Cleanup canvas animation frame
  const cleanupCanvas = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  const cleanupWebRTC = useCallback(() => {
    console.log('🧹 Cleaning up all WebRTC connections and streams...');

    // ✅ CRITICAL: Cleanup animation frame FIRST
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc, clientId) => {
      pc.close();
      console.log(`🔌 Peer connection closed for client: ${clientId}`);
    });
    peerConnectionsRef.current.clear();

    // Stop all tracks from streams
    if (originalStreamRef.current) {
      originalStreamRef.current.getTracks().forEach(track => {
        // ✅ CRITICAL: Remove event listeners before stopping
        if (trackEndedHandlerRef.current && (track as any)._endedHandler) {
          track.removeEventListener('ended', trackEndedHandlerRef.current);
          delete (track as any)._endedHandler;
        }
        track.stop();
      });
      trackEndedHandlerRef.current = null;
      originalStreamRef.current = null;
    }
    if (croppedStreamRef.current) {
      croppedStreamRef.current.getTracks().forEach(track => track.stop());
      croppedStreamRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // ✅ CRITICAL: Remove video element from memory
    if (videoRef.current) {
      // ✅ CRITICAL: Remove event listeners using stored handlers
      if (metadataHandlerRef.current) {
        videoRef.current.removeEventListener('loadedmetadata', metadataHandlerRef.current);
        metadataHandlerRef.current = null;
      }
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute('src');
      videoRef.current.load(); // Reset video element
      videoRef.current = null;
    }
    
    // ✅ CRITICAL: Remove canvas element from DOM
    if (canvasRef.current && canvasRef.current.parentNode) {
      // Clear canvas context first
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      // Remove from DOM
      canvasRef.current.parentNode.removeChild(canvasRef.current);
      canvasRef.current = null;
    }
    
    cleanupCanvas();
    
    setScreenStream(null);
    setOriginalStream(null);
    setCroppedStream(null);
    setIsStreaming(false);
    setIsPaused(false);
    setIsInitializing(false);
    setIsCropReady(false);
    setIsBroadcasting(false);
    setError(null);
    pendingViewersRef.current.clear();
    retryCountRef.current.clear();
    streamIdRef.current = `stream-${Date.now()}`; // Reset stream ID
  }, [cleanupCanvas]);

  // Canvas rendering for crop - OPTIMIZED for smooth performance
  useEffect(() => {
    // ✅ CRITICAL: Cancel any existing animation frame first
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (!cropSettingsRef.current?.enabled || !originalStreamRef.current || !canvasRef.current || !videoRef.current) {
      cleanupCanvas();
      // If crop disabled, use original stream
      if (originalStreamRef.current) {
        streamRef.current = originalStreamRef.current;
        setScreenStream(originalStreamRef.current);
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const crop = cropSettingsRef.current;

    // ✅ CRITICAL: Validate crop coordinates against video dimensions
    const validateAndFixCrop = () => {
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        // Video not ready yet, return invalid
        return false;
      }
      
      // Clamp crop to video bounds
      const validCrop = {
        x: Math.max(0, Math.min(crop.x, video.videoWidth - 1)),
        y: Math.max(0, Math.min(crop.y, video.videoHeight - 1)),
        width: Math.min(crop.width, video.videoWidth - crop.x),
        height: Math.min(crop.height, video.videoHeight - crop.y)
      };
      
      // Update crop settings if needed
      if (validCrop.x !== crop.x || validCrop.y !== crop.y || 
          validCrop.width !== crop.width || validCrop.height !== crop.height) {
        console.warn('⚠️ Crop coordinates adjusted to fit video bounds:', {
          original: crop,
          adjusted: validCrop,
          videoSize: { width: video.videoWidth, height: video.videoHeight }
        });
        cropSettingsRef.current = { ...crop, ...validCrop };
      }
      
      // Check if crop is valid
      if (validCrop.width <= 0 || validCrop.height <= 0) {
        console.error('❌ Invalid crop dimensions:', validCrop);
        return false;
      }
      
      return true;
    };

    // Set canvas dimensions to crop size (will be validated during draw)
    canvas.width = crop.width;
    canvas.height = crop.height;

    let active = true;
    let lastFrameTime = 0;
    const targetFPS = 30; // Match captureStream FPS
    const frameInterval = 1000 / targetFPS; // ~33ms per frame
    
    // ✅ FIX: Track if first frame is drawn and stream is created
    let firstFrameDrawn = false;
    let streamCreated = false;

    const drawFrame = (currentTime: number) => {
      // ✅ CRITICAL: Check active flag BEFORE requesting next frame
      if (!active) {
        return; // Stop immediately if inactive
      }

      // ✅ OPTIMIZATION: Throttle frame rate to match captureStream
      if (currentTime - lastFrameTime < frameInterval) {
        animationFrameRef.current = requestAnimationFrame(drawFrame);
        return;
      }
      lastFrameTime = currentTime;

      // ✅ CRITICAL: Wait for video to be fully ready and playing
      if (!video || video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) {
        // Video not ready yet, wait
        animationFrameRef.current = requestAnimationFrame(drawFrame);
        return;
      }
      
      // ✅ CRITICAL: Validate crop before drawing
      if (!validateAndFixCrop()) {
        console.warn('⚠️ Crop validation failed, waiting for video...');
        animationFrameRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      const ctx = canvas.getContext('2d', { 
        alpha: false, 
        desynchronized: true // Better performance
      });
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      try {
        // ✅ OPTIMIZATION: Use imageSmoothingEnabled for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // ✅ Get validated crop (in case it was adjusted)
        const validCrop = cropSettingsRef.current || crop;
        
        // Draw cropped region
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
          video,
          validCrop.x, validCrop.y, validCrop.width, validCrop.height,
          0, 0, validCrop.width, validCrop.height
        );

        // ✅ FIX: Mark first frame as drawn and verify it has actual content
        if (!firstFrameDrawn) {
          // Verify frame actually has pixels (not just black)
          const sampleData = ctx.getImageData(0, 0, Math.min(10, canvas.width), Math.min(10, canvas.height));
          const hasActualContent = sampleData.data.some((pixel, index) => {
            // Check non-alpha channels (every 4th value starting at 0, 1, 2)
            if (index % 4 < 3) {
              return pixel > 10; // Not pure black (allowing for some noise)
            }
            return false;
          });
          
          if (hasActualContent) {
            firstFrameDrawn = true;
            console.log('✅ First frame with content drawn to canvas');
          } else {
            // Frame is black, wait a bit more
            animationFrameRef.current = requestAnimationFrame(drawFrame);
            return;
          }
        }

        // ✅ CRITICAL: Only request next frame if still active
        if (active) {
          animationFrameRef.current = requestAnimationFrame(drawFrame);
        }
      } catch (err) {
        console.error('❌ Canvas draw error:', err);
        // Don't stop on error - might be temporary, just log and continue
        if (active) {
          animationFrameRef.current = requestAnimationFrame(drawFrame);
        }
      }
    };

    // ✅ CRITICAL: Stop old canvas stream before creating new one
    if (croppedStreamRef.current) {
      croppedStreamRef.current.getTracks().forEach(track => track.stop());
      croppedStreamRef.current = null;
      setCroppedStream(null);
      streamCreated = false; // Reset flag
    }

    // ✅ FIX: Create canvas stream ONLY after first frame with content is drawn
    const createStreamAfterFirstFrame = () => {
      // ✅ CRITICAL: Wait for both first frame AND video to be playing
      if (!streamCreated && firstFrameDrawn && video.readyState >= 2 && 
          video.videoWidth > 0 && video.videoHeight > 0) {
        try {
          // ✅ Verify canvas has actual dimensions
          if (canvas.width === 0 || canvas.height === 0) {
            console.warn('⚠️ Canvas dimensions invalid, waiting...');
            if (active) {
              setTimeout(createStreamAfterFirstFrame, 50);
            }
            return;
          }
          
          const canvasStream = canvas.captureStream(targetFPS);
          
          // ✅ CHECKPOINT 2: Validate canvas stream
          // ✅ VALIDATION 2.1: Verify stream has tracks
          const canvasTracks = canvasStream.getVideoTracks();
          if (canvasTracks.length === 0) {
            console.error('❌ [ADMIN] CHECKPOINT 2.1 FAILED: Canvas stream has no tracks!');
            console.warn('⚠️ Canvas stream has no tracks, retrying...');
            if (active) {
              setTimeout(createStreamAfterFirstFrame, 50);
            }
            return;
          }
          console.log('✅ [ADMIN] CHECKPOINT 2.1 PASSED: Canvas stream has tracks');
          
          // ✅ VALIDATION 2.2: Check canvas track is NOT muted
          const canvasTrack = canvasTracks[0];
          if ((canvasTrack as any).muted === true) {
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('❌ [ADMIN] CHECKPOINT 2.2 FAILED: Canvas track is MUTED!');
            console.error('❌ [ADMIN] This will cause black screen for players.');
            console.error('❌ [ADMIN] Falling back to original stream.');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            // ⛔ Don't use cropped stream - fall back to original
            streamRef.current = originalStreamRef.current;
            setScreenStream(originalStreamRef.current);
            streamCreated = false; // Prevent further attempts
            return;
          }
          console.log('✅ [ADMIN] CHECKPOINT 2.2 PASSED: Canvas track is NOT muted');
          
          // ✅ VALIDATION 2.3: Ensure canvas track is enabled
          if (!canvasTrack.enabled) {
            console.warn('⚠️ Canvas track disabled, enabling...');
            canvasTrack.enabled = true;
          }
          
          // ✅ VALIDATION 2.4: Wait for track to be ready
          if (canvasTrack.readyState === 'ended') {
            console.warn('⚠️ [ADMIN] Canvas track ended immediately, retrying...');
            if (active) {
              setTimeout(createStreamAfterFirstFrame, 50);
            }
            return;
          }
          
          if (canvasTrack.readyState !== 'live') {
            console.warn('⚠️ [ADMIN] Canvas track not live yet, waiting...');
            // Wait for track to become live
            let attempts = 0;
            const checkLive = () => {
              attempts++;
              if (canvasTrack.readyState === 'live') {
                console.log('✅ [ADMIN] CHECKPOINT 2.4 PASSED: Canvas track is now live');
                // Continue with stream creation
                finalizeCanvasStream();
              } else if (attempts <= 10 && active) {
                setTimeout(checkLive, 500);
              } else if (!active) {
                return; // Component unmounted
              } else {
                console.error('❌ [ADMIN] CHECKPOINT 2.4 FAILED: Canvas track never became live');
                // Fall back to original stream
                streamRef.current = originalStreamRef.current;
                setScreenStream(originalStreamRef.current);
              }
            };
            setTimeout(checkLive, 100);
            return;
          }
          
          // ✅ VALIDATION 2.5: Finalize canvas stream creation
          const finalizeCanvasStream = () => {
            croppedStreamRef.current = canvasStream;
            setCroppedStream(canvasStream);
            streamRef.current = canvasStream; // Use cropped stream
            setScreenStream(canvasStream);
            streamCreated = true;
            console.log('✅ [ADMIN] CHECKPOINT 2 PASSED: Canvas cropped stream created successfully:', {
              trackId: canvasTrack.id,
              trackState: canvasTrack.readyState,
              trackMuted: (canvasTrack as any).muted,
              trackEnabled: canvasTrack.enabled,
              canvasSize: { width: canvas.width, height: canvas.height }
            });
          };
          
          finalizeCanvasStream();
        } catch (err) {
          console.error('❌ Failed to create canvas stream:', err);
          if (active) {
            // Retry after delay
            setTimeout(createStreamAfterFirstFrame, 100);
          }
        }
      } else if (!streamCreated && active) {
        // Check again after a short delay if still active
        const reason = !firstFrameDrawn ? 'waiting for first frame' :
                       video.readyState < 2 ? 'video not ready' :
                       video.videoWidth === 0 ? 'video dimensions unknown' : 'unknown';
        if (reason !== 'unknown') {
          // Only log occasionally to avoid spam
          if (Math.random() < 0.1) { // 10% chance
            console.log(`⏳ Waiting for stream creation: ${reason}`);
          }
        }
        setTimeout(createStreamAfterFirstFrame, 50);
      }
    };

    // ✅ CRITICAL: Start drawing - wait for video to be ready AND playing
    const startDrawing = () => {
      const checkVideoReady = () => {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          // ✅ Ensure video is playing
          if (video.paused) {
            video.play().catch(err => {
              console.warn('Video play prevented:', err);
              // Continue anyway - user interaction might trigger play
            });
          }
          
          console.log('✅ Video ready, starting canvas rendering:', {
            width: video.videoWidth,
            height: video.videoHeight,
            readyState: video.readyState,
            paused: video.paused
          });
          
          // Start drawing
          animationFrameRef.current = requestAnimationFrame(drawFrame);
          // Start checking for first frame to create stream
          setTimeout(createStreamAfterFirstFrame, 200); // Slightly longer delay to ensure frames
        } else {
          // Not ready yet, wait a bit and check again
          setTimeout(checkVideoReady, 100);
        }
      };
      
      // Wait for metadata
      if (video.readyState >= 1) {
        // Already has some metadata, check if fully ready
        checkVideoReady();
      } else {
        // Wait for metadata first
        video.addEventListener('loadedmetadata', () => {
          checkVideoReady();
        }, { once: true });
      }
    };
    
    startDrawing();

    return () => {
      // ✅ CRITICAL: Stop animation frame FIRST
      active = false;
      firstFrameDrawn = false;
      streamCreated = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      cleanupCanvas();
    };
  }, [cropSettings, cleanupCanvas]);

  const createAndSendOffer = useCallback(async (clientId: string) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📤 [ADMIN] createAndSendOffer called for ${clientId}`);
    console.log(`📤 [ADMIN] Time: ${new Date().toISOString()}`);
    
    // Check if we already have a peer connection for this client to avoid duplicates
    if (peerConnectionsRef.current.has(clientId)) {
      console.log(`⚠️ [ADMIN] Peer connection already exists for ${clientId}, skipping creation`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }
    
    if (!streamRef.current) {
      console.error('❌ [ADMIN] Cannot create offer without an active media stream.');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }

    // ✅ CRITICAL: Ensure stream has active video track
    const videoTracks = streamRef.current.getVideoTracks();
    console.log(`📤 [ADMIN] Video tracks count: ${videoTracks.length}`);
    
    if (videoTracks.length === 0) {
      console.error('❌ [ADMIN] Stream has no video tracks.');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }

    // ✅ CRITICAL: Ensure video track is enabled and ready
    const videoTrack = videoTracks[0];
    
    // ✅ CRITICAL FIX #4: Verify track is not muted before creating offer
    if ((videoTrack as any).muted === true) {
      console.error(`❌ [ADMIN] CRITICAL: Video track is MUTED for ${clientId}! Cannot create offer.`);
      console.error(`❌ [ADMIN] This will cause black screen on player side.`);
      setError(`Video track is muted. Please restart screen share or select different screen/tab.`);
      return;
    }
    
    if (!videoTrack.enabled || videoTrack.readyState !== 'live') {
      // ✅ FIX: Add max retry limit to prevent infinite loops
      const retries = retryCountRef.current.get(clientId) || 0;
      const MAX_RETRIES = 10; // 5 seconds max (10 * 500ms)
      
      if (retries >= MAX_RETRIES) {
        console.error(`❌ Max retries reached for ${clientId}. Stream track not ready.`);
        retryCountRef.current.delete(clientId);
        setError(`Failed to connect to viewer ${clientId}. Stream not ready.`);
        return;
      }
      
      retryCountRef.current.set(clientId, retries + 1);
      console.warn(`⚠️ Video track not ready for ${clientId}, retry ${retries + 1}/${MAX_RETRIES}`);
      
      // Wait a bit and retry
      setTimeout(() => {
        if (isBroadcasting && streamRef.current && streamRef.current.getVideoTracks().length > 0) {
          const retryTrack = streamRef.current.getVideoTracks()[0];
          // ✅ CRITICAL: Also check if retry track is muted
          if ((retryTrack as any).muted === true) {
            console.error(`❌ [ADMIN] Retry track is still MUTED. Cannot proceed.`);
            setError(`Video track is muted. Please restart screen share.`);
            retryCountRef.current.delete(clientId);
            return;
          }
          if (retryTrack.enabled && retryTrack.readyState === 'live') {
            retryCountRef.current.delete(clientId); // Reset on success
            createAndSendOffer(clientId);
          } else {
            createAndSendOffer(clientId); // Retry again
          }
        }
      }, 500);
      return;
    }
    
    // ✅ Success - clear retry count
    retryCountRef.current.delete(clientId);

    console.log(`🚀 Creating new peer connection and offer for client: ${clientId}`);
    
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
      ],
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });

    peerConnectionsRef.current.set(clientId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`🧊 Sending ICE candidate to client: ${clientId}`);
        sendWebSocketMessage({
          type: 'webrtc:signal',
          data: {
            type: 'ice-candidate',
            to: clientId,
            from: authState.user?.id,
            candidate: event.candidate,
          },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`🔌 ADMIN WebRTC Connection State for ${clientId}: ${state}`);
      
      if (state === 'failed' || state === 'closed') {
        console.error(`❌ ADMIN WebRTC connection failed for ${clientId}.`);
        
        // ✅ CRITICAL: Log track states when connection fails
        const transceivers = pc.getTransceivers();
        transceivers.forEach((t, idx) => {
          console.error(`❌ [ADMIN] Transceiver ${idx} state:`, {
            mid: t.mid,
            direction: t.direction,
            currentDirection: t.currentDirection,
            senderTrackId: t.sender?.track?.id,
            senderTrackEnabled: t.sender?.track?.enabled,
            senderTrackState: t.sender?.track?.readyState,
            senderTrackMuted: (t.sender?.track as any)?.muted
          });
        });
        
        pc.close();
        peerConnectionsRef.current.delete(clientId);
      } else if (state === 'connected') {
        console.log(`✅ ADMIN WebRTC connection established with ${clientId}!`);
        
        // ✅ CRITICAL: Verify tracks are still active after connection
        const transceivers = pc.getTransceivers();
        transceivers.forEach((t, idx) => {
          const track = t.sender?.track;
          if (track) {
            console.log(`✅ [ADMIN] Transceiver ${idx} track state after connection:`, {
              trackId: track.id,
              enabled: track.enabled,
              readyState: track.readyState,
              muted: (track as any).muted,
              kind: track.kind
            });
            
            // Warn if track is muted or not enabled
            if (!track.enabled) {
              console.warn(`⚠️ [ADMIN] WARNING: Track ${track.kind} is DISABLED after connection!`);
            }
            if ((track as any).muted === true) {
              console.warn(`⚠️ [ADMIN] WARNING: Track ${track.kind} is MUTED after connection! No frames will be sent.`);
            }
          }
        });
      }
    };
    
    // ✅ CRITICAL: Check track state BEFORE creating peer connection
    const tracks = streamRef.current.getTracks();
    console.log(`📹 Checking ${tracks.length} tracks before creating peer connection for ${clientId}:`, {
      videoTracks: tracks.filter(t => t.kind === 'video').length,
      audioTracks: tracks.filter(t => t.kind === 'audio').length,
      trackStates: tracks.map(t => ({ 
        kind: t.kind, 
        enabled: t.enabled, 
        readyState: t.readyState,
        muted: (t as any).muted 
      }))
    });
    
    // ✅ VALIDATION: Check if any track is muted BEFORE creating peer connection
    const mutedTracks = tracks.filter(t => (t as any).muted === true);
    if (mutedTracks.length > 0) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(`❌ [ADMIN] CRITICAL: ${mutedTracks.length} track(s) are MUTED before creating peer connection!`);
      console.error(`❌ [ADMIN] This will cause black screen for ${clientId}.`);
      console.error(`❌ [ADMIN] Muted tracks:`, mutedTracks.map(t => ({ kind: t.kind, id: t.id })));
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Close peer connection immediately
      pc.close();
      peerConnectionsRef.current.delete(clientId);
      
      // Stop broadcasting if any track is muted
      setIsBroadcasting(false);
      setError(`❌ CRITICAL: Track(s) are muted. Cannot create connection for ${clientId}. Please restart screen share.`);
      showNotification('Screen share error: Track is muted. Please restart.', 'error');
      
      // Don't proceed
      return;
    }
    
    try {
      // ✅ CRITICAL: Add tracks to the peer connection and verify they're producing frames
      tracks.forEach(track => {
        // ✅ FIX: Ensure track is enabled and not muted before adding
        if (!track.enabled) {
          console.warn(`⚠️ [ADMIN] Track ${track.kind} is disabled, enabling...`);
          track.enabled = true;
        }
        
        // ✅ CRITICAL FIX #4: STRICT validation - don't add muted tracks - they won't send frames
        // Double-check right before adding (track state can change)
        if ((track as any).muted === true) {
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error(`❌ [ADMIN] CRITICAL: Track ${track.kind} is MUTED! Cannot add to peer connection.`);
          console.error(`❌ [ADMIN] This is the root cause of black screen on player side.`);
          console.error(`❌ [ADMIN] Track muted state:`, {
            muted: (track as any).muted,
            enabled: track.enabled,
            readyState: track.readyState,
            trackId: track.id
          });
          console.error(`❌ [ADMIN] CLOSING peer connection for ${clientId} - muted track detected during add.`);
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          // ✅ CRITICAL: Don't add muted tracks - close connection and show error
          setError(`❌ CRITICAL: Track ${track.kind} is muted. Connection to ${clientId} blocked. Please restart screen share.`);
          pc.close();
          peerConnectionsRef.current.delete(clientId);
          // ✅ CRITICAL: Stop broadcasting if any track is muted
          setIsBroadcasting(false);
          setIsCropReady(false);
          showNotification('Screen share error: Track became muted. Please restart.', 'error');
          throw new Error(`Cannot add muted ${track.kind} track to peer connection - connection blocked`);
        } else {
          console.log(`✅ [ADMIN] Track ${track.kind} is NOT muted - ready to add to peer connection`);
        }
        
        // ✅ CRITICAL FIX #1: Continuous track monitoring with enhanced mute detection
        let muteCheckInterval: NodeJS.Timeout | null = null;
        
        const checkMuteState = () => {
          if ((track as any).muted === true) {
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error(`❌ [ADMIN] CRITICAL: Track ${track.kind} is MUTED!`);
            console.error(`❌ [ADMIN] Connection to ${clientId} will show black screen.`);
            console.error(`❌ [ADMIN] Track state:`, {
              enabled: track.enabled,
              readyState: track.readyState,
              muted: (track as any).muted,
              trackId: track.id
            });
            console.error(`❌ [ADMIN] Closing connection and stopping broadcast.`);
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // Stop monitoring
            if (muteCheckInterval) {
              clearInterval(muteCheckInterval);
              muteCheckInterval = null;
            }
            
            setIsBroadcasting(false);
            setError(`❌ Track ${track.kind} became muted. Broadcast stopped. Please restart screen share.`);
            pc.close();
            peerConnectionsRef.current.delete(clientId);
            return true; // Track is muted
          }
          return false; // Track is not muted
        };
        
        // ✅ CRITICAL: Check immediately and set up continuous monitoring
        checkMuteState();
        
        // ✅ ENHANCED: Monitor for mute events AND check periodically
        const muteHandler = () => {
          console.error(`❌ [ADMIN] CRITICAL: Track ${track.kind} mute event fired!`);
          checkMuteState();
        };
        
        track.addEventListener('mute', muteHandler);
        
        // ✅ NEW: Continuous monitoring - check every 2 seconds for 60 seconds (30 checks)
        let checkCount = 0;
        muteCheckInterval = setInterval(() => {
          checkCount++;
          const isMuted = checkMuteState();
          
          if (isMuted) {
            // Track is muted - interval will be cleared in checkMuteState
            return;
          }
          
          // Log progress every 10 checks (every 20 seconds)
          if (checkCount % 10 === 0) {
            console.log(`✅ [ADMIN] Track ${track.kind} still healthy after ${checkCount * 2} seconds`);
          }
          
          // Stop monitoring after 60 seconds (30 checks)
          if (checkCount >= 30) {
            console.log(`✅ [ADMIN] Track ${track.kind} monitoring complete - track is healthy`);
            if (muteCheckInterval) {
              clearInterval(muteCheckInterval);
              muteCheckInterval = null;
            }
          }
        }, 2000);
        
        // ✅ CRITICAL: Clean up interval when connection closes
        pc.addEventListener('connectionstatechange', () => {
          if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
            if (muteCheckInterval) {
              clearInterval(muteCheckInterval);
              muteCheckInterval = null;
            }
            track.removeEventListener('mute', muteHandler);
          }
        });
        
        // ✅ CRITICAL: Add track to peer connection only if not muted
        pc.addTrack(track, streamRef.current!);
        console.log(`✅ Added ${track.kind} track:`, {
          trackId: track.id,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: (track as any).muted,
          kind: track.kind,
          label: track.label,
          settings: track.getSettings ? track.getSettings() : 'N/A'
        });
        
        // ✅ CRITICAL: Add event listeners to track to verify it's working
        track.addEventListener('ended', () => {
          console.error(`❌ [ADMIN] Track ${track.kind} ended for client ${clientId}!`);
        }, { once: true });
        
        track.addEventListener('mute', () => {
          console.warn(`⚠️ [ADMIN] Track ${track.kind} muted for client ${clientId}!`);
        }, { once: true });
        
        track.addEventListener('unmute', () => {
          console.log(`✅ [ADMIN] Track ${track.kind} unmuted for client ${clientId}`);
        }, { once: true });
      });
      
      // ✅ CRITICAL: Log transceivers to verify tracks are properly added
      const transceivers = pc.getTransceivers();
      console.log(`📡 [ADMIN] Peer connection transceivers for ${clientId}:`, {
        transceiverCount: transceivers.length,
        transceivers: transceivers.map((t, idx) => ({
          index: idx,
          mid: t.mid,
          kind: t.sender?.track?.kind || t.receiver?.track?.kind || 'unknown',
          direction: t.direction,
          currentDirection: t.currentDirection,
          senderTrackId: t.sender?.track?.id,
          senderTrackEnabled: t.sender?.track?.enabled,
          senderTrackState: t.sender?.track?.readyState
        }))
      });
    } catch (trackError) {
      console.error('❌ Error adding tracks to peer connection:', trackError);
      // Clean up the peer connection if adding tracks failed
      pc.close();
      peerConnectionsRef.current.delete(clientId);
      setError(`Failed to add tracks to connection for ${clientId}.`);
      return;
    }

    try {
      console.log(`📤 [ADMIN] Creating offer for ${clientId}...`);
      
      // ✅ CRITICAL FIX #4: FINAL validation RIGHT BEFORE creating offer
      // This is the LAST chance to catch muted tracks before sending offer
      const tracksBeforeOffer = streamRef.current?.getVideoTracks() || [];
      const videoTrackBeforeOffer = tracksBeforeOffer[0];
      
      if (!videoTrackBeforeOffer) {
        console.error(`❌ [ADMIN] CRITICAL: No video track found right before creating offer for ${clientId}!`);
        setError(`No video track available for ${clientId}. Please restart screen share.`);
        pc.close();
        peerConnectionsRef.current.delete(clientId);
        return;
      }
      
      if ((videoTrackBeforeOffer as any).muted === true) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error(`❌ [ADMIN] CRITICAL: Track is MUTED RIGHT BEFORE creating offer for ${clientId}! BLOCKING.`);
        console.error('❌ [ADMIN] Track was muted between adding to peer connection and creating offer.');
        console.error('❌ [ADMIN] Track state:', {
          enabled: videoTrackBeforeOffer.enabled,
          readyState: videoTrackBeforeOffer.readyState,
          muted: (videoTrackBeforeOffer as any).muted,
          trackId: videoTrackBeforeOffer.id
        });
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        setIsBroadcasting(false);
        setError(`❌ OFFER BLOCKED: Video track is muted for ${clientId}. Please restart screen share.`);
        pc.close();
        peerConnectionsRef.current.delete(clientId);
        return;
      }
      
      if (!videoTrackBeforeOffer.enabled || videoTrackBeforeOffer.readyState !== 'live') {
        console.error(`❌ [ADMIN] CRITICAL: Track not ready right before creating offer for ${clientId}!`);
        console.error('❌ [ADMIN] Track state:', {
          enabled: videoTrackBeforeOffer.enabled,
          readyState: videoTrackBeforeOffer.readyState,
          muted: (videoTrackBeforeOffer as any).muted
        });
        setIsBroadcasting(false);
        setError(`Video track not ready for ${clientId}. Please restart screen share.`);
        pc.close();
        peerConnectionsRef.current.delete(clientId);
        return;
      }
      
      // ✅ Also check tracks already added to peer connection
      const transceiversBeforeOffer = pc.getTransceivers();
      for (const transceiver of transceiversBeforeOffer) {
        const senderTrack = transceiver.sender?.track;
        if (senderTrack && senderTrack.kind === 'video') {
          if ((senderTrack as any).muted === true) {
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error(`❌ [ADMIN] CRITICAL: Track in peer connection is MUTED for ${clientId}! BLOCKING.`);
            console.error('❌ [ADMIN] Track in transceiver is muted - cannot send frames.');
            console.error('❌ [ADMIN] Track state:', {
              enabled: senderTrack.enabled,
              readyState: senderTrack.readyState,
              muted: (senderTrack as any).muted,
              trackId: senderTrack.id
            });
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            setIsBroadcasting(false);
            setError(`❌ OFFER BLOCKED: Track in peer connection is muted for ${clientId}. Please restart screen share.`);
            pc.close();
            peerConnectionsRef.current.delete(clientId);
            return;
          }
        }
      }
      
      console.log(`✅ [ADMIN] FINAL validation passed - track is ready and unmuted before creating offer for ${clientId}:`, {
        enabled: videoTrackBeforeOffer.enabled,
        readyState: videoTrackBeforeOffer.readyState,
        muted: (videoTrackBeforeOffer as any).muted,
        trackId: videoTrackBeforeOffer.id,
        transceivers: transceiversBeforeOffer.length
      });
      
      // ✅ CRITICAL: Create offer with proper video encoding constraints
      // This ensures frames are actually encoded and sent
      const offer = await pc.createOffer({
        offerToReceiveVideo: false, // We're sending video, not receiving
        offerToReceiveAudio: false  // No audio
      });
      
      // ✅ CRITICAL: Set proper codec preferences if possible
      // This helps ensure compatibility and frame transmission
      await pc.setLocalDescription(offer);
      
      // ✅ CRITICAL: Verify transceivers are configured correctly after setting description
      const transceivers = pc.getTransceivers();
      transceivers.forEach((transceiver, idx) => {
        const track = transceiver.sender?.track;
        if (track && track.kind === 'video') {
          console.log(`✅ [ADMIN] Transceiver ${idx} (video) configuration:`, {
            mid: transceiver.mid,
            direction: transceiver.direction,
            currentDirection: transceiver.currentDirection,
            trackId: track.id,
            trackEnabled: track.enabled,
            trackMuted: (track as any).muted,
            trackReadyState: track.readyState
          });
        }
      });

      console.log(`⬆️ [ADMIN] Sending offer to client: ${clientId}`);
      console.log(`⬆️ [ADMIN] Offer type: ${offer.type}, SDP length: ${offer.sdp?.length || 0} chars`);
      console.log(`⬆️ [ADMIN] Offer SDP (first 200 chars): ${offer.sdp?.substring(0, 200)}`);
      // ✅ FIX: Send full RTCSessionDescriptionInit object, not just SDP string
      sendWebSocketMessage({
        type: 'webrtc:signal',
        data: {
          type: 'offer',
          to: clientId,
          from: authState.user?.id,
          sdp: offer, // Send full RTCSessionDescriptionInit object
        },
      });
      console.log(`✅ [ADMIN] Offer sent successfully to ${clientId}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (err) {
      console.error(`❌ [ADMIN] Failed to create or send offer to ${clientId}:`, err);
      // Clean up the peer connection if offer creation failed
      pc.close();
      peerConnectionsRef.current.delete(clientId);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      setError(`Failed to create offer for ${clientId}.`);
    }
  }, [sendWebSocketMessage, authState.user?.id, isBroadcasting]);
  
  const setCropSettings = useCallback((settings: CropSettings | null) => {
    cropSettingsRef.current = settings;
    setCropSettingsState(settings);
    
    // Update active stream based on crop settings
    if (settings?.enabled && croppedStreamRef.current) {
      streamRef.current = croppedStreamRef.current;
      setScreenStream(croppedStreamRef.current);
    } else if (originalStreamRef.current) {
      streamRef.current = originalStreamRef.current;
      setScreenStream(originalStreamRef.current);
    }
  }, []);

  // Confirm crop and start broadcasting to players
  const confirmCropAndStart = useCallback(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[LOG] confirmCropAndStart called');
    if (!isStreaming || !streamRef.current) {
      setError('Please start screen share first');
      return;
    }

    if (videoRef.current && videoRef.current.readyState < 2) {
      setError('Video not ready yet. Please wait...');
      return;
    }

    // ✅ CHECKPOINT 3: Pre-broadcast final validation - LAST CHANCE to catch issues
    // ✅ VALIDATION 3.1: Get active stream
    const activeStream = cropSettingsRef.current?.enabled ? croppedStreamRef.current : streamRef.current;
    if (!activeStream) {
      console.error('❌ [ADMIN] CHECKPOINT 3.1 FAILED: No active stream available');
      setError('Stream not available. Please restart screen share.');
      setIsBroadcasting(false);
      return; // ⛔ BLOCK
    }
    console.log('✅ [ADMIN] CHECKPOINT 3.1 PASSED: Active stream available');
    
    const finalVideoTracks = activeStream.getVideoTracks();
    if (finalVideoTracks.length === 0) {
      console.error('❌ [ADMIN] CHECKPOINT 3.1 FAILED: Stream has no video tracks');
      setError('Stream has no video tracks. Please restart screen share.');
      setIsBroadcasting(false);
      return; // ⛔ BLOCK
    }
    console.log('✅ [ADMIN] CHECKPOINT 3.1 PASSED: Stream has video tracks');
    
    const finalVideoTrack = finalVideoTracks[0];
    
    // ✅ VALIDATION 3.2: FINAL CHECK - Track MUST NOT be muted (CRITICAL)
    if ((finalVideoTrack as any).muted === true) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [ADMIN] CHECKPOINT 3.2 FAILED: Track is MUTED RIGHT BEFORE broadcast!');
      console.error('❌ [ADMIN] This will cause black screen on ALL players.');
      console.error('❌ [ADMIN] BLOCKING broadcast to prevent black screen.');
      console.error('❌ [ADMIN] Track state:', {
        enabled: finalVideoTrack.enabled,
        readyState: finalVideoTrack.readyState,
        muted: (finalVideoTrack as any).muted,
        trackId: finalVideoTrack.id
      });
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      setIsBroadcasting(false);
      setError('❌ BROADCAST BLOCKED: Video track is muted. This will cause black screen for all players. Please restart screen share or select a different screen/tab.');
      return; // ⛔ BLOCK - Don't broadcast muted track
    }
    console.log('✅ [ADMIN] CHECKPOINT 3.2 PASSED: Track is NOT muted');
    
    // ✅ VALIDATION 3.3: Track MUST be enabled
    if (!finalVideoTrack.enabled) {
      console.warn('⚠️ [ADMIN] Track disabled, enabling...');
      finalVideoTrack.enabled = true;
      // Re-check muted state after enabling
      if ((finalVideoTrack as any).muted === true) {
        console.error('❌ [ADMIN] CHECKPOINT 3.3 FAILED: Track still muted after enabling');
        setIsBroadcasting(false);
        setError('Video track is muted. Please restart screen share.');
        return; // ⛔ BLOCK
      }
    }
    console.log('✅ [ADMIN] CHECKPOINT 3.3 PASSED: Track is enabled');
    
    // ✅ VALIDATION 3.4: Track MUST be live
    if (finalVideoTrack.readyState !== 'live') {
      console.error('❌ [ADMIN] CHECKPOINT 3.4 FAILED: Track not live yet');
      setError('Stream track is not live yet. Please wait...');
      setIsBroadcasting(false);
      return; // ⛔ BLOCK
    }
    console.log('✅ [ADMIN] CHECKPOINT 3.4 PASSED: Track is live');

    if (cropSettingsRef.current?.enabled) {
      if (!croppedStreamRef.current || croppedStreamRef.current.getVideoTracks().length === 0 || croppedStreamRef.current.getVideoTracks()[0].readyState !== 'live') {
        setError('Crop stream not ready yet. Please wait a moment and try again.');
        return;
      }
    }

    console.log('✅ Stream readiness verified:', {
      hasStream: !!activeStream,
      videoTracks: finalVideoTracks.length,
      trackState: finalVideoTrack.readyState,
      trackEnabled: finalVideoTrack.enabled,
      streamId: streamIdRef.current
    });

    setIsCropReady(true);
    setIsBroadcasting(true);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[LOG] Sending stream-start message');
    console.log('[LOG] StreamId:', streamIdRef.current);
    console.log('[LOG] Admin ID:', authState.user?.id);
    console.log('[LOG] Stream ready:', {
      hasStream: !!streamRef.current,
      videoTracks: streamRef.current?.getVideoTracks().length || 0,
      trackStates: streamRef.current?.getVideoTracks().map(t => ({
        enabled: t.enabled,
        readyState: t.readyState,
        muted: (t as any).muted
      })) || []
    });
    
    const message = {
      type: 'webrtc:signal' as const,
      data: {
        type: 'stream-start' as const,
        from: authState.user?.id,
        streamId: streamIdRef.current,
      },
    };
    
    console.log('[LOG] Full message being sent:', JSON.stringify(message, null, 2));
    console.log('[LOG] sendWebSocketMessage function:', typeof sendWebSocketMessage);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // ✅ VALIDATION 3.5: Final validation RIGHT BEFORE sending stream-start
    // Double-check everything one more time (track state can change)
    const absoluteFinalTrack = activeStream.getVideoTracks()[0];
    if (!absoluteFinalTrack) {
      console.error('❌ [ADMIN] CHECKPOINT 3.5 FAILED: No track found at final check');
      setError('No video track available. Please restart screen share.');
      setIsBroadcasting(false);
      return; // ⛔ BLOCK
    }
    
    if ((absoluteFinalTrack as any).muted === true) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [ADMIN] CHECKPOINT 3.5 FAILED: Track became MUTED at final check!');
      console.error('❌ [ADMIN] Track was muted between validation and broadcast start.');
      console.error('❌ [ADMIN] BLOCKING broadcast to prevent black screen.');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      setIsBroadcasting(false);
      setError('❌ BROADCAST BLOCKED: Video track became muted. Please restart screen share.');
      return; // ⛔ BLOCK
    }
    
    if (!absoluteFinalTrack.enabled || absoluteFinalTrack.readyState !== 'live') {
      console.error('❌ [ADMIN] CHECKPOINT 3.5 FAILED: Track not ready at final check');
      setError('Video track not ready. Please restart screen share.');
      setIsBroadcasting(false);
      return; // ⛔ BLOCK
    }
    
    console.log('✅ [ADMIN] CHECKPOINT 3 PASSED: All pre-broadcast validations passed:', {
      enabled: absoluteFinalTrack.enabled,
      readyState: absoluteFinalTrack.readyState,
      muted: (absoluteFinalTrack as any).muted,
      trackId: absoluteFinalTrack.id
    });
    
    try {
      sendWebSocketMessage(message);
      console.log('[LOG] ✅ stream-start message sent successfully via sendWebSocketMessage');
    } catch (error) {
      console.error('[LOG] ❌ Error sending stream-start message:', error);
    }

    if (pendingViewersRef.current.size > 0) {
      console.log(`[LOG] Processing ${pendingViewersRef.current.size} pending viewers`);
      const pending = Array.from(pendingViewersRef.current);
      pendingViewersRef.current.clear();
      
      pending.forEach((clientId, index) => {
        setTimeout(() => {
          if (streamRef.current && streamRef.current.getVideoTracks().length > 0) {
            createAndSendOffer(clientId);
          } else {
            pendingViewersRef.current.add(clientId);
          }
        }, 100 * (index + 1));
      });
    }

    showNotification('✅ Streaming started! Players can now see your stream.', 'success');
  }, [isStreaming, sendWebSocketMessage, authState.user?.id, showNotification, createAndSendOffer]);

  const skipCropAndStart = useCallback(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[LOG] skipCropAndStart called');
    if (!isStreaming || !originalStreamRef.current) {
      setError('Please start screen share first');
      return;
    }
    
    // ✅ CRITICAL: Quick check - ensure track is NOT muted before proceeding
    const quickTracks = originalStreamRef.current.getVideoTracks();
    if (quickTracks.length > 0) {
      const quickTrack = quickTracks[0];
      if ((quickTrack as any).muted === true) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ [ADMIN] CRITICAL: Track is MUTED when trying to skip crop and start!');
        console.error('❌ [ADMIN] This likely happened due to tab/window losing focus.');
        console.error('❌ [ADMIN] BLOCKING broadcast to prevent black screen.');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        setIsBroadcasting(false);
        setError('❌ Track is muted. This usually happens when the browser tab loses focus. Please restart screen share and keep the tab active.');
        showNotification('Track is muted. Please restart screen share.', 'error');
        return; // ⛔ BLOCK
      }
    }

    setCropSettings(null);
    streamRef.current = originalStreamRef.current;
    setScreenStream(originalStreamRef.current);

    // ✅ FIX: Enhanced stream readiness check with retry
    const checkStreamReady = () => {
      const stream = streamRef.current;
      if (!stream) {
        console.warn('⚠️ Stream not available yet, retrying...');
        setTimeout(checkStreamReady, 100);
        return;
      }

      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        console.warn('⚠️ Stream has no video tracks yet, retrying...');
        setTimeout(checkStreamReady, 100);
        return;
      }

      const videoTrack = videoTracks[0];
      if (videoTrack.readyState !== 'live') {
        console.warn('⚠️ Video track not live yet, retrying...');
        setTimeout(checkStreamReady, 100);
        return;
      }

      // ✅ FIX: Also check video element readiness
      if (videoRef.current && videoRef.current.readyState < 2) {
        console.warn('⚠️ Video element not ready yet, retrying...');
        setTimeout(checkStreamReady, 100);
        return;
      }

      console.log('✅ Stream readiness verified:', {
        hasStream: !!stream,
        videoTracks: videoTracks.length,
        trackState: videoTrack.readyState,
        trackEnabled: videoTrack.enabled,
        streamId: streamIdRef.current
      });

      setIsCropReady(true);
      setIsBroadcasting(true);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[LOG] Sending stream-start message (skipped crop)');
      console.log('[LOG] StreamId:', streamIdRef.current);
      console.log('[LOG] Admin ID:', authState.user?.id);
      console.log('[LOG] Stream ready:', {
        hasStream: !!streamRef.current,
        videoTracks: streamRef.current?.getVideoTracks().length || 0,
        trackStates: streamRef.current?.getVideoTracks().map(t => ({
          enabled: t.enabled,
          readyState: t.readyState,
          muted: (t as any).muted
        })) || []
      });
      
      const message = {
        type: 'webrtc:signal' as const,
        data: {
          type: 'stream-start' as const,
          from: authState.user?.id,
          streamId: streamIdRef.current,
        },
      };
      
      console.log('[LOG] Full message being sent:', JSON.stringify(message, null, 2));
      console.log('[LOG] sendWebSocketMessage function:', typeof sendWebSocketMessage);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      try {
        sendWebSocketMessage(message);
        console.log('[LOG] ✅ stream-start message sent successfully via sendWebSocketMessage (skipped crop)');
      } catch (error) {
        console.error('[LOG] ❌ Error sending stream-start message:', error);
      }

      showNotification('✅ Streaming started! Players can now see your stream.', 'success');
    };

    // Start checking immediately
    checkStreamReady();
  }, [isStreaming, sendWebSocketMessage, authState.user?.id, showNotification, setCropSettings]);

  const startWebRTCScreenShare = useCallback(async () => {
    console.log('[LOG] startWebRTCScreenShare called');
    if (isStreaming || isInitializing) {
      console.warn('⚠️ Stream already in progress.');
      return;
    }
    
    console.log('🎬 Starting WebRTC screen share...');
    setIsInitializing(true);
    setError(null);
    
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          cursor: 'always',
        } as MediaTrackConstraints & { cursor?: 'always' | 'never' | 'motion' },
        audio: false,
      });
      console.log('[LOG] getDisplayMedia success, stream:', stream);
      
      // ✅ CRITICAL FIX #1: Ensure all tracks are enabled and NOT muted
      const tracks = stream.getTracks();
      console.log('📹 [ADMIN] Stream tracks captured:', tracks.length);
      
      // ✅ CHECKPOINT 1: Validate tracks at capture - CRITICAL for preventing black screen
      let hasMutedTrack = false;
      const mutedTracks: MediaStreamTrack[] = [];
      let hasNonLiveTrack = false;
      
      // ✅ VALIDATION 1.1, 1.2, 1.3: Check all tracks
      for (let idx = 0; idx < tracks.length; idx++) {
        const track = tracks[idx];
        
        console.log(`📹 [ADMIN] Track ${idx} validation:`, {
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: (track as any).muted,
          trackId: track.id
        });
        
        // ✅ VALIDATION 1.2: Ensure track is enabled
        if (!track.enabled) {
          console.warn(`⚠️ [ADMIN] Track ${idx} (${track.kind}) is disabled, enabling...`);
          track.enabled = true;
        }
        
        // ✅ VALIDATION 1.1: CRITICAL - BLOCK muted tracks (ROOT CAUSE of black screen)
        if ((track as any).muted === true) {
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error(`❌ [ADMIN] CHECKPOINT 1.1 FAILED: Track ${idx} (${track.kind}) is MUTED at capture!`);
          console.error(`❌ [ADMIN] This will cause black screen on player side.`);
          console.error(`❌ [ADMIN] BLOCKING: Cannot proceed with muted track.`);
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          hasMutedTrack = true;
          mutedTracks.push(track);
          continue;
        } else {
          console.log(`✅ [ADMIN] CHECKPOINT 1.1 PASSED: Track ${idx} (${track.kind}) is NOT muted`);
        }
        
        // ✅ VALIDATION 1.3: Wait for track to be live (if video track)
        if (track.kind === 'video') {
          if (track.readyState !== 'live') {
            console.warn(`⚠️ [ADMIN] Track ${idx} (${track.kind}) not live yet: ${track.readyState}, waiting...`);
            hasNonLiveTrack = true;
            
            // Wait up to 5 seconds for track to become live
            let attempts = 0;
            const checkLive = () => {
              attempts++;
              if (track.readyState === 'live') {
                console.log(`✅ [ADMIN] CHECKPOINT 1.3 PASSED: Track ${idx} is now live`);
                hasNonLiveTrack = false;
              } else if (attempts <= 10) {
                // Check every 500ms, up to 10 times (5 seconds)
                setTimeout(checkLive, 500);
              } else {
                console.error(`❌ [ADMIN] CHECKPOINT 1.3 FAILED: Track ${idx} never became live after 5 seconds`);
                hasNonLiveTrack = true;
              }
            };
            
            // Start checking after a short delay
            setTimeout(checkLive, 100);
          } else {
            console.log(`✅ [ADMIN] CHECKPOINT 1.3 PASSED: Track ${idx} is live`);
          }
        }
        
        // ✅ CRITICAL: Monitor track state changes (for all tracks)
        track.addEventListener('mute', () => {
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error(`❌ [ADMIN] CRITICAL: Track ${idx} (${track.kind}) was MUTED after capture!`);
          console.error(`❌ [ADMIN] This will cause black screen for ALL players.`);
          console.error(`❌ [ADMIN] Track was muted by browser/OS (common when tab loses focus).`);
          console.error(`❌ [ADMIN] Stopping screen share to prevent black screen.`);
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          // ✅ CRITICAL: If track gets muted after capture, stop streaming and show error
          setIsInitializing(false);
          setIsStreaming(false);
          setIsBroadcasting(false);
          setIsCropReady(false);
          
          // Stop all tracks
          stream.getTracks().forEach(t => {
            try {
              t.stop();
            } catch (e) {
              console.warn('Error stopping track:', e);
            }
          });
          
          // Clean up refs
          originalStreamRef.current = null;
          streamRef.current = null;
          croppedStreamRef.current = null;
          setOriginalStream(null);
          setScreenStream(null);
          setCroppedStream(null);
          
          // Clear peer connections
          peerConnectionsRef.current.forEach((pc, clientId) => {
            try {
              pc.close();
            } catch (e) {
              console.warn('Error closing peer connection:', e);
            }
          });
          peerConnectionsRef.current.clear();
          
          setError('❌ Screen share stopped: Video track was muted by browser/OS. This usually happens when the tab loses focus or screen share permissions change. Please restart screen share and keep the tab focused.');
          showNotification('Screen share stopped: Track was muted. Please restart.', 'error');
        });
        
        track.addEventListener('unmute', () => {
          console.log(`✅ [ADMIN] Track ${idx} (${track.kind}) was unmuted.`);
          // If track was unmuted after being muted, user might want to resume
          // But we've already stopped streaming, so they need to restart
          console.log(`ℹ️ [ADMIN] Track unmuted. You may restart screen share if needed.`);
        });
        
        // ✅ CRITICAL: Also monitor tab visibility to warn user before mute happens
        const handleVisibilityChange = () => {
          if (document.hidden && isStreaming) {
            console.warn('⚠️ [ADMIN] Tab became hidden! Screen share may be muted by browser.');
            console.warn('⚠️ [ADMIN] Please keep the tab focused to prevent track muting.');
            showNotification('Warning: Tab is hidden. Screen share may stop.', 'warning');
          } else if (!document.hidden && isStreaming) {
            // Tab became visible again - check if track is still good
            if ((track as any).muted === true) {
              console.error('❌ [ADMIN] Track is muted after tab became visible again!');
              // The mute event handler will handle cleanup
            } else {
              console.log('✅ [ADMIN] Tab visible, track still active');
            }
          }
        };
        
        // Listen for visibility changes
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Store handler for cleanup
        (track as any)._visibilityHandler = handleVisibilityChange;
      }
      
      // ✅ FAILURE ACTION: STOP if any track is muted - don't proceed with muted tracks
      if (hasMutedTrack) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ [ADMIN] CHECKPOINT 1 FAILED: BLOCKING screen share - muted tracks detected!');
        console.error('❌ [ADMIN] Muted tracks:', mutedTracks.map(t => ({ kind: t.kind, id: t.id })));
        console.error('❌ [ADMIN] Screen share cannot proceed. Please restart and try a different screen/tab.');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        setIsInitializing(false);
        setError('❌ Screen share blocked: Video track is muted at capture. This will cause black screen for players. Please restart screen share or select a different screen/tab. This is usually caused by browser or OS settings that prevent screen sharing.');
        setIsStreaming(false);
        setOriginalStream(null);
        setScreenStream(null);
        originalStreamRef.current = null;
        streamRef.current = null;
        showNotification('Screen share blocked: Track is muted. Please try again.', 'error');
        return; // ⛔ BLOCK - Don't proceed with muted track
      }
      
      // ✅ FAILURE ACTION: STOP if track never becomes live
      if (hasNonLiveTrack) {
        // Wait a bit more, then check again
        setTimeout(() => {
          const stillNotLive = stream.getTracks().some(t => t.kind === 'video' && t.readyState !== 'live');
          if (stillNotLive) {
            console.error('❌ [ADMIN] CHECKPOINT 1.3 FAILED: Track never became live');
            stream.getTracks().forEach(track => track.stop());
            setIsInitializing(false);
            setError('Screen share failed: Track never became ready. Please restart.');
            setIsStreaming(false);
            setOriginalStream(null);
            setScreenStream(null);
            originalStreamRef.current = null;
            streamRef.current = null;
            showNotification('Screen share failed: Track not ready. Please try again.', 'error');
          }
        }, 6000); // Check after 6 seconds total
      }
      
      console.log('✅ [ADMIN] CHECKPOINT 1 PASSED: All tracks validated successfully');
      
      originalStreamRef.current = stream;
      setOriginalStream(stream);
      
      if (videoRef.current) {
        if (metadataHandlerRef.current) {
          videoRef.current.removeEventListener('loadedmetadata', metadataHandlerRef.current);
        }
        videoRef.current.srcObject = null;
      }
      
      if (!videoRef.current) {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        videoRef.current = video;
        
        const playVideo = async () => {
          try {
            await video.play();
            console.log('✅ Video element playing');
          } catch (err) {
            console.error('⚠️ Auto-play blocked, will play on user interaction:', err);
          }
        };
        
        video.addEventListener('loadedmetadata', () => {
          console.log('✅ Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);
          playVideo();
        }, { once: true });
        
        if (video.readyState >= 1) {
          playVideo();
        }
      } else {
        videoRef.current.srcObject = stream;
        if (videoRef.current.readyState >= 1) {
          videoRef.current.play().catch(err => {
            console.warn('Video play warning:', err);
          });
        }
      }
      
      if (canvasRef.current && croppedStreamRef.current) {
        croppedStreamRef.current.getTracks().forEach(track => track.stop());
        croppedStreamRef.current = null;
        setCroppedStream(null);
      }
      
      if (!canvasRef.current) {
        const canvas = document.createElement('canvas');
        canvas.style.display = 'none';
        document.body.appendChild(canvas);
        canvasRef.current = canvas;
      }

      const handleTrackEnded = () => {
        console.warn('⚠️ Screen share ended by user');
        setError('Screen share ended. Please restart stream.');
        cleanupWebRTC();
      };

      const handleMetadataLoaded = () => {
        if (videoRef.current) {
          const { videoWidth, videoHeight } = videoRef.current;
          console.log('✅ Video metadata loaded:', videoWidth, 'x', videoHeight);
          
          if (!cropSettingsRef.current) {
            streamRef.current = stream;
            setScreenStream(stream);
          }
        }
      };

      trackEndedHandlerRef.current = handleTrackEnded;
      metadataHandlerRef.current = handleMetadataLoaded;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && trackEndedHandlerRef.current) {
        videoTrack.addEventListener('ended', trackEndedHandlerRef.current);
        (videoTrack as any)._endedHandler = trackEndedHandlerRef.current;
      }

      if (videoRef.current && metadataHandlerRef.current) {
        videoRef.current.addEventListener('loadedmetadata', metadataHandlerRef.current, { once: true });
      }

      streamRef.current = stream;
      setScreenStream(stream);

      streamIdRef.current = `stream-${Date.now()}-${authState.user?.id || 'admin'}`;

      setIsStreaming(true);
      setIsBroadcasting(false);
      setIsCropReady(false);
      showNotification('✅ Screen capture started! Please select crop area or skip to start streaming.', 'success');

    } catch (err) {
      console.error('❌ Error starting screen share:', err);
      const errorMessage = (err as Error).message;
      if (errorMessage.includes('Permission denied')) {
        setError('Screen share permission was denied. Please allow screen sharing and try again.');
      } else {
        setError(`Failed to start screen share: ${errorMessage}`);
      }
      showNotification(`Failed to start screen share: ${errorMessage}`, 'error');
      cleanupWebRTC();
    } finally {
      setIsInitializing(false);
    }
  }, [isStreaming, isInitializing, sendWebSocketMessage, authState.user?.id, showNotification, cleanupWebRTC]);

  const stopWebRTCScreenShare = useCallback(() => {
    console.log('🛑 Stopping WebRTC screen share...');
    if (authState.user?.id) {
      sendWebSocketMessage({
        type: 'webrtc:signal',
        data: { type: 'stream-stop', from: authState.user.id },
      });
    }
    showNotification('Screen sharing stopped', 'info');
    cleanupWebRTC();
  }, [sendWebSocketMessage, authState.user?.id, showNotification, cleanupWebRTC]);
  
  // Effect to handle incoming WebSocket signals
  useEffect(() => {
    const handleNewViewer = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const clientId = detail.from;
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🆕 [ADMIN] New viewer notification received');
      console.log('🆕 [ADMIN] Viewer clientId:', clientId);
      console.log('🆕 [ADMIN] Broadcasting status:', isBroadcasting);
      console.log('🆕 [ADMIN] Streaming status:', isStreaming);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (peerConnectionsRef.current.has(clientId)) {
        console.log(`⚠️ [ADMIN] Already have connection for ${clientId}, skipping`);
        return;
      }
      
      const currentStream = streamRef.current;
      const hasStream = currentStream && currentStream.getVideoTracks().length > 0;
      
      console.log('🆕 [ADMIN] Stream check:', {
        hasStream: !!currentStream,
        videoTracks: currentStream?.getVideoTracks().length || 0,
        isBroadcasting,
        isStreaming
      });
      
      if (hasStream && isBroadcasting) {
        const tracks = currentStream.getVideoTracks();
        const hasLiveTrack = tracks.length > 0 && tracks[0].readyState === 'live' && tracks[0].enabled;
        const trackMuted = tracks.length > 0 ? (tracks[0] as any).muted : false;
        
        console.log('🆕 [ADMIN] Track status:', {
          trackCount: tracks.length,
          trackState: tracks[0]?.readyState,
          trackEnabled: tracks[0]?.enabled,
          trackMuted: trackMuted,
          hasLiveTrack
        });
        
        if (hasLiveTrack) {
          if (trackMuted) {
            console.warn(`⚠️ [ADMIN] Track is MUTED! This will prevent frames from being sent to ${clientId}`);
            console.warn(`⚠️ [ADMIN] Check browser/system settings - track might be muted at source`);
          }
          console.log(`✅ [ADMIN] Stream ready for ${clientId}, creating offer...`);
          console.log(`✅ [ADMIN] Calling createAndSendOffer(${clientId}) in 100ms...`);
          setTimeout(() => {
            console.log(`✅ [ADMIN] Now calling createAndSendOffer(${clientId})...`);
            createAndSendOffer(clientId);
          }, 100);
        } else {
          console.log(`⏳ [ADMIN] Queued viewer ${clientId} - stream track not live yet (state: ${tracks[0]?.readyState}, enabled: ${tracks[0]?.enabled})`);
          pendingViewersRef.current.add(clientId);
        }
      } else {
        console.log(`⏳ [ADMIN] Queued viewer ${clientId} - waiting for stream (hasStream: ${hasStream}, isBroadcasting: ${isBroadcasting})`);
        console.log(`⏳ [ADMIN] Stream details:`, {
          hasStream: !!currentStream,
          streamTracks: currentStream?.getVideoTracks().length || 0,
          isBroadcasting,
          isStreaming
        });
        pendingViewersRef.current.add(clientId);
      }
    };

    const handleAnswer = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const clientId = detail.from;
      console.log('[LOG] handleAnswer called for clientId:', clientId);
      const pc = peerConnectionsRef.current.get(clientId);
      if (pc) {
        console.log(`[LOG] Received answer from ${clientId}`);
        pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: detail.sdp }))
          .catch(err => console.error('Error setting remote description:', err));
      }
    };

    const handleIceCandidate = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const clientId = detail.from;
      console.log('[LOG] handleIceCandidate called for clientId:', clientId);
      const pc = peerConnectionsRef.current.get(clientId);
      if (pc && detail.candidate) {
        console.log(`[LOG] Received ICE candidate from ${clientId}`);
        pc.addIceCandidate(new RTCIceCandidate(detail.candidate))
          .catch(err => console.error('Error adding ICE candidate:', err));
      }
    };

    const handleViewerLeft = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const clientId = detail.from;
      console.log(`👋 Viewer left: ${clientId}`);
      const pc = peerConnectionsRef.current.get(clientId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(clientId);
        console.log(`🔌 Peer connection closed for left viewer: ${clientId}`);
      }
    };

    window.addEventListener('webrtc_answer_received', handleAnswer);
    window.addEventListener('webrtc_ice_candidate_received', handleIceCandidate);
    window.addEventListener('webrtc_new_viewer', handleNewViewer);
    window.addEventListener('webrtc_viewer_left', handleViewerLeft);

    // ✅ CRITICAL: DO NOT cleanup event listeners - they must persist forever
    // The context is at app level and should never unmount
    // Removing cleanup ensures stream continues even during navigation
    // return () => { ... } - REMOVED for persistence
  }, [isBroadcasting, createAndSendOffer]);

  // ✅ FIX: Process queued viewers when stream is ready
  useEffect(() => {
    if (!isBroadcasting || !isStreaming) {
      return;
    }

    const currentStream = streamRef.current;
    const videoTracks = currentStream?.getVideoTracks() || [];
    const hasLiveTrack = videoTracks.length > 0 && 
                         videoTracks[0].readyState === 'live' &&
                         videoTracks[0].enabled;
    
    if (hasLiveTrack && pendingViewersRef.current.size > 0) {
      // Process all pending viewers
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📋 Processing ${pendingViewersRef.current.size} queued viewers...`);
      console.log('📋 Stream ready:', {
        hasStream: !!currentStream,
        videoTracks: videoTracks.length,
        trackState: videoTracks[0]?.readyState,
        trackEnabled: videoTracks[0]?.enabled
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const pending = Array.from(pendingViewersRef.current);
      pendingViewersRef.current.clear();
      
      // Create offers for all queued viewers with staggered timing
      pending.forEach((clientId, index) => {
        setTimeout(() => {
          // Double-check stream is still ready
          const stream = streamRef.current;
          if (!stream) {
            console.warn(`⚠️ Stream lost for queued viewer ${clientId}, re-queuing...`);
            pendingViewersRef.current.add(clientId);
            return;
          }

          const tracks = stream.getVideoTracks();
          if (tracks.length === 0) {
            console.warn(`⚠️ Stream has no tracks for queued viewer ${clientId}, re-queuing...`);
            pendingViewersRef.current.add(clientId);
            return;
          }

          const track = tracks[0];
          if (track.readyState !== 'live' || !track.enabled) {
            console.warn(`⚠️ Stream track not live for queued viewer ${clientId}, re-queuing...`);
            pendingViewersRef.current.add(clientId);
            return;
          }

          console.log(`📹 Creating offer for queued viewer ${clientId}`);
          createAndSendOffer(clientId);
        }, 100 * (index + 1)); // Stagger to avoid overwhelming
      });
    }
  }, [isBroadcasting, isStreaming, createAndSendOffer]); // ✅ Add isStreaming to dependencies

  const pauseStream = useCallback(() => {
    // Implement pause logic if needed
    setIsPaused(true);
  }, []);

  const resumeStream = useCallback(() => {
    // Implement resume logic if needed
    setIsPaused(false);
  }, []);

  const value = {
    isStreaming,
    isPaused,
    isInitializing,
    isCropReady,
    error,
    startWebRTCScreenShare,
    stopWebRTCScreenShare,
    pauseStream,
    resumeStream,
    screenStream,
    originalStream,
    croppedStream,
    cropSettings,
    setCropSettings,
    confirmCropAndStart,
    skipCropAndStart,
    getVideoRef: () => videoRef.current,
    getCanvasRef: () => canvasRef.current,
  };

  return <AdminStreamContext.Provider value={value}>{children}</AdminStreamContext.Provider>;
};

