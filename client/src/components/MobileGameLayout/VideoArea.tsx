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
  
  // ✅ Loading and buffering states for better UX
  const [isBuffering, setIsBuffering] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  
  // ✅ Prevent flicker: Keep previous frame visible during reload
  const [isReloading, setIsReloading] = useState(false);

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
          else if (currentProtocol === 'https:' && streamUrl.startsWith('http://')) {
            console.log('⚠️ Site is HTTPS but stream URL is HTTP, attempting to upgrade...');
            streamUrl = streamUrl.replace('http://', 'https://');
            console.log('🔄 Upgraded stream URL to:', streamUrl);
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

  // ✅ FIX: Load stream configuration on mount
  useEffect(() => {
    loadStreamConfig();
  }, [loadStreamConfig]);


  // ✅ NEW: Add 1-second polling fallback for instant pause/play updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadStreamConfig();
    }, 1000); // Poll every 1 second
    
    return () => clearInterval(interval);
  }, [loadStreamConfig]);

  // ✅ CRITICAL FIX: Listen for WebSocket stream status updates for instant pause/play
  useEffect(() => {
    const handleStreamStatusUpdate = () => {
      console.log('⚡ [WS] Stream status update received! Refetching config immediately...');
      loadStreamConfig();
    };

    window.addEventListener('stream_status_updated', handleStreamStatusUpdate);

    return () => {
      window.removeEventListener('stream_status_updated', handleStreamStatusUpdate);
    };
  }, [loadStreamConfig]);

  // ✅ AUTO-RESUME: Page Visibility API - Auto-resume stream when user returns to app
  // ✅ FIX: Check isPausedState to prevent auto-resume when admin has paused
  useEffect(() => {
    const handleVisibilityChange = () => {
      // ✅ CRITICAL FIX: Only auto-resume if NOT paused by admin
      if (!document.hidden && streamConfig?.streamUrl && !isPausedState) {
        console.log('👁️ Page visible again - auto-resuming stream...');
        
        // For VIDEO elements - auto-resume playback
        const videoElement = videoRef.current;
        if (videoElement) {
          console.log('🎥 Auto-resuming video playback...');
          videoElement.play().catch(err => {
            console.log('⚠️ Video play failed, retrying...', err);
            // Retry after short delay
            setTimeout(() => {
              videoElement.play().catch(e => console.error('❌ Video play retry failed:', e));
            }, 500);
          });
        }
        
        // For IFRAME elements - force reload to resume
        const iframeElement = iframeRef.current;
        if (iframeElement && iframeElement.src) {
          console.log('🎬 Reloading iframe to resume stream...');
          const currentSrc = iframeElement.src;
          iframeElement.src = ''; // Clear
          setTimeout(() => {
            iframeElement.src = currentSrc; // Reload
            console.log('✅ Iframe reloaded successfully');
          }, 100);
        }
      } else if (!document.hidden && isPausedState) {
        console.log('⏸️ Page visible but stream is paused by admin - not auto-resuming');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [streamConfig?.streamUrl, isPausedState]);

  // ✅ HLS.js SETUP: Low-latency configuration for .m3u8 streams
  useEffect(() => {
    const videoElement = videoRef.current;
    const streamUrl = streamConfig?.streamUrl;
    
    if (!videoElement || !streamUrl || isPausedState) return;
    
    // Check if URL is HLS (.m3u8)
    if (streamUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        console.log('🎥 Setting up HLS.js with LOW LATENCY config...');
        
        // Destroy existing HLS instance
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
        
        // Create HLS instance with low-latency settings
        const hls = new Hls({
          // ✅ LOW LATENCY SETTINGS
          liveSyncDurationCount: 1,        // Only buffer 1 segment (reduces latency)
          liveMaxLatencyDurationCount: 3,  // Max 3 segments behind live edge
          maxBufferLength: 3,              // Keep only 3 seconds buffered
          maxMaxBufferLength: 6,           // Never exceed 6 seconds buffer
          maxBufferSize: 10 * 1000 * 1000, // 10MB max buffer
          maxBufferHole: 0.1,              // Tolerate tiny gaps
          highBufferWatchdogPeriod: 1,     // Check buffer health every 1s
          nudgeMaxRetry: 3,                // Retry stalls quickly
          enableWorker: true,              // Use web worker for better performance
          lowLatencyMode: true,            // Enable LL-HLS if available
          backBufferLength: 0,             // Don't keep old segments
        });
        
        hls.loadSource(streamUrl);
        hls.attachMedia(videoElement);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('✅ HLS manifest loaded, starting LOW LATENCY playback...');
          videoElement.play().catch(err => console.error('❌ HLS play failed:', err));
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error('❌ Fatal HLS error:', data);
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
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
        };
      } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        console.log('🎥 Using native HLS support (Safari)...');
        videoElement.src = streamUrl;
        videoElement.play().catch(err => console.error('❌ Native HLS play failed:', err));
      }
    }
  }, [streamConfig?.streamUrl, isPausedState]);

  // ✅ AGGRESSIVE STREAM HEALTH MONITOR: Auto-recovery every 500ms
  useEffect(() => {
    const monitorStream = setInterval(() => {
      if (document.hidden) return;
      
      const videoElement = videoRef.current;
      if (videoElement && streamConfig?.streamUrl && !isPausedState) {
        // Auto-resume if paused unexpectedly
        if (videoElement.paused && videoElement.readyState >= 2) {
          console.log('🔄 Auto-resuming paused video...');
          videoElement.play().catch(err => console.error('❌ Auto-resume failed:', err));
        }
        
        // Reload if failed or stalled (only for non-HLS streams)
        if (!streamConfig.streamUrl.includes('.m3u8')) {
          if (videoElement.readyState === 0 || videoElement.error) {
            console.log('🔄 Reloading failed video...');
            const currentSrc = videoElement.src;
            videoElement.src = '';
            videoElement.src = currentSrc;
            videoElement.load();
            videoElement.play().catch(err => console.error('❌ Video reload failed:', err));
          }
        }
        
        // Check if video is stalled (not progressing)
        const currentTime = videoElement.currentTime;
        if (currentTime > 0 && !videoElement.paused && !videoElement.ended) {
          setTimeout(() => {
            if (videoElement.currentTime === currentTime && !videoElement.paused) {
              console.log('🔄 Video stalled, forcing reload...');
              if (hlsRef.current) {
                hlsRef.current.startLoad();
              } else {
                videoElement.load();
                videoElement.play().catch(console.error);
              }
            }
          }, 2000);
        }
      }
    }, 500); // Check every 500ms for faster recovery
    
    return () => clearInterval(monitorStream);
  }, [streamConfig?.streamUrl, isPausedState]);

  // ✅ WEBSOCKET LISTENER: Listen for pause/play state changes from admin
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
          console.log(`🎬 Stream ${isPaused ? 'PAUSED' : 'RESUMED'} by admin`);
          
          setIsPausedState(isPaused);
          
          // Update pause state (actual pause/resume handled in useEffect)
          // This just updates the state, the useEffect will handle the stream reload
        }
      } catch (error) {
        // Ignore non-JSON messages
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, []);

  // Capture current video frame to canvas
  const captureCurrentFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas && video.readyState >= 2) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frameData = canvas.toDataURL('image/jpeg', 0.9);
        setFrozenFrame(frameData);
        console.log('📸 Captured frozen frame');
      }
    } else {
      console.warn('⚠️ Could not capture frame - video not ready');
    }
  };

  // ✅ OPTIMIZED: Handle pause/resume with NO FLICKER
  useEffect(() => {
    const videoElement = videoRef.current;
    const iframeElement = iframeRef.current;
    
    if (isPausedState) {
      // PAUSE: Freeze on current frame
      if (videoElement) {
        videoElement.pause();
        captureCurrentFrame();
        console.log('⏸️ Stream paused - frame frozen');
      }
    } else {
      // RESUME: Smooth resume with NO BLACK SCREEN
      setFrozenFrame(null);

      if (videoElement && streamConfig?.streamUrl) {
        console.log('▶️ Resuming stream smoothly...');
        
        // ✅ ANTI-FLICKER: Keep video visible during reload
        setIsReloading(true);
        
        // Capture current frame before reload
        if (videoElement.readyState >= 2) {
          captureCurrentFrame();
        }
        
        // Smooth reload without black screen
        const currentSrc = videoElement.src;
        
        // Create new video element in background
        const tempVideo = document.createElement('video');
        tempVideo.src = currentSrc;
        tempVideo.muted = true;
        tempVideo.playsInline = true;
        tempVideo.preload = 'auto';
        
        // Once loaded, swap smoothly
        tempVideo.addEventListener('loadeddata', () => {
          videoElement.src = currentSrc;
          videoElement.load();
          videoElement.play().then(() => {
            setIsReloading(false);
            setFrozenFrame(null);
            console.log('✅ Stream resumed smoothly');
          }).catch(err => {
            console.error('❌ Resume play failed:', err);
            setIsReloading(false);
            setTimeout(() => videoElement.play().catch(console.error), 200);
          });
        });
        
        // Start loading
        tempVideo.load();
        
        // Fallback: Remove loading state after 2 seconds
        setTimeout(() => setIsReloading(false), 2000);
      }

      // For iframe streams
      if (iframeElement && streamConfig?.streamUrl) {
        console.log('▶️ Resuming iframe stream...');
        const currentSrc = iframeElement.src;
        iframeElement.src = '';
        iframeElement.src = currentSrc;
        console.log('✅ Iframe stream resumed');
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
            setIsBuffering(true);
          }}
          onPlaying={() => {
            console.log('▶️ Video playing');
            setIsBuffering(false);
            setStreamError(null);
          }}
          onCanPlay={() => {
            setIsBuffering(false);
          }}
          onPause={() => {
            if (!document.hidden && videoRef.current && !isPausedState) {
              console.log('🔄 Video paused unexpectedly - instant auto-resume...');
              videoRef.current.play().catch(err => console.error('❌ Auto-resume failed:', err));
            }
          }}
          onStalled={() => {
            console.log('⚠️ Video stalled - smooth reload...');
            if (videoRef.current && !isPausedState) {
              // ✅ ANTI-FLICKER: Capture frame before reload
              captureCurrentFrame();
              setIsReloading(true);
              
              const currentSrc = videoRef.current.src;
              videoRef.current.src = '';
              videoRef.current.src = currentSrc;
              videoRef.current.load();
              videoRef.current.play().then(() => {
                setIsReloading(false);
                setFrozenFrame(null);
              }).catch(console.error);
            }
          }}
          onSuspend={() => {
            console.log('⚠️ Video suspended - attempting resume...');
            if (videoRef.current && !isPausedState) {
              videoRef.current.play().catch(console.error);
            }
          }}
          onError={(e) => {
            console.error('❌ Video error:', e);
            setStreamError('Reconnecting...');
            setIsBuffering(true);
            
            if (videoRef.current && !document.hidden) {
              console.log('🔄 Smooth error recovery...');
              
              // ✅ ANTI-FLICKER: Keep last frame visible
              captureCurrentFrame();
              setIsReloading(true);
              
              const currentSrc = videoRef.current.src;
              videoRef.current.src = '';
              
              setTimeout(() => {
                if (videoRef.current) {
                  setStreamError(null);
                  videoRef.current.src = currentSrc;
                  videoRef.current.load();
                  videoRef.current.play().then(() => {
                    setIsReloading(false);
                    setFrozenFrame(null);
                  }).catch(console.error);
                }
              }, 500);
            }
          }}
          onLoadedData={() => {
            console.log('✅ Video loaded, starting playback...');
            if (videoRef.current && !isPausedState) {
              videoRef.current.play().catch(console.error);
            }
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
      
      {/* Show frozen frame overlay when paused OR reloading (prevents flicker) */}
      {(isPausedState || isReloading) && frozenFrame && (
        <div className="absolute inset-0 z-20">
          <img 
            src={frozenFrame} 
            alt="Paused frame" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="bg-black/80 backdrop-blur-sm px-6 py-3 rounded-full">
              <span className="text-white text-lg font-semibold">
                {isPausedState ? '⏸️ Stream Paused' : '🔄 Refreshing...'}
              </span>
            </div>
          </div>
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

      {/* Circular Timer Overlay - CENTERED - ONLY VISIBLE DURING BETTING */}
      {gameState.phase === 'betting' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div className={`relative transition-all duration-300 ${
            gameState.phase === 'betting' && isPulsing ? 'animate-pulse scale-110' : 'scale-100'
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
                    <rect x="2" y="4" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
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
