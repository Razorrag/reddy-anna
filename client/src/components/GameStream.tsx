import React, { useState, useEffect } from 'react';
import PlayerStreamView from './PlayerStreamView';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useNotification } from '../contexts/NotificationContext';

interface GameStreamProps {
  className?: string;
  showControls?: boolean;
  autoPlay?: boolean;
}

const GameStream: React.FC<GameStreamProps> = ({ 
  className = '', 
  showControls = true,
  autoPlay = true 
}) => {
  const { sendWebSocketMessage } = useWebSocket();
  const { showNotification } = useNotification();
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [streamMethod, setStreamMethod] = useState<'webrtc' | 'hls' | 'rtmp'>('webrtc');
  const [streamUrl, setStreamUrl] = useState<string>('');

  // Handle stream status updates
  useEffect(() => {
    const handleStreamStatus = (event: any) => {
      const { status, method, url } = event.detail;
      console.log('GameStream received status:', status, method, url);
      
      if (status === 'online') {
        setIsStreamActive(true);
        if (method) setStreamMethod(method);
        if (url) setStreamUrl(url);
        showNotification('Game stream is now live!', 'success');
      } else if (status === 'offline') {
        setIsStreamActive(false);
        showNotification('Game stream has ended', 'info');
      }
    };

    window.addEventListener('stream_status_update', handleStreamStatus as EventListener);
    
    return () => {
      window.removeEventListener('stream_status_update', handleStreamStatus as EventListener);
    };
  }, [showNotification]);

  // Handle admin stream control commands
  useEffect(() => {
    const handleStreamControl = (event: any) => {
      const { action, data } = event.detail;
      console.log('GameStream control command:', action, data);
      
      switch (action) {
        case 'pause':
          setIsStreamActive(false);
          showNotification('Stream paused by admin', 'warning');
          break;
        case 'resume':
          setIsStreamActive(true);
          showNotification('Stream resumed by admin', 'success');
          break;
        case 'change_method':
          if (data?.method) {
            setStreamMethod(data.method);
            showNotification(`Stream method changed to ${data.method.toUpperCase()}`, 'info');
          }
          break;
      }
    };

    window.addEventListener('stream_control', handleStreamControl as EventListener);
    
    return () => {
      window.removeEventListener('stream_control', handleStreamControl as EventListener);
    };
  }, [showNotification]);

  const handleStreamToggle = () => {
    if (isStreamActive) {
      // Send pause command to admin
      sendWebSocketMessage({
        type: 'stream_status',
        data: {
          status: 'paused',
          method: streamMethod,
          message: 'Stream paused by admin'
        }
      });
      setIsStreamActive(false);
      showNotification('Stream paused', 'info');
    } else {
      // Send resume command to admin
      sendWebSocketMessage({
        type: 'stream_status',
        data: {
          status: 'online',
          method: streamMethod,
          message: 'Stream resumed by admin'
        }
      });
      setIsStreamActive(true);
      showNotification('Stream resumed', 'success');
    }
  };

  const handleMethodChange = (method: 'webrtc' | 'hls' | 'rtmp') => {
    setStreamMethod(method);
    sendWebSocketMessage({
      type: 'stream_status',
      data: {
        status: isStreamActive ? 'online' : 'offline',
        method: method,
        message: `Stream method changed to ${method.toUpperCase()}`
      }
    });
    showNotification(`Switching to ${method.toUpperCase()} stream...`, 'info');
  };

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Stream Content */}
      <div className="relative w-full h-full">
        {isStreamActive ? (
          <PlayerStreamView 
            className="w-full h-full"
            showControls={showControls}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <div className="text-center text-gray-400">
              <div className="text-6xl mb-4">🔴</div>
              <div className="text-xl font-semibold mb-2">Stream Offline</div>
              <div className="text-sm opacity-75">
                {autoPlay ? 'Waiting for admin to start streaming...' : 'Click play to start stream'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stream Controls Overlay */}
      {showControls && (
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          {/* Stream Method Selector */}
          <div className="flex space-x-2 bg-black bg-opacity-75 rounded-lg p-1">
            <button
              onClick={() => handleMethodChange('webrtc')}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                streamMethod === 'webrtc' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-300 hover:text-white'
              }`}
              title="WebRTC Stream"
            >
              WebRTC
            </button>
            <button
              onClick={() => handleMethodChange('hls')}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                streamMethod === 'hls' 
                  ? 'bg-green-500 text-white' 
                  : 'text-gray-300 hover:text-white'
              }`}
              title="HLS Stream"
            >
              HLS
            </button>
            <button
              onClick={() => handleMethodChange('rtmp')}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                streamMethod === 'rtmp' 
                  ? 'bg-red-500 text-white' 
                  : 'text-gray-300 hover:text-white'
              }`}
              title="RTMP Stream"
            >
              RTMP
            </button>
          </div>

          {/* Stream Toggle Button */}
          <button
            onClick={handleStreamToggle}
            className={`bg-black bg-opacity-75 text-white p-2 rounded-full hover:bg-opacity-90 transition-all ${
              isStreamActive ? 'animate-pulse' : ''
            }`}
            title={isStreamActive ? 'Pause Stream' : 'Resume Stream'}
          >
            {isStreamActive ? '⏸️' : '▶️'}
          </button>
        </div>
      )}

      {/* Stream Status Indicator */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm">
        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
          isStreamActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'
        }`}></span>
        {isStreamActive ? 'LIVE' : 'OFFLINE'}
      </div>

      {/* Stream Method Indicator */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
        {streamMethod.toUpperCase()} Stream
      </div>

      {/* Connection Quality Indicator */}
      {isStreamActive && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
          HD
        </div>
      )}
    </div>
  );
};

export default GameStream;