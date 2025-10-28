import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface WebSocketStatusProps {
  connected: boolean;
}

export const WebSocketStatus: React.FC<WebSocketStatusProps> = ({ connected }) => {
  return (
    <div className={`websocket-status flex items-center gap-2 ${connected ? 'text-green-600' : 'text-red-600'}`}>
      {connected ? (
        <Wifi className="h-4 w-4 animate-pulse" />
      ) : (
        <WifiOff className="h-4 w-4" />
      )}
      <span className="text-sm font-medium">
        {connected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
};