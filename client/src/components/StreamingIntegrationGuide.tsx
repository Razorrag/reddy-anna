import React from 'react';
import GameStream from './GameStream';
import AdminStreamControl from './AdminStreamControl';
import PlayerStreamView from './PlayerStreamView';

/**
 * Streaming Integration Guide
 * 
 * This component demonstrates how to integrate the streaming components
 * to ensure admin screen sharing appears in the game area without redundancy.
 * 
 * Usage:
 * - For Admin Panel: Use <AdminStreamControl />
 * - For Game Area: Use <GameStream /> or <PlayerStreamView />
 * 
 * The components communicate via WebSocket events and custom events:
 * - 'stream_start': When admin starts streaming
 * - 'stream_stop': When admin stops streaming  
 * - 'stream_status_update': For stream status changes
 * - 'stream_control': For admin control commands
 * - 'webrtc:signal': For WebRTC signaling
 */

interface StreamingIntegrationGuideProps {
  role: 'admin' | 'player';
  className?: string;
}

const StreamingIntegrationGuide: React.FC<StreamingIntegrationGuideProps> = ({ 
  role, 
  className = '' 
}) => {
  return (
    <div className={`streaming-integration ${className}`}>
      {role === 'admin' && (
        <div className="admin-streaming-section">
          {/* Admin Stream Control Panel */}
          <AdminStreamControl className="w-full" />
          
          {/* Admin Instructions */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Admin Streaming Instructions</h3>
            <ul className="text-blue-800 space-y-1 text-sm">
              <li>• Click "Start Stream" to begin screen sharing</li>
              <li>• Choose WebRTC for real-time gameplay, HLS/RTMP for recordings</li>
              <li>• Stream automatically appears in player game areas</li>
              <li>• Use pause/resume buttons to control stream during gameplay</li>
              <li>• Monitor viewer count and stream quality in real-time</li>
            </ul>
          </div>
        </div>
      )}

      {role === 'player' && (
        <div className="player-streaming-section">
          {/* Player Game Stream */}
          <GameStream className="w-full h-64" />
          
          {/* Player Instructions */}
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-2">Player Streaming Experience</h3>
            <ul className="text-green-800 space-y-1 text-sm">
              <li>• Stream appears automatically when admin starts sharing</li>
              <li>• Use pause/play controls to manage your viewing experience</li>
              <li>• Switch between WebRTC, HLS, and RTMP streams for best quality</li>
              <li>• HD quality with minimal latency for real-time gameplay</li>
              <li>• Stream stays synchronized with game events</li>
            </ul>
          </div>
        </div>
      )}

      {/* Technical Integration Notes */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">Technical Integration</h4>
        <div className="text-sm text-gray-700 space-y-2">
          <div>
            <strong>WebSocket Events:</strong>
            <ul className="list-disc list-inside ml-4">
              <li><code>stream_start</code> - Admin begins screen sharing</li>
              <li><code>stream_stop</code> - Admin ends screen sharing</li>
              <li><code>stream_status_update</code> - Stream status/quality changes</li>
              <li><code>stream_control</code> - Admin control commands (pause/resume)</li>
              <li><code>webrtc:signal</code> - WebRTC offer/answer/ICE candidates</li>
            </ul>
          </div>
          
          <div>
            <strong>Custom Events:</strong>
            <ul className="list-disc list-inside ml-4">
              <li><code>stream_status_update</code> - Broadcast stream status to UI</li>
              <li><code>webrtc_offer_received</code> - WebRTC offer from admin</li>
              <li><code>webrtc_answer_received</code> - WebRTC answer to admin</li>
              <li><code>webrtc_ice_candidate_received</code> - ICE candidates</li>
            </ul>
          </div>
          
          <div>
            <strong>Key Features:</strong>
            <ul className="list-disc list-inside ml-4">
              <li>✅ No redundancy - single stream source for all players</li>
              <li>✅ Real-time WebRTC for low-latency gameplay</li>
              <li>✅ Fallback to HLS/RTMP for compatibility</li>
              <li>✅ Admin controls with pause/play functionality</li>
              <li>✅ Automatic stream quality adaptation</li>
              <li>✅ Synchronized with game state</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamingIntegrationGuide;

// Export individual components for direct use
export { GameStream, AdminStreamControl, PlayerStreamView };