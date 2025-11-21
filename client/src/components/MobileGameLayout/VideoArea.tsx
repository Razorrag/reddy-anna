/**
 * VideoArea - Enhanced video stream area with circular countdown timer overlay
 *
 * Features:
 * - Embedded iFrame video stream (runs independently)
 * - Circular countdown timer with yellow stroke
 * - Round number display
 * - Pulse effect when <5 seconds
 * - Phase-specific colors (betting/dealing)
 * - Smooth timer animations
 * - Video stream never interrupted by game state or operations
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useGameState } from '@/contexts/GameStateContext';
import Hls from 'hls.js';

interface VideoAreaProps {
  className?: string;
  isScreenSharing?: boolean; // No longer used, kept for backward compatibility
}

const VideoArea: React.FC<VideoAreaProps> = React.memo(({ className = '' }) => {
  const { gameState } = useGameState();

  // ✅ FIX: Use the gameState.countdownTimer directly (synced from server)
  // This ensures the timer is always in sync with the server
  const localTimer = gameState.countdownTimer || 0;
  const [isPulsing, setIsPulsing] = useState(false);

  // Stream configuration from backend
  const [streamConfig, setStreamConfig] = useState<any>(null);
  const [streamLoading, setStreamLoading] = useState(true);

  // Displayed viewer count - always fake based on configured range
  const [displayedViewerCount, setDisplayedViewerCount] = useState<number>(0);

  // Refs for direct stream control
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Canvas ref for capturing frozen frame when paused
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);
  const [isPausedState, setIsPausedState] = useState(false);

  // ✅ FIX: Track if we're waiting for video to load during paused state
  const [waitingForVideoOnPause, setWaitingForVideoOnPause] = useState(false);

  // ✅ Loading and buffering states for better UX
  const [isBuffering, setIsBuffering] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  // ✅ Debounce buffering popup to prevent flashing
  const bufferingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🛠️ Debug Overlay State
  const [showDebug, setShowDebug] = useState(false);
  const [debugStats, setDebugStats] = useState({ latency: 0, buffer: 0, dropped: 0, bandwidth: 0 });
  const debugClickCount = useRef(0);
  const debugTimer = useRef<NodeJS.Timeout | null>(null);

  // ✅ Helper: Show buffering with delay to prevent flashing
  const showBuffering = useCallback(() => {
    // Clear any existing timeout
    if (bufferingTimeoutRef.current) {
      clearTimeout(bufferingTimeoutRef.current);
    }

    // Show buffering popup after 800ms (balanced UX)
    bufferingTimeoutRef.current = setTimeout(() => {
      setIsBuffering(true);
    }, 800); // ✅ OPTIMIZED: 800ms for better user feedback
  }, []);

  // ✅ Helper: Hide buffering immediately
  const hideBuffering = useCallback(() => {
    // Clear timeout if buffering resolves quickly
    if (bufferingTimeoutRef.current) {
      clearTimeout(bufferingTimeoutRef.current);
      bufferingTimeoutRef.current = null;
    }
    setIsBuffering(false);
  }, []);

  // ✅ CRITICAL FIX: Move loadStreamConfig to component scope so it can be reused
  const loadStreamConfig = useCallback(async () => {
    try {
      console.log('🔍 VideoArea: Fetching stream config from /api/stream/simple-config...');
      const response = await fetch('/api/stream/simple-config');
      const data = await response.json();
      console.log('🔍 VideoArea: API Response:', data);

      if (data.success && data.data) {
        // ✅ Fix mixed content: Match protocol to avoid blocking
        let streamUrl = data.data.streamUrl;
        if (streamUrl) {
          // ✅ Convert Google Drive URLs to embed format
          if (streamUrl.includes('drive.google.com')) {
            console.log('🔍 Detected Google Drive URL, converting to embed format...');

            let fileId = null;

            // Extract file ID from /file/d/FILE_ID/ format
            const fileMatch = streamUrl.match(/\/file\/d\/([^\/]+)/);
            if (fileMatch) {
              fileId = fileMatch[1];
            }

            // Extract file ID from ?id=FILE_ID format
            const idMatch = streamUrl.match(/[?&]id=([^&]+)/);
            if (idMatch) {
              fileId = idMatch[1];
            }

            if (fileId) {
              streamUrl = `https://drive.google.com/file/d/${fileId}/preview`;
              console.log('✅ Converted Google Drive URL to:', streamUrl);
            } else {
              console.warn('⚠️ Could not extract Google Drive file ID from URL');
            }
          }

          const currentProtocol = window.location.protocol; // 'http:' or 'https:'

          // ✅ CRITICAL: If site is HTTP, downgrade HTTPS URLs to HTTP to avoid blocking    
          if (currentProtocol === 'http:' && streamUrl.startsWith('https://')) {
            console.log('⚠️ Site is HTTP but stream URL is HTTPS, downgrading to HTTP...');
            streamUrl = streamUrl.replace('https://', 'http://');
            console.log('🔄 Downgraded stream URL to:', streamUrl);
          }
          // If site is HTTPS but stream URL is HTTP, try to upgrade to HTTPS
          // ❌ EXCEPTION: Do NOT upgrade IP addresses (they usually don't have SSL)
          else if (currentProtocol === 'https:' && streamUrl.startsWith('http://')) {
            const isIpAddress = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(new URL(streamUrl).hostname);

            if (!isIpAddress) {
              console.log('⚠️ Site is HTTPS but stream URL is HTTP, attempting to upgrade...');
              streamUrl = streamUrl.replace('http://', 'https://');
              console.log('🔄 Upgraded stream URL to:', streamUrl);
            } else {
              console.warn('⚠️ Mixed Content Warning: Site is HTTPS but stream is HTTP (IP adddress). Browser may block this.');
              console.log('ℹ️ Skipping HTTPS upgrade for IP address:', streamUrl);
            }
          }
        }

        const config = {
          ...data.data,
          streamUrl: streamUrl
        };
        setStreamConfig(config);
        setIsPausedState(config.isPaused || false);

        console.log('🎥 VideoArea: Stream config loaded:', {
          streamUrl: streamUrl,
          streamType: data.data.streamType,
          isActive: data.data.isActive,
          isPaused: config.isPaused,
          muted: config.muted,
          hasUrl: !!streamUrl
        });

        // Debug: Check why stream might not show
        if (!data.data.isActive) {
          console.warn('⚠️ Stream is NOT ACTIVE! Toggle "Stream Active" in admin settings.');
        }
        if (!streamUrl) {
          console.warn('⚠️ Stream URL is EMPTY! Enter a URL in admin settings.');
        }
      } else {
        console.warn('⚠️ No stream config data received');
      }
    } catch (error) {
      console.error('❌ Failed to load stream config:', error);
    } finally {
      setStreamLoading(false);
    }
  }, []);

  // ✅ CRITICAL FIX: Load stream config on mount (every page load/refresh)
  useEffect(() => {
    console.log('🔄 VideoArea mounted - loading stream config...');
    loadStreamConfig();

    // ✅ FIX #1: Handle page visibility changes to keep stream at live edge
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📴 Page hidden - stream will continue buffering');
      } else {
        console.log('👁️ Page visible again - checking stream position...');

        // If HLS stream is playing, jump to live edge if we've drifted
        const videoElement = videoRef.current;
        const hls = hlsRef.current;

        if (videoElement && hls && hls.liveSyncPosition) {
          const currentLatency = hls.liveSyncPosition - videoElement.currentTime;

          // 🔧 CRITICAL FIX: Only seek if NOT paused AND >3s behind
          if (!isPausedState && currentLatency > 3 && isFinite(hls.liveSyncPosition)) {
            console.log(`⚡ Visibility: ${currentLatency.toFixed(2)}s behind, seeking to live...`);
            videoElement.currentTime = hls.liveSyncPosition;
          } else if (currentLatency > 0) {
            console.log(`✅ Visibility: ${currentLatency.toFixed(2)}s behind (within acceptable range)`);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadStreamConfig, isPausedState]);

  // Fake viewer count logic - ALWAYS uses a range (configured if available, otherwise defaults)
  useEffect(() => {
    const updateDisplayedCount = () => {
      // Use configured fake viewer range if available; otherwise fall back to defaults      
      let minViewers = streamConfig?.minViewers;
      let maxViewers = streamConfig?.maxViewers;

      if (typeof minViewers !== 'number' || minViewers <= 0) {
        minViewers = 1000;
      }
      if (typeof maxViewers !== 'number' || maxViewers < minViewers) {
        maxViewers = 1100;
      }

      const fakeCount = Math.floor(Math.random() * (maxViewers - minViewers + 1)) + minViewers;
      setDisplayedViewerCount(fakeCount);
      console.log(`👥 Displaying fake viewer count: ${fakeCount} (range: ${minViewers}-${maxViewers})`);
    };

    // Update immediately
    updateDisplayedCount();

    // Update every 2 seconds for fake count variation
    const interval = setInterval(updateDisplayedCount, 2000);
    return () => clearInterval(interval);
  }, [streamConfig?.minViewers, streamConfig?.maxViewers]);

  // ✅ FIX #3: Unified stream status handler - eliminates race condition
  useEffect(() => {
    const handleStreamStatusUpdate = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { isPaused: newPauseState } = customEvent.detail || {};

      console.log('⚡ [WS] Stream status update received!', { newPauseState });

      // ✅ CRITICAL: Update pause state immediately (sync)
      if (typeof newPauseState === 'boolean') {
        console.log(`🎬 Setting pause state to: ${newPauseState}`);
        setIsPausedState(newPauseState);
      }

      // ✅ Then refetch full config in background (async) for other settings
      // This ensures pause state updates instantly without waiting for API
      loadStreamConfig();
    };

    window.addEventListener('stream_status_updated', handleStreamStatusUpdate);

    return () => {
      window.removeEventListener('stream_status_updated', handleStreamStatusUpdate);
    };
  }, [loadStreamConfig]);

  // ✅ SIMPLIFIED: Only cleanup on unmount - no auto-resume on visibility
  // HLS.js handles stream continuity automatically
  useEffect(() => {
    return () => {
      // Cleanup buffering timeout on unmount
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
      }
    };
  }, []);

  // ✅ HLS.js Setup with Ultra-Low Latency (runs on every mount/refresh)
  useEffect(() => {
    const videoElement = videoRef.current;
    const streamUrl = streamConfig?.streamUrl;

    console.log('🎬 HLS Setup Effect - streamUrl:', streamUrl);

    if (!videoElement || !streamUrl) {
      if (!streamUrl) console.log('⚠️ No stream URL yet - waiting...');
      return;
    }

    // Check if URL is HLS (.m3u8)
    if (streamUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        console.log('🎥 Setting up HLS.js with ULTRA-LOW LATENCY config...');

        // Destroy existing HLS instance
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }

        // Create HLS instance - ROCK SOLID: Maximum stability, zero stuttering
        const hls = new Hls({
          // 🎯 ROCK SOLID SETTINGS: Prioritize smooth playback over latency
          // Maximum buffer and tolerance for perfect stability

          // Core latency settings - maximum stability
          liveSyncDurationCount: 4,           // Stay 4 segments (4s) behind live - very stable
          liveMaxLatencyDurationCount: 10,    // Max 10s drift before seeking - huge tolerance
          liveDurationInfinity: true,         // Treat as infinite live stream

          // Buffer settings - MAXIMUM for zero stuttering
          maxBufferLength: 20,                // 20s forward buffer - eliminates all stuttering
          maxMaxBufferLength: 30,             // Hard limit 30s - massive safety margin
          maxBufferSize: 120 * 1000 * 1000,   // 120MB - huge headroom
          maxBufferHole: 1.0,                 // Skip gaps up to 1s

          // Very gentle catch-up - smooth as silk
          maxLiveSyncPlaybackRate: 1.02,      // Only 2% speed-up - completely unnoticeable

          // Monitoring optimized for maximum stability
          highBufferWatchdogPeriod: 3,        // Check buffer every 3s - less aggressive
          nudgeMaxRetry: 2,                   // Minimal retries - let buffer handle it
          nudgeOffset: 0.2,                   // Larger nudge - smoother adjustments

          // Performance optimization
          enableWorker: true,
          lowLatencyMode: false,              // Disabled for maximum stability
          backBufferLength: 15,               // 15s back buffer for seeking

          // Network resilience - ULTRA generous timeouts
          manifestLoadingTimeOut: 20000,      // 20s timeout
          manifestLoadingMaxRetry: 10,        // Maximum retries for bulletproof reliability
          levelLoadingTimeOut: 20000,
          fragLoadingTimeOut: 30000,          // 30s timeout - ultra tolerant
          fragLoadingMaxRetry: 10,            // Maximum retries
          fragLoadingRetryDelay: 2000,        // 2s retry delay - patient

          // Quality selection
          startLevel: -1,                     // Auto quality selection
          abrEwmaDefaultEstimate: 2500000,    // Higher estimate for better quality

          // Additional stability settings
          abrBandWidthFactor: 0.8,            // Conservative bandwidth usage
          abrBandWidthUpFactor: 0.7,          // Slow quality increases
          capLevelToPlayerSize: false,        // Don't limit quality by player size
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(videoElement);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('✅ HLS manifest loaded, starting playback...');

          // Start playback - HLS.js will automatically position at live edge
          videoElement.play().catch(err => {
            console.error('❌ HLS initial play failed:', err);
            videoElement.muted = true;
            videoElement.play().catch(e => console.error('❌ HLS muted play failed:', e));
          });
        });

        // 🚀 OPTIMAL: Seek to live when first fragment loads (has buffer)
        hls.on(Hls.Events.FRAG_LOADED, () => {
          if (hls.liveSyncPosition && isFinite(hls.liveSyncPosition) && videoElement.currentTime === 0) {
            videoElement.currentTime = hls.liveSyncPosition;
            console.log(`📍 Initial seek to live: ${hls.liveSyncPosition.toFixed(2)}s`);
          }
        });

        // ✅ REMOVED: BUFFER_APPENDED auto-recovery - was causing stuttering
        // With 1s GOP aligned to 1s segments, no need for aggressive recovery
        // HLS.js handles buffering naturally, visibility handler manages tab switches

        // 🛠️ Debug Stats Update with latency monitoring
        const debugInterval = setInterval(() => {
          if (hls && videoElement) {
            const latency = hls.latency || 0;
            const buffer = videoElement.buffered.length > 0
              ? videoElement.buffered.end(videoElement.buffered.length - 1) - videoElement.currentTime
              : 0;

            setDebugStats({
              latency: latency,
              buffer: buffer,
              dropped: videoElement.getVideoPlaybackQuality ? videoElement.getVideoPlaybackQuality().droppedVideoFrames : 0,
              bandwidth: hls.bandwidthEstimate || 0
            });

            // Log every 5 seconds
            if (Math.floor(Date.now() / 5000) !== Math.floor((Date.now() - 500) / 5000)) {
              console.log('📊 Stream Stats:', {
                latency: `${latency.toFixed(2)}s`,
                buffer: `${buffer.toFixed(2)}s`,
                liveSyncPos: hls.liveSyncPosition?.toFixed(2),
                currentTime: videoElement.currentTime.toFixed(2)
              });
            }
          }
        }, 500);

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.error('❌ Fatal HLS error:', data);

            // Note: Don't set isPausedState on network errors
            // Only admin can pause the stream via stream settings

            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('🔄 Network error, attempting recovery...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('🔄 Media error, attempting recovery...');
                hls.recoverMediaError();
                break;
              default:
                console.log('🔄 Unrecoverable error, destroying HLS...');
                hls.destroy();
                break;
            }
          }
        });

        hlsRef.current = hls;

        return () => {
          clearInterval(debugInterval);
          // ✅ FIX #5: Improved cleanup - ensure HLS is fully destroyed
          if (hlsRef.current) {
            console.log('🧹 Cleaning up HLS instance...');
            try {
              hlsRef.current.destroy();
            } catch (error) {
              console.error('❌ Error destroying HLS:', error);
            } finally {
              hlsRef.current = null;
            }
          }
        };
      } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        console.log('🎥 Using native HLS support (Safari)...');
        videoElement.src = streamUrl;
        videoElement.play().catch(err => console.error('❌ Native HLS play failed:', err));
      }
    }
  }, [streamConfig?.streamUrl]);

  // ✅ REMOVED AGGRESSIVE HEALTH MONITOR
  // Let HLS.js handle all recovery - no manual reloads
  // This prevents constant buffering and stream interruptions

  // ✅ FIX #3: WebSocket listener now dispatches event instead of setting state directly
  // This eliminates the race condition between WebSocket and event listener
  useEffect(() => {
    const { ws } = (window as any).__wsContext || {};

    if (!ws) {
      console.warn('⚠️ WebSocket not available for pause/play synchronization');
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'stream_pause_state') {
          const { isPaused } = message.data;
          console.log(`🎬 [WS Direct] Stream ${isPaused ? 'PAUSED' : 'RESUMED'} by admin`);

          // ✅ Dispatch event instead of setting state directly
          // This ensures single source of truth via the event handler
          window.dispatchEvent(new CustomEvent('stream_status_updated', {
            detail: { isPaused, timestamp: Date.now() }
          }));
        }
      } catch (error) {
        // Ignore non-JSON messages
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, []);

  // ✅ FIX #2 & #4: Improved frame capture with retry logic for refresh scenarios
  const captureCurrentFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      console.warn('⚠️ Video or canvas ref not available');
      return false;
    }

    // For HLS streams, readyState >= 2 is sufficient (HAVE_CURRENT_DATA)
    // For m3u8, we want to capture even if not fully loaded
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      const ctx = canvas.getContext('2d', { willReadFrequently: false });
      if (ctx) {
        // Use actual video dimensions for best quality
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        try {
          // Draw current frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convert to JPEG with high quality
          const frameData = canvas.toDataURL('image/jpeg', 0.95);
          setFrozenFrame(frameData);
          setWaitingForVideoOnPause(false);

          console.log(`📸 Captured HLS frame: ${canvas.width}x${canvas.height}, readyState: ${video.readyState}`);
          return true;
        } catch (error) {
          console.error('❌ Frame capture failed:', error);
          return false;
        }
      }
    } else {
      console.warn(`⚠️ Video not ready for capture - readyState: ${video.readyState}`);
      return false;
    }
  }, []);

  // ✅ FIX #2: Retry frame capture when video becomes ready (for refresh during pause)
  useEffect(() => {
    if (waitingForVideoOnPause && isPausedState) {
      const video = videoRef.current;

      if (!video) return;

      const handleCanPlay = () => {
        console.log('✅ Video ready during pause - capturing frame now');
        const success = captureCurrentFrame();
        if (success) {
          video.pause();
        }
      };

      // Try to capture when video is ready
      if (video.readyState >= 2) {
        handleCanPlay();
      } else {
        video.addEventListener('canplay', handleCanPlay, { once: true });

        // Fallback: try again after 1 second
        const timeout = setTimeout(() => {
          if (video.readyState >= 2) {
            captureCurrentFrame();
            video.pause();
          }
        }, 1000);

        return () => {
          video.removeEventListener('canplay', handleCanPlay);
          clearTimeout(timeout);
        };
      }
    }
  }, [waitingForVideoOnPause, isPausedState, captureCurrentFrame]);

  // ✅ FIX #2: Handle pause/resume with proper refresh support
  useEffect(() => {
    const videoElement = videoRef.current;
    const iframeElement = iframeRef.current;

    if (isPausedState) {
      // PAUSE: Capture frame FIRST, pause video immediately, keep buffer
      if (videoElement && streamConfig?.streamUrl?.includes('.m3u8')) {
        // ✅ Capture frame first
        const captured = captureCurrentFrame();

        if (!captured) {
          // Video not ready yet (e.g., page refresh during pause)
          console.log('⏳ Video not ready for capture - will wait for it to load');
          setWaitingForVideoOnPause(true);
          return;
        }

        // ✅ CRITICAL: Pause video IMMEDIATELY to show frozen frame
        videoElement.pause();

        // Then stop loading (but keep buffer intact)
        if (hlsRef.current) {
          console.log('🛑 Pausing stream (buffer preserved for instant resume)...');
          hlsRef.current.stopLoad();
        }

        console.log('✅ Stream paused with frozen frame');
      } else if (videoElement) {
        // For non-HLS streams (iframe, etc.)
        const captured = captureCurrentFrame();
        if (captured) {
          videoElement.pause();
        }
      }
    } else {
      // 🎯 INSTANT RESUME: Ultra-fast resume with pre-loaded buffer
      if (videoElement && hlsRef.current && streamConfig?.streamUrl?.includes('.m3u8')) {
        console.log('▶️ Resuming stream from live edge...');

        const hls = hlsRef.current;

        // Clear frozen frame first
        setFrozenFrame(null);

        // Resume loading from live edge
        hls.startLoad(-1);

        // Small delay to let buffer fill a bit (prevents initial stutter)
        setTimeout(() => {
          // Seek to live position for instant catch-up
          if (hls.liveSyncPosition && isFinite(hls.liveSyncPosition)) {
            videoElement.currentTime = hls.liveSyncPosition;
            console.log(`📍 Jumped to live: ${hls.liveSyncPosition.toFixed(2)}s`);
          }

          // Play video
          videoElement.play().catch(err => {
            console.error('❌ Resume play failed:', err);
            videoElement.muted = true;
            videoElement.play().catch(e => console.error('❌ Muted play failed:', e));
          });

          console.log('✅ Stream resumed to live edge');
        }, 100); // 100ms delay for buffer
      }

      // Handle iframe resume
      if (iframeElement && streamConfig?.streamUrl && !streamConfig.streamUrl.includes('.m3u8')) {
        setFrozenFrame(null);
        iframeElement.src = iframeElement.src; // Refresh iframe
      }
    }
  }, [isPausedState, streamConfig?.streamUrl]);

  // Handle pulse effect when less than 5 seconds
  useEffect(() => {
    if (localTimer <= 5 && localTimer > 0) {
      setIsPulsing(true);
    } else {
      setIsPulsing(false);
    }
  }, [localTimer]);

  // Get timer color based on phase
  const getTimerColor = () => {
    switch (gameState.phase) {
      case 'betting':
        return localTimer <= 5 ? '#EF4444' : '#FFD100'; // Red when urgent, yellow normally  
      case 'dealing':
        return '#10B981'; // Green for dealing
      case 'complete':
        return '#8B5CF6'; // Purple for complete
      default:
        return '#6B7280'; // Gray for idle
    }
  };

  // Calculate timer progress for circular display
  const getTimerProgress = () => {
    if (gameState.phase !== 'betting') return 0;
    const maxTime = 30; // 30 seconds for betting
    return Math.max(0, (maxTime - localTimer) / maxTime);
  };

  // Auto-detect stream type based on URL
  const url = streamConfig?.streamUrl?.toLowerCase() || '';
  const isVideoFile = url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg') || url.endsWith('.m3u8');
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  const shouldUseVideo = streamConfig?.streamType === 'video' || (isVideoFile && !isYouTube);

  // Render video based on stream type
  const renderStream = () => {
    if (streamLoading) {
      console.log('🔄 VideoArea: Still loading stream config...');
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
            <p className="text-gray-400">Loading stream...</p>
          </div>
        </div>
      );
    }

    if (!streamConfig || !streamConfig.isActive || !streamConfig.streamUrl) {
      console.log('❌ VideoArea: Stream NOT showing because:', {
        hasConfig: !!streamConfig,
        isActive: streamConfig?.isActive,
        hasUrl: !!streamConfig?.streamUrl,
        streamConfig
      });
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
          <div className="text-center px-6">
            <div className="text-6xl mb-4">🎥</div>
            <p className="text-gray-400 text-lg">Stream not configured</p>
            <p className="text-gray-600 text-sm mt-2">
              {!streamConfig && 'No config loaded'}
              {streamConfig && !streamConfig.isActive && 'Stream is not active - Toggle ON in admin settings'}
              {streamConfig && streamConfig.isActive && !streamConfig.streamUrl && 'Stream URL is empty'}
            </p>
          </div>
        </div>
      );
    }

    if (shouldUseVideo) {
      console.log('✅ VideoArea: Rendering VIDEO stream:', streamConfig.streamUrl);

      return (
        <video
          ref={videoRef}
          src={streamConfig.streamUrl}
          className="w-full h-full object-cover"
          autoPlay
          muted={true}
          controls={false}
          loop
          playsInline
          preload="auto"
          // ✅ LOW LATENCY: Minimize buffering for HLS streams
          x-webkit-airplay="allow"
          webkit-playsinline="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1
          }}
          onWaiting={() => {
            console.log('⏳ Video buffering...');
            // Don't show buffering overlay - let large buffer handle it silently
          }}
          onPlaying={() => {
            console.log('▶️ Video playing');
            hideBuffering(); // Clear any buffering state
            setStreamError(null);
          }}
          onCanPlay={() => {
            hideBuffering(); // Clear any buffering state
          }}
          onPause={() => {
            // Let HLS.js handle buffering pauses - don't force play
            if (!isPausedState) {
              console.log('⏸️ Video paused (buffering or network)');
            }
          }}
          onStalled={() => {
            // Let large buffer handle stalls silently - no popup needed
            console.log('⚠️ Video stalled (buffering) - large buffer will handle');
          }}
          onSuspend={() => {
            // Normal browser behavior - don't interfere
            console.log('⚠️ Video suspended by browser');
          }}
          onError={(e) => {
            console.error('❌ Video error:', e);
            // Don't show error overlay - let HLS.js auto-recovery handle it
            // Large buffer and retries will handle temporary issues
          }}
          onLoadedData={() => {
            console.log('✅ Video loaded');
            // Don't auto-play here - let HLS.js handle it
          }}
        />
      );
    } else {
      // Use iframe for everything else (YouTube, custom players, RTMP players, etc.)        
      console.log('✅ VideoArea: Rendering IFRAME stream:', streamConfig.streamUrl);
      return (
        <iframe
          ref={iframeRef}
          src={streamConfig.streamUrl}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture; accelerometer; clipboard-write; encrypted-media; gyroscope"
          allowFullScreen
          // ✅ Allow mixed content and cross-origin
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
          referrerPolicy="no-referrer-when-downgrade"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            zIndex: 1
          }}
          title="Live Game Stream"
          onLoad={() => {
            console.log('✅ Iframe loaded successfully');
          }}
          onError={(e) => {
            console.error('❌ Iframe error:', e);
          }}
        />
      );
    }
  };

  // Determine if stream is live
  const isLive = !!(streamConfig?.isActive && streamConfig?.streamUrl);

  console.log('🎥 VideoArea render state:', {
    isLive,
    streamConfigExists: !!streamConfig,
    isActive: streamConfig?.isActive,
    hasUrl: !!streamConfig?.streamUrl,
    phase: gameState.phase
  });

  return (
    <div className={`relative bg-black overflow-hidden ${className}`}>
      {/* Hidden canvas for capturing frozen frame when paused */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ✅ REMOVED: No overlay text for players - they just see frozen frame
          Admin sees pause status in admin-bets page instead */}
      {(isPausedState) && frozenFrame && (
        <div className="absolute inset-0 z-20">
          <img
            src={frozenFrame}
            alt="Stream paused"
            className="w-full h-full object-cover"
          />
          {/* No "Stream Paused" text overlay - clean experience for players */}
        </div>
      )}

      {/* ✅ Buffering Overlay - Show when stream is loading (but not if we have frozen frame) */}
      {isBuffering && !isPausedState && !frozenFrame && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-black/80 backdrop-blur-sm px-6 py-4 rounded-xl flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold"></div>
            <span className="text-white text-sm font-medium">Loading stream...</span>
          </div>
        </div>
      )}

      {/* ✅ Error Overlay - Show when stream has error */}
      {streamError && !isPausedState && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-red-900/80 backdrop-blur-sm px-6 py-4 rounded-xl flex flex-col items-center gap-3 max-w-xs">
            <div className="text-4xl">⚠️</div>
            <span className="text-white text-sm font-medium text-center">{streamError}</span>
            <span className="text-gray-300 text-xs text-center">Reconnecting automatically...</span>
          </div>
        </div>
      )}

      {/* Embedded Video Stream - Runs independently in background, never interrupted */}
      <div className="absolute inset-0">
        {renderStream()}

        {/* Mute button removed as per user request */}

        {/* Overlay Gradient for better text visibility (no paused popup) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" style={{ zIndex: 2 }} />
      </div>

      {/* LIVE Badge - Top Left */}
      {isLive && (
        <div className="absolute top-3 left-3 z-40">
          <div className="flex items-center gap-2 bg-red-600/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white font-bold text-xs uppercase tracking-wider">LIVE</span>
          </div>
        </div>
      )}

      {/* Viewer Count - Top Right - Show when stream is live */}
      {isLive && (
        <div className="absolute top-3 right-3 z-40">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="text-red-400 text-[10px]">👁</span>
            <span className="text-white text-xs font-medium">
              {displayedViewerCount > 0 ? displayedViewerCount.toLocaleString() : '—'}
            </span>
          </div>
        </div>
      )}

      {/* 🛠️ Debug Overlay (Hidden by default) */}
      {showDebug && (
        <div className="absolute top-12 left-3 z-50 bg-black/80 text-green-400 p-2 rounded text-xs font-mono pointer-events-none">
          <div>Latency: {debugStats.latency.toFixed(2)}s</div>
          <div>Buffer: {debugStats.buffer.toFixed(2)}s</div>
          <div>Dropped: {debugStats.dropped}</div>
          <div>BW: {(debugStats.bandwidth / 1000 / 1000).toFixed(2)} Mbps</div>
        </div>
      )}

      {/* Invisible Click Area for Debug Toggle (Top Left) */}
      <div
        className="absolute top-0 left-0 w-20 h-20 z-50 cursor-default"
        onClick={() => {
          debugClickCount.current += 1;
          if (debugTimer.current) clearTimeout(debugTimer.current);
          debugTimer.current = setTimeout(() => { debugClickCount.current = 0; }, 1000);

          if (debugClickCount.current >= 5) {
            setShowDebug(prev => !prev);
            debugClickCount.current = 0;
          }
        }}
      />

      {/* Circular Timer Overlay - CENTERED - ONLY VISIBLE DURING BETTING */}
      {gameState.phase === 'betting' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div className={`relative transition-all duration-300 ${gameState.phase === 'betting' && isPulsing ? 'animate-pulse scale-110' : 'scale-100'
            }`}>
            {/* Large Circular Timer */}
            <div className="relative w-36 h-36 md:w-40 md:h-40 flex items-center justify-center">
              <svg
                className="transform -rotate-90 w-full h-full absolute inset-0"
                viewBox="0 0 128 128"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Background circle - Dark grey with transparency */}
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="rgba(75, 85, 99, 0.8)"
                  strokeWidth="10"
                  fill="rgba(31, 41, 55, 0.9)"
                  className="transition-all duration-300"
                />
                {/* Progress circle - Yellow arc, only show during betting */}
                {gameState.phase === 'betting' && localTimer > 0 && (
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke={getTimerColor()}
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - getTimerProgress())}`}
                    className="transition-all duration-1000 ease-linear"
                    strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 0 4px rgba(255, 209, 0, 0.5))' }}
                  />
                )}
              </svg>
              {/* Timer text and icon container */}
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                {/* Icon above number - Screen/Monitor icon */}
                <div className="mb-0.5 opacity-90">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-cyan-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <rect x="2" y="4" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                {/* Timer number */}
                <div className="text-white font-bold text-5xl md:text-6xl tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none">
                  {localTimer > 0 ? localTimer : '--'}
                </div>
                {/* Betting Time text */}
                <div className="text-gold text-sm md:text-base font-semibold mt-1.5 tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  Betting Time
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if isScreenSharing changes or className changes
  return (
    prevProps.isScreenSharing === nextProps.isScreenSharing &&
    prevProps.className === nextProps.className
  );
});

VideoArea.displayName = 'VideoArea';

export default VideoArea;