import React, { useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';

const LiveStreamSimulation: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [viewerCount, setViewerCount] = useState(1247);

  // Simulate viewer count changes
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount(prev => prev + Math.floor(Math.random() * 21) - 10);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleFullscreen = () => {
    // Implement fullscreen functionality
    const elem = document.getElementById('live-stream');
    if (elem?.requestFullscreen) {
      elem.requestFullscreen();
    }
  };

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden" id="live-stream">
      {/* Video Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900">
        {/* Simulated video content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🎴</div>
            <div className="text-xl text-gray-400">Live Stream Simulation</div>
            <div className="text-sm text-gray-500 mt-2">Andar Bahar Game in Progress</div>
          </div>
        </div>
      </div>

      {/* Overlay Controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30">
        {/* Top overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 text-white text-xs px-2 py-1 rounded font-semibold flex items-center gap-1">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              LIVE
            </div>
            <div className="bg-black/60 text-white text-xs px-2 py-1 rounded">
              {viewerCount.toLocaleString()} viewers
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleMuteToggle}
              className="bg-black/60 text-white p-2 rounded hover:bg-black/80 transition-colors"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              onClick={handleFullscreen}
              className="bg-black/60 text-white p-2 rounded hover:bg-black/80 transition-colors"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center justify-center">
            <button
              onClick={handlePlayPause}
              className="bg-white/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/30 transition-colors"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 bg-white/20 rounded-full h-1">
            <div className="bg-white h-1 rounded-full w-1/3"></div>
          </div>
        </div>
      </div>

      {/* Quality indicator */}
      <div className="absolute top-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded">
        HD 1080p
      </div>
    </div>
  );
};

export default LiveStreamSimulation;
