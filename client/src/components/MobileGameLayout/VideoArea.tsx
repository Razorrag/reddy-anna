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
import { motion, AnimatePresence } from 'framer-motion';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  // Pause state
  const [isPausedState, setIsPausedState] = useState(false);
  
  // ✅ FIX: Mute state is now controlled by backend only (admin control)
  const [isMuted, setIsMuted] = useState(true);

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
        // ✅ NEW: Initialize mute state from backend config
        setIsMuted(config.muted !== false);
        
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

  // ✅ STREAM HEALTH MONITOR: Auto-recovery for paused or failed streams
  // ✅ FIX: Check isPausedState to prevent auto-resume when admin has paused
  useEffect(() => {
    const monitorStream = setInterval(() => {
      if (document.hidden) return; // Don't check when page is hidden
      
      const videoElement = videoRef.current;
      if (videoElement && streamConfig?.streamUrl) {
        // ✅ CRITICAL FIX: Only auto-resume if NOT paused by admin
        if (videoElement.paused && videoElement.readyState >= 2 && !isPausedState) {
          console.log('🔄 Auto-resuming paused video...');
          videoElement.play().catch(err => console.error('❌ Auto-resume failed:', err));
        }
        
        // If video failed to load, reload it (but respect pause state)
        if (videoElement.readyState === 0 || videoElement.error) {
          console.log('🔄 Reloading failed video...');
          videoElement.load();
          if (!isPausedState) {
            videoElement.play().catch(err => console.error('❌ Video reload failed:', err));
          }
        }
      }
    }, 1000); // Check every 1 second for tighter auto-refresh
    
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
          
          // Handle pause/resume for video element
          const video = videoRef.current;
          const hls = hlsRef.current;
          
          if (isPaused) {
            // Pause video
            if (video) {
              video.pause();
            }
          } else {
            // Resume video playback
            if (video) {
              video.play().catch(console.error);
            }
          }
        }
      } catch (error) {
        // Ignore non-JSON messages
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, []);

  // Handle pause effect when paused state changes
  useEffect(() => {
    const video = videoRef.current;
    
    if (isPausedState && video) {
      video.pause();
    } else if (!isPausedState && video) {
      video.play().catch(console.error);
    }
  }, [isPausedState]);

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

  // ✅ HLS.js INITIALIZATION: Setup HLS player for .m3u8 streams
  useEffect(() => {
    const video = videoRef.current;
    const streamUrl = streamConfig?.streamUrl;
    
    if (!video || !streamUrl) return;
    
    // Check if URL is HLS stream
    const isHLS = streamUrl.toLowerCase().endsWith('.m3u8');
    
    if (isHLS && Hls.isSupported()) {
      // Use HLS.js for HLS streams
      console.log('🎥 Initializing HLS.js player for:', streamUrl);
      
      // Cleanup existing HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });
      
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('✅ HLS manifest parsed, starting playback');
        if (!isPausedState) {
          video.play().catch(err => console.error('HLS play error:', err));
        }
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('❌ HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('🔄 Fatal network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('🔄 Fatal media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.log('💥 Fatal error, destroying HLS instance');
              hls.destroy();
              break;
          }
        }
      });
      
      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    } else if (isHLS && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      console.log('🎥 Using Safari native HLS support');
      video.src = streamUrl;
      if (!isPausedState) {
        video.play().catch(err => console.error('Safari HLS play error:', err));
      }
    }
  }, [streamConfig?.streamUrl, isPausedState]);

  // Auto-detect stream type based on URL
  const url = streamConfig?.streamUrl?.toLowerCase() || '';
  const isHLS = url.endsWith('.m3u8');
  const isVideoFile = url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg') || isHLS;
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
      
      // For HLS streams, don't set src directly (HLS.js will handle it)
      const isHLS = streamConfig.streamUrl.toLowerCase().endsWith('.m3u8');
      
      return (
        <video
          ref={videoRef}
          src={!isHLS ? streamConfig.streamUrl : undefined}
          className="w-full h-full object-cover"
          autoPlay
          muted={isMuted} // ✅ FIX: User-controlled mute state
          controls={streamConfig.controls || false}
          loop
          playsInline
          preload="auto"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1
          }}
          onPause={() => {
            // ✅ CRITICAL FIX: Auto-resume if paused unexpectedly, but NOT if admin paused
            if (!document.hidden && videoRef.current && !isPausedState) {
              console.log('🔄 Video paused unexpectedly - auto-resuming...');
              setTimeout(() => {
                videoRef.current?.play().catch(err => console.error('❌ Auto-resume on pause failed:', err));
              }, 100);
            }
          }}
          onError={(e) => {
            console.error('❌ Video error:', e);
            // Try to reload after error
            setTimeout(() => {
              if (videoRef.current && !document.hidden) {
                console.log('🔄 Attempting to recover from video error...');
                videoRef.current.load();
                videoRef.current.play().catch(console.error);
              }
            }, 1000);
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
  const showFrozenFrame = false;
  
  console.log('🎥 VideoArea render state:', {
    isLive,
    streamConfigExists: !!streamConfig,
    isActive: streamConfig?.isActive,
    hasUrl: !!streamConfig?.streamUrl,
    phase: gameState.phase
  });

  return (
    <div className={`relative bg-black overflow-hidden ${className}`}>
      {/* Embedded Video Stream - Runs independently in background, never interrupted */}
      <div className="absolute inset-0">
        {renderStream()}

        {/* ✅ PAUSED OVERLAY: Show when stream is paused by admin */}
        {isPausedState && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-20">
            <div className="text-center">
              <div className="text-6xl mb-4">⏸️</div>
              <p className="text-white text-2xl font-bold mb-2">Stream Paused</p>
              <p className="text-gray-400">The stream has been temporarily paused by the administrator</p>
            </div>
          </div>
        )}

        {/* Overlay Gradient for better text visibility */}
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
