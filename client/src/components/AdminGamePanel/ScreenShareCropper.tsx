import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Move, RotateCcw } from 'lucide-react';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScreenShareCropperProps {
  sourceStream: MediaStream | null;
  onCropChange?: (crop: CropArea | null) => void;
}

// Throttle utility function
const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    
    if (timeSinceLastCall >= delay) {
      lastCall = now;
      func(...args);
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
      }, delay - timeSinceLastCall);
    }
  };
};

const ScreenShareCropper: React.FC<ScreenShareCropperProps> = ({
  sourceStream,
  onCropChange
}) => {
  const sourceVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const throttleRef = useRef<ReturnType<typeof throttle> | null>(null);
  const errorBoundaryRef = useRef(false); // Error boundary flag
  
  // ✅ FIX: Use refs for drag state that survives re-renders
  const dragStateRef = useRef<{
    isDragging: boolean;
    handle: string | null;
    startX: number;
    startY: number;
    startCrop: CropArea;
  } | null>(null);
  const isDraggingRef = useRef(false);
  const cropAreaRef = useRef<CropArea | null>(null);
  const handleMouseMoveRef = useRef<((e: MouseEvent) => void) | null>(null);
  const handleMouseUpRef = useRef<(() => void) | null>(null);
  const isInitializingRef = useRef(false);
  const onCropChangeRef = useRef(onCropChange); // ✅ Store callback in ref
  
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [cropApplied, setCropApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    handle: string | null;
    startX: number;
    startY: number;
    startCrop: CropArea;
  } | null>(null);
  
  // ✅ FIX: Keep refs in sync with state
  useEffect(() => {
    dragStateRef.current = dragState;
    isDraggingRef.current = dragState !== null;
  }, [dragState]);
  
  useEffect(() => {
    cropAreaRef.current = cropArea;
  }, [cropArea]);
  
  // ✅ Keep callback ref in sync
  useEffect(() => {
    onCropChangeRef.current = onCropChange;
  }, [onCropChange]);

  // Initialize video only - NO automatic stream creation
  useEffect(() => {
    // ✅ FIX: Skip if dragging or initializing to prevent interruption
    if (errorBoundaryRef.current || isDraggingRef.current || isInitializingRef.current) {
      return;
    }
    
    isInitializingRef.current = true;
    
    try {
      const video = sourceVideoRef.current;
      if (!video || !sourceStream) {
        // Cleanup when no stream
        if (video) {
          try {
            video.srcObject = null;
          } catch (e) {
            console.warn('Error clearing video srcObject:', e);
          }
        }
        setVideoDimensions({ width: 0, height: 0 });
        setCropArea(null);
        setError(null);
        return;
      }

      // Set video source with error handling
      try {
        video.srcObject = sourceStream;
        setError(null);
      } catch (e) {
        console.error('Error setting video srcObject:', e);
        setError('Failed to load video stream');
        return;
      }
      
      const handleMetadata = () => {
        try {
          if (video && video.videoWidth > 0 && video.videoHeight > 0) {
            console.log('✅ Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);
            
            const dims = {
              width: video.videoWidth,
              height: video.videoHeight
            };
            
            // Validate dimensions
            if (!isFinite(dims.width) || !isFinite(dims.height) || dims.width <= 0 || dims.height <= 0) {
              console.error('Invalid video dimensions:', dims);
              setError('Invalid video dimensions');
              return;
            }
            
            setVideoDimensions(dims);
            setError(null);
            
            // Set initial crop to full video (only once)
            setCropArea(prev => {
              if (!prev) {
                return {
                  x: 0,
                  y: 0,
                  width: dims.width,
                  height: dims.height
                };
              }
              return prev;
            });
          }
        } catch (e) {
          console.error('Error in handleMetadata:', e);
          setError('Error loading video metadata');
        }
      };

      const handleError = () => {
        console.error('Video error occurred');
        setError('Video playback error');
      };

      video.addEventListener('loadedmetadata', handleMetadata);
      video.addEventListener('error', handleError);
      
      // Play video (muted, no user interaction needed)
      video.play().catch(err => {
        console.error('Video play error:', err);
        // Non-critical - video might still work
      });

      return () => {
        try {
          video.removeEventListener('loadedmetadata', handleMetadata);
          video.removeEventListener('error', handleError);
        } catch (e) {
          console.warn('Error removing event listeners:', e);
        } finally {
          isInitializingRef.current = false;
        }
      };
    } catch (err) {
      console.error('Critical error in video initialization:', err);
      errorBoundaryRef.current = true;
      setError('Critical error: ' + (err as Error).message);
      isInitializingRef.current = false;
    }
  }, [sourceStream]); // Only depend on sourceStream

  // Canvas streaming removed - AdminStreamContext handles all streaming to players
  // This component only manages the crop selection UI

  // ✅ FIX: Debounce crop change notifications to prevent excessive parent re-renders
  useEffect(() => {
    if (!onCropChangeRef.current || !cropArea) return;
    
    // ✅ Debounce to prevent excessive updates during drag
    const timer = setTimeout(() => {
      // ✅ Check if still dragging - don't notify parent during active drag
      if (!isDraggingRef.current && onCropChangeRef.current) {
        try {
          onCropChangeRef.current(cropArea);
          setCropApplied(true);
          
          // Clear feedback after 2 seconds
          setTimeout(() => {
            setCropApplied(false);
          }, 2000);
        } catch (err) {
          console.error('Error in onCropChange:', err);
        }
      }
    }, 150); // Wait 150ms after last change
    
    return () => clearTimeout(timer);
  }, [cropArea]); // ✅ Only depend on cropArea, callback is in ref

  // Coordinate conversion helpers
  const getDisplayedVideoRect = useCallback(() => {
    const video = sourceVideoRef.current;
    const container = containerRef.current;
    if (!video || !container || video.videoWidth === 0) {
      return null;
    }

    const containerRect = container.getBoundingClientRect();
    const videoAspect = video.videoWidth / video.videoHeight;
    const containerAspect = containerRect.width / containerRect.height;

    let displayWidth: number;
    let displayHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (containerAspect > videoAspect) {
      // Pillarbox
      displayHeight = containerRect.height;
      displayWidth = displayHeight * videoAspect;
      offsetX = (containerRect.width - displayWidth) / 2;
      offsetY = 0;
    } else {
      // Letterbox
      displayWidth = containerRect.width;
      displayHeight = displayWidth / videoAspect;
      offsetX = 0;
      offsetY = (containerRect.height - displayHeight) / 2;
    }

    return {
      offsetX,
      offsetY,
      displayWidth,
      displayHeight,
      scaleX: displayWidth / video.videoWidth,
      scaleY: displayHeight / video.videoHeight
    };
  }, []);

  const screenToVideo = useCallback((screenX: number, screenY: number) => {
    try {
      const rect = getDisplayedVideoRect();
      if (!rect || !sourceVideoRef.current) {
        return { x: 0, y: 0 };
      }

      const video = sourceVideoRef.current;
      
      // Validate video dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0 || 
          rect.scaleX === 0 || rect.scaleY === 0) {
        return { x: 0, y: 0 };
      }

      const videoX = (screenX - rect.offsetX) / rect.scaleX;
      const videoY = (screenY - rect.offsetY) / rect.scaleY;

      // Validate calculated values
      if (!isFinite(videoX) || !isFinite(videoY)) {
        return { x: 0, y: 0 };
      }

      return {
        x: Math.max(0, Math.min(video.videoWidth, videoX)),
        y: Math.max(0, Math.min(video.videoHeight, videoY))
      };
    } catch (error) {
      console.error('Error in screenToVideo:', error);
      return { x: 0, y: 0 };
    }
  }, [getDisplayedVideoRect]);

  const videoToScreen = useCallback((crop: CropArea) => {
    try {
      const rect = getDisplayedVideoRect();
      if (!rect) return null;

      // Validate crop
      if (!crop || isNaN(crop.x) || isNaN(crop.y) || 
          isNaN(crop.width) || isNaN(crop.height)) {
        return null;
      }

      // Validate scales
      if (!isFinite(rect.scaleX) || !isFinite(rect.scaleY)) {
        return null;
      }

      const result = {
        x: crop.x * rect.scaleX + rect.offsetX,
        y: crop.y * rect.scaleY + rect.offsetY,
        width: crop.width * rect.scaleX,
        height: crop.height * rect.scaleY
      };

      // Validate result
      if (!isFinite(result.x) || !isFinite(result.y) || 
          !isFinite(result.width) || !isFinite(result.height)) {
        return null;
      }

      return result;
    } catch (error) {
      console.error('Error in videoToScreen:', error);
      return null;
    }
  }, [getDisplayedVideoRect]);

  // Mouse handlers with comprehensive error handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (errorBoundaryRef.current) return; // Skip if error occurred
    
    if (!cropArea || !containerRef.current || !sourceVideoRef.current) {
      return;
    }

    try {
      e.preventDefault();
      e.stopPropagation();

      const container = containerRef.current;
      // ✅ FIX: Validate container exists and is still mounted
      if (!container || !container.isConnected) return;
      
      const rect = container.getBoundingClientRect();
      
      // Validate rect
      if (!rect || rect.width === 0 || rect.height === 0 || !isFinite(rect.width) || !isFinite(rect.height)) {
        return;
      }
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Validate coordinates
      if (isNaN(mouseX) || isNaN(mouseY) || !isFinite(mouseX) || !isFinite(mouseY)) return;

      const screenCrop = videoToScreen(cropArea);
      if (!screenCrop) return;

      // Validate screen crop
      if (isNaN(screenCrop.x) || isNaN(screenCrop.y) || 
          isNaN(screenCrop.width) || isNaN(screenCrop.height)) return;

      const handleSize = 12;
      let handle: string | null = null;

      // Check handles
      const handles = [
        { name: 'nw', x: screenCrop.x, y: screenCrop.y },
        { name: 'ne', x: screenCrop.x + screenCrop.width, y: screenCrop.y },
        { name: 'sw', x: screenCrop.x, y: screenCrop.y + screenCrop.height },
        { name: 'se', x: screenCrop.x + screenCrop.width, y: screenCrop.y + screenCrop.height }
      ];

      for (const h of handles) {
        const distX = Math.abs(mouseX - h.x);
        const distY = Math.abs(mouseY - h.y);
        if (distX < handleSize && distY < handleSize) {
          handle = h.name;
          break;
        }
      }

      // Check if inside crop area for move
      if (!handle && 
          mouseX >= screenCrop.x && mouseX <= screenCrop.x + screenCrop.width &&
          mouseY >= screenCrop.y && mouseY <= screenCrop.y + screenCrop.height) {
        handle = 'move';
      }

      const videoCoords = screenToVideo(mouseX, mouseY);
      
      // Validate video coordinates
      if (isNaN(videoCoords.x) || isNaN(videoCoords.y) || 
          !isFinite(videoCoords.x) || !isFinite(videoCoords.y)) return;

      const newDragState = {
        isDragging: handle === 'move',
        handle: handle || null,
        startX: videoCoords.x,
        startY: videoCoords.y,
        startCrop: { ...cropArea }
      };

      // ✅ FIX: Set refs immediately before state update
      dragStateRef.current = newDragState;
      isDraggingRef.current = true;
      setDragState(newDragState);
    } catch (error) {
      console.error('Error in handleMouseDown:', error);
      isDraggingRef.current = false;
      dragStateRef.current = null;
    }
  }, [cropArea, videoToScreen, screenToVideo]);

  const handleMouseMoveInternal = useCallback((e: MouseEvent) => {
    // ✅ FIX: Use ref to check drag state (survives re-renders)
    if (!isDraggingRef.current || !dragStateRef.current || !sourceVideoRef.current || !containerRef.current) {
      return;
    }

    try {
      const container = containerRef.current;
      
      // ✅ FIX: Validate container still mounted
      if (!container || !container.isConnected) {
        isDraggingRef.current = false;
        setDragState(null);
        return;
      }
      
      const rect = container.getBoundingClientRect();
      
      // Validate rect dimensions
      if (!rect || rect.width === 0 || rect.height === 0) return;
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Validate coordinates
      if (isNaN(mouseX) || isNaN(mouseY) || !isFinite(mouseX) || !isFinite(mouseY)) return;

      const videoCoords = screenToVideo(mouseX, mouseY);
      const video = sourceVideoRef.current;
      
      // Validate video dimensions
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
      
      // Validate coordinates
      if (isNaN(videoCoords.x) || isNaN(videoCoords.y) || 
          !isFinite(videoCoords.x) || !isFinite(videoCoords.y)) return;

      // ✅ FIX: Get drag state from ref, not closure
      const currentDragState = dragStateRef.current;
      if (!currentDragState) return;

      const { handle, startX, startY, startCrop } = currentDragState;
      const minSize = 50;

      // Validate start crop
      if (!startCrop || isNaN(startCrop.x) || isNaN(startCrop.y) || 
          isNaN(startCrop.width) || isNaN(startCrop.height)) return;

      let newCrop = { ...startCrop };

      if (handle === 'move') {
        const dx = videoCoords.x - startX;
        const dy = videoCoords.y - startY;
        newCrop.x = Math.max(0, Math.min(video.videoWidth - newCrop.width, startCrop.x + dx));
        newCrop.y = Math.max(0, Math.min(video.videoHeight - newCrop.height, startCrop.y + dy));
      } else if (handle === 'se') {
        newCrop.width = Math.max(minSize, Math.min(videoCoords.x - startCrop.x, video.videoWidth - startCrop.x));
        newCrop.height = Math.max(minSize, Math.min(videoCoords.y - startCrop.y, video.videoHeight - startCrop.y));
      } else if (handle === 'nw') {
        const newX = Math.max(0, Math.min(videoCoords.x, startCrop.x + startCrop.width - minSize));
        const newY = Math.max(0, Math.min(videoCoords.y, startCrop.y + startCrop.height - minSize));
        newCrop.width = startCrop.x + startCrop.width - newX;
        newCrop.height = startCrop.y + startCrop.height - newY;
        newCrop.x = newX;
        newCrop.y = newY;
      } else if (handle === 'ne') {
        const newY = Math.max(0, Math.min(videoCoords.y, startCrop.y + startCrop.height - minSize));
        newCrop.width = Math.max(minSize, Math.min(videoCoords.x - startCrop.x, video.videoWidth - startCrop.x));
        newCrop.height = startCrop.y + startCrop.height - newY;
        newCrop.y = newY;
      } else if (handle === 'sw') {
        const newX = Math.max(0, Math.min(videoCoords.x, startCrop.x + startCrop.width - minSize));
        newCrop.width = startCrop.x + startCrop.width - newX;
        newCrop.height = Math.max(minSize, Math.min(videoCoords.y - startCrop.y, video.videoHeight - startCrop.y));
        newCrop.x = newX;
      }

      // Validate final crop values
      if (newCrop.width >= minSize && newCrop.height >= minSize &&
          newCrop.x >= 0 && newCrop.y >= 0 &&
          newCrop.x + newCrop.width <= video.videoWidth &&
          newCrop.y + newCrop.height <= video.videoHeight) {
        // ✅ FIX: Update ref immediately, then state (batch updates)
        cropAreaRef.current = newCrop;
        setCropArea(newCrop);
      }
    } catch (error) {
      console.error('Error in handleMouseMove:', error);
      // ✅ FIX: Reset drag state on error to prevent stuck state
      isDraggingRef.current = false;
      dragStateRef.current = null;
      setDragState(null);
    }
  }, [screenToVideo]);

  // Create throttled version
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!throttleRef.current) {
      throttleRef.current = throttle(handleMouseMoveInternal, 16); // ~60fps throttling
    }
    throttleRef.current(e);
  }, [handleMouseMoveInternal]);

  const handleMouseUp = useCallback(() => {
    try {
      // ✅ FIX: Reset all refs and state
      isDraggingRef.current = false;
      throttleRef.current = null;
      dragStateRef.current = null;
      setDragState(null);
    } catch (error) {
      console.error('Error in handleMouseUp:', error);
      isDraggingRef.current = false;
      dragStateRef.current = null;
      setDragState(null);
    }
  }, []);

  // ✅ FIX: Global mouse events with stable refs to prevent cleanup issues
  useEffect(() => {
    if (dragState && !errorBoundaryRef.current) {
      // ✅ Create stable handlers that use refs
      const stableMouseMove = (e: MouseEvent) => {
        if (handleMouseMoveRef.current) {
          handleMouseMoveRef.current(e);
        }
      };
      
      const stableMouseUp = () => {
        if (handleMouseUpRef.current) {
          handleMouseUpRef.current();
        }
      };

      // ✅ Store handlers in refs immediately
      handleMouseMoveRef.current = handleMouseMove;
      handleMouseUpRef.current = handleMouseUp;

      try {
        const preventDefault = (e: Event) => {
          try {
            e.preventDefault();
          } catch (err) {
            // Ignore errors
          }
        };
        
        // ✅ Use capture phase for mouseup to ensure we catch it
        window.addEventListener('mousemove', stableMouseMove, { passive: false });
        window.addEventListener('mouseup', stableMouseUp, { capture: true });
        window.addEventListener('contextmenu', preventDefault, { capture: true });
        
        // Prevent text selection during drag
        const originalUserSelect = document.body.style.userSelect;
        const originalCursor = document.body.style.cursor;
        try {
          document.body.style.userSelect = 'none';
          document.body.style.cursor = dragState.handle === 'move' ? 'move' : 'crosshair';
        } catch (err) {
          console.warn('Error setting body styles:', err);
        }
        
        return () => {
          try {
            // ✅ Cleanup with same stable handlers
            window.removeEventListener('mousemove', stableMouseMove);
            window.removeEventListener('mouseup', stableMouseUp, { capture: true });
            window.removeEventListener('contextmenu', preventDefault, { capture: true });
            
            // ✅ Restore body styles
            document.body.style.userSelect = originalUserSelect;
            document.body.style.cursor = originalCursor;
            
            // ✅ Clear refs on cleanup
            handleMouseMoveRef.current = null;
            handleMouseUpRef.current = null;
          } catch (err) {
            console.warn('Error cleaning up event listeners:', err);
          }
        };
      } catch (err) {
        console.error('Error setting up mouse events:', err);
        errorBoundaryRef.current = true;
        setError('Error in mouse handlers');
      }
    } else {
      // ✅ Clear refs when not dragging
      handleMouseMoveRef.current = null;
      handleMouseUpRef.current = null;
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  const resetCrop = useCallback(() => {
    const video = sourceVideoRef.current;
    if (video && video.videoWidth > 0) {
      setCropArea({
        x: 0,
        y: 0,
        width: video.videoWidth,
        height: video.videoHeight
      });
    }
  }, []);

  // Removed startStreaming and stopStreaming - streaming is handled by AdminStreamContext

  // ✅ FIX: Enhanced cleanup on unmount
  useEffect(() => {
    return () => {
      // Reset all refs
      throttleRef.current = null;
      isDraggingRef.current = false;
      dragStateRef.current = null;
      handleMouseMoveRef.current = null;
      handleMouseUpRef.current = null;
      
      // Reset drag state
      setDragState(null);
      
      // ✅ Ensure body styles are restored
      try {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      } catch (e) {
        // Ignore
      }
    };
  }, []);

  // Render crop overlay
  const renderCropOverlay = () => {
    if (!cropArea) return null;
    
    try {
      const screenCrop = videoToScreen(cropArea);
      if (!screenCrop) return null;

      // Validate screen crop values
      const { x, y, width, height } = screenCrop;
      if (!isFinite(x) || !isFinite(y) || !isFinite(width) || !isFinite(height) ||
          width <= 0 || height <= 0) return null;

      const handleSize = 12;

      return (
        <>
          {/* Dark overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                linear-gradient(to right, rgba(0,0,0,0.7) ${x}px, transparent ${x}px, transparent ${x + width}px, rgba(0,0,0,0.7) ${x + width}px),
                linear-gradient(to bottom, rgba(0,0,0,0.7) ${y}px, transparent ${y}px, transparent ${y + height}px, rgba(0,0,0,0.7) ${y + height}px)
              `
            }}
          />
          
          {/* Crop border */}
          <div
            className="absolute border-2 border-yellow-400 pointer-events-none shadow-lg"
            style={{
              left: x,
              top: y,
              width,
              height,
              boxShadow: '0 0 0 1px rgba(255,215,0,0.5)'
            }}
          />
          
          {/* Resize handles */}
          {['nw', 'ne', 'sw', 'se'].map(pos => {
            const positions: Record<string, {left: number, top: number, cursor: string}> = {
              nw: { left: x - handleSize/2, top: y - handleSize/2, cursor: 'nwse-resize' },
              ne: { left: x + width - handleSize/2, top: y - handleSize/2, cursor: 'nesw-resize' },
              sw: { left: x - handleSize/2, top: y + height - handleSize/2, cursor: 'nesw-resize' },
              se: { left: x + width - handleSize/2, top: y + height - handleSize/2, cursor: 'nwse-resize' }
            };
            const p = positions[pos];
            
            if (!isFinite(p.left) || !isFinite(p.top)) return null;
            
            return (
              <div
                key={pos}
                className="absolute bg-yellow-400 border-2 border-white rounded-full z-30 hover:scale-125 transition-transform pointer-events-auto"
                style={{
                  left: p.left,
                  top: p.top,
                  width: handleSize,
                  height: handleSize,
                  cursor: p.cursor
                }}
              />
            );
          })}
          
          {/* Move handle - only show when not dragging */}
          {!dragState && (
            <div
              className="absolute flex items-center justify-center cursor-move z-20 pointer-events-auto"
              style={{
                left: x,
                top: y,
                width,
                height
              }}
            >
              <div className="bg-yellow-400/80 rounded-full p-2 pointer-events-none">
                <Move className="w-5 h-5 text-gray-900" />
              </div>
            </div>
          )}
        </>
      );
    } catch (error) {
      console.error('Error rendering crop overlay:', error);
      return null;
    }
  };

  if (!sourceStream) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 text-center text-gray-400">
        <p className="text-lg">No screen share active</p>
        <p className="text-sm mt-2">Click "Start Screen Share" above to begin</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-8 text-center">
        <p className="text-red-300 text-lg mb-2">⚠️ Error</p>
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={() => {
            errorBoundaryRef.current = false;
            setError(null);
          }}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Single video display with crop overlay */}
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Screen Share - Select Crop Area</h3>
          <button
            onClick={resetCrop}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-2 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Crop
          </button>
        </div>

        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          className="relative bg-black rounded-lg overflow-hidden border-2 border-gray-700 cursor-crosshair"
          style={{
            aspectRatio: videoDimensions.width && videoDimensions.height 
              ? `${videoDimensions.width} / ${videoDimensions.height}`
              : '16 / 9',
            minHeight: '300px',
            maxHeight: '70vh',
            maxWidth: '100%',
            userSelect: 'none',
            touchAction: 'none'
          }}
        >
          <video
            ref={sourceVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain"
          />
          
          {renderCropOverlay()}
          
          <div className="absolute top-3 left-3 bg-black/80 text-white text-xs px-3 py-1.5 rounded pointer-events-none z-10">
            Drag corners to resize • Drag center to move
          </div>
        </div>

        {cropArea && (
          <div className="mt-3 space-y-2">
            <div className="text-xs text-gray-400 bg-gray-800/50 rounded p-2">
              <div className="grid grid-cols-2 gap-2">
                <div>Position: {Math.round(cropArea.x)}, {Math.round(cropArea.y)}</div>
                <div>Size: {Math.round(cropArea.width)} × {Math.round(cropArea.height)}</div>
              </div>
            </div>
            
            {/* Crop applied feedback */}
            {cropApplied && (
              <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-2 flex items-center gap-2 text-sm text-green-300 animate-fade-in">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Crop area applied! Players will see this region.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info panel */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-300 font-medium mb-1">
              Crop Applied to Active Stream
            </p>
            <p className="text-xs text-gray-500">
              Your selected crop area is automatically applied to the stream. Players will see only the cropped region. Adjust the crop area anytime and changes will be applied immediately.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

// ✅ FIX: Memoize component to prevent unnecessary re-renders
export default React.memo(ScreenShareCropper);
