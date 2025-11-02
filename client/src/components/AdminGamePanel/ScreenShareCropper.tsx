import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Move, RotateCcw, Play, Square } from 'lucide-react';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScreenShareCropperProps {
  sourceStream: MediaStream | null;
  onCropChange?: (crop: CropArea | null) => void;
  onCroppedStream?: (stream: MediaStream | null) => void;
}

const ScreenShareCropper: React.FC<ScreenShareCropperProps> = ({
  sourceStream,
  onCropChange,
  onCroppedStream
}) => {
  const sourceVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const isStreamingRef = useRef<boolean>(false);
  
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isStreaming, setIsStreaming] = useState(true); // Auto-start streaming
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    handle: string | null;
    startX: number;
    startY: number;
    startCrop: CropArea;
  } | null>(null);

  // Initialize video only - NO automatic stream creation
  useEffect(() => {
    const video = sourceVideoRef.current;
    if (!video || !sourceStream) {
      // Cleanup when no stream
      if (video) {
        video.srcObject = null;
      }
      setVideoDimensions({ width: 0, height: 0 });
      setCropArea(null);
      return;
    }

    // Set video source
    video.srcObject = sourceStream;
    
    const handleMetadata = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        console.log('✅ Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);
        
        const dims = {
          width: video.videoWidth,
          height: video.videoHeight
        };
        
        setVideoDimensions(dims);
        
        // Set initial crop to full video (only once)
        setCropArea(prev => {
          if (!prev) {
            return {
              x: 0,
              y: 0,
              width: video.videoWidth,
              height: video.videoHeight
            };
          }
          return prev;
        });
      }
    };

    video.addEventListener('loadedmetadata', handleMetadata);
    
    // Play video (muted, no user interaction needed)
    video.play().catch(err => console.error('Video play error:', err));

    return () => {
      video.removeEventListener('loadedmetadata', handleMetadata);
    };
  }, [sourceStream]); // Only depend on sourceStream

  // Auto-enable streaming when source stream and crop area are available
  useEffect(() => {
    if (sourceStream && cropArea && videoDimensions.width > 0 && !isStreaming) {
      console.log('✅ Auto-enabling streaming with crop area:', cropArea);
      setIsStreaming(true);
    }
  }, [sourceStream, cropArea, videoDimensions, isStreaming]);

  // Canvas streaming - only when isStreaming is true
  useEffect(() => {
    // Auto-start when we have source stream and crop area
    if (sourceStream && cropArea && videoDimensions.width > 0 && !isStreaming) {
      console.log('✅ Auto-starting cropped stream...');
      setIsStreaming(true);
    }

    if (!isStreaming || !cropArea || !sourceVideoRef.current || !canvasRef.current) {
      // Stop streaming if turned off
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (currentStreamRef.current && !isStreaming) {
        currentStreamRef.current.getTracks().forEach(t => t.stop());
        currentStreamRef.current = null;
        if (onCroppedStream) {
          onCroppedStream(null);
        }
      }
      return;
    }

    const video = sourceVideoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions
    canvas.width = cropArea.width;
    canvas.height = cropArea.height;

    let active = true;
    isStreamingRef.current = true;

    const drawFrame = () => {
      if (!active || !isStreamingRef.current) return;

      const ctx = canvas.getContext('2d');
      if (!ctx || !video || video.videoWidth === 0) {
        if (active) {
          animationFrameRef.current = requestAnimationFrame(drawFrame);
        }
        return;
      }

      try {
        // Draw cropped region
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
          video,
          cropArea.x, cropArea.y, cropArea.width, cropArea.height,
          0, 0, cropArea.width, cropArea.height
        );

        if (active && isStreamingRef.current) {
          animationFrameRef.current = requestAnimationFrame(drawFrame);
        }
      } catch (err) {
        console.error('Canvas draw error:', err);
      }
    };

    // Start drawing
    drawFrame();

    // Create stream if not exists
    if (!currentStreamRef.current) {
      try {
        const stream = canvas.captureStream(30);
        currentStreamRef.current = stream;
        console.log('✅ Canvas stream created with', stream.getTracks().length, 'tracks');
        
        // Wait for tracks to be ready before notifying parent
        const checkTracks = () => {
          const activeTracks = stream.getTracks().filter(t => t.readyState === 'live');
          if (activeTracks.length > 0) {
            console.log('✅ Canvas stream tracks are active, notifying parent');
            if (onCroppedStream) {
              onCroppedStream(stream);
            }
          } else {
            // Retry after a short delay
            setTimeout(checkTracks, 100);
          }
        };
        
        // Initial check
        checkTracks();
      } catch (err) {
        console.error('Failed to create canvas stream:', err);
        if (onCroppedStream) {
          onCroppedStream(null);
        }
      }
    } else if (onCroppedStream && currentStreamRef.current.getTracks().length > 0) {
      // Stream already exists, ensure parent is notified
      const activeTracks = currentStreamRef.current.getTracks().filter(t => t.readyState === 'live');
      if (activeTracks.length > 0) {
        onCroppedStream(currentStreamRef.current);
      }
    }

    return () => {
      active = false;
    };
  }, [sourceStream, cropArea, videoDimensions, isStreaming, onCroppedStream]);

  // Notify parent of crop changes
  useEffect(() => {
    if (onCropChange && cropArea) {
      onCropChange(cropArea);
    }
  }, [cropArea, onCropChange]);

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
    const rect = getDisplayedVideoRect();
    if (!rect || !sourceVideoRef.current) {
      return { x: 0, y: 0 };
    }

    const video = sourceVideoRef.current;
    const videoX = (screenX - rect.offsetX) / rect.scaleX;
    const videoY = (screenY - rect.offsetY) / rect.scaleY;

    return {
      x: Math.max(0, Math.min(video.videoWidth, videoX)),
      y: Math.max(0, Math.min(video.videoHeight, videoY))
    };
  }, [getDisplayedVideoRect]);

  const videoToScreen = useCallback((crop: CropArea) => {
    const rect = getDisplayedVideoRect();
    if (!rect) return null;

    return {
      x: crop.x * rect.scaleX + rect.offsetX,
      y: crop.y * rect.scaleY + rect.offsetY,
      width: crop.width * rect.scaleX,
      height: crop.height * rect.scaleY
    };
  }, [getDisplayedVideoRect]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!cropArea || !containerRef.current || !sourceVideoRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const screenCrop = videoToScreen(cropArea);
    if (!screenCrop) return;

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
      if (Math.abs(mouseX - h.x) < handleSize && Math.abs(mouseY - h.y) < handleSize) {
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

    setDragState({
      isDragging: handle === 'move',
      handle,
      startX: videoCoords.x,
      startY: videoCoords.y,
      startCrop: { ...cropArea }
    });
  }, [cropArea, videoToScreen, screenToVideo]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState || !sourceVideoRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const videoCoords = screenToVideo(mouseX, mouseY);
    const video = sourceVideoRef.current;
    const { handle, startX, startY, startCrop } = dragState;
    const minSize = 50;

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

    setCropArea(newCrop);
  }, [dragState, screenToVideo]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  // Global mouse events
  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
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

  const startStreaming = useCallback(() => {
    if (!cropArea || !sourceVideoRef.current) {
      console.warn('⚠️ Cannot start streaming: no crop area or video not ready');
      return;
    }
    const video = sourceVideoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn('⚠️ Cannot start streaming: video dimensions not ready');
      return;
    }
    console.log('▶️ Starting stream with crop:', cropArea);
    setIsStreaming(true);
  }, [cropArea]);

  const stopStreaming = useCallback(() => {
    console.log('⏹️ Stopping stream');
    setIsStreaming(false);
    isStreamingRef.current = false;
    
    // Stop animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Stop stream
    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach(t => t.stop());
      currentStreamRef.current = null;
    }
    
    if (onCroppedStream) {
      onCroppedStream(null);
    }
  }, [onCroppedStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Render crop overlay
  const renderCropOverlay = () => {
    if (!cropArea) return null;
    
    const screenCrop = videoToScreen(cropArea);
    if (!screenCrop) return null;

    const { x, y, width, height } = screenCrop;
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
          
          return (
            <div
              key={pos}
              className="absolute bg-yellow-400 border-2 border-white rounded-full z-30 hover:scale-125 transition-transform cursor-pointer"
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
        
        {/* Move handle */}
        <div
          className="absolute flex items-center justify-center cursor-move z-20"
          style={{
            left: x,
            top: y,
            width,
            height
          }}
        >
          <div className="bg-yellow-400/80 rounded-full p-2">
            <Move className="w-5 h-5 text-gray-900" />
          </div>
        </div>
      </>
    );
  };

  if (!sourceStream) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 text-center text-gray-400">
        <p className="text-lg">No screen share active</p>
        <p className="text-sm mt-2">Click "Start Screen Share" above to begin</p>
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
            minHeight: '400px',
            userSelect: 'none'
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
          <div className="mt-3 text-xs text-gray-400 bg-gray-800/50 rounded p-2">
            <div className="grid grid-cols-2 gap-2">
              <div>Position: {Math.round(cropArea.x)}, {Math.round(cropArea.y)}</div>
              <div>Size: {Math.round(cropArea.width)} × {Math.round(cropArea.height)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Stream controls */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-300 mb-1">
              {isStreaming ? '🔴 Streaming to players' : 'Ready to stream'}
            </p>
            <p className="text-xs text-gray-500">
              {isStreaming ? 'Players can see the cropped area' : 'Select crop area and click Start to begin streaming'}
            </p>
          </div>
          
          {!isStreaming ? (
            <button
              onClick={startStreaming}
              disabled={!cropArea}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-semibold transition-all hover:scale-105 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Play className="w-5 h-5" />
              Start Stream to Players
            </button>
          ) : (
            <button
              onClick={stopStreaming}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-semibold transition-all hover:scale-105 flex items-center gap-2"
            >
              <Square className="w-5 h-5" />
              Stop Stream
            </button>
          )}
        </div>
      </div>

      {/* Hidden canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default ScreenShareCropper;
