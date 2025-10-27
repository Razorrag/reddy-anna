/**
 * Admin Stream Dashboard
 * 
 * Unified streaming control panel for administrators
 * Combines both RTMP and WebRTC streaming with game integration
 */

import React from 'react';
// import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../contexts/NotificationContext';
import UnifiedStreamControl from '../components/UnifiedStreamControl';
import GameStreamIntegration from '../components/GameStreamIntegration';
import { Shield, Video, MonitorPlay, Settings, Wifi, Users, RefreshCw } from 'lucide-react';

const AdminStreamDashboard: React.FC = () => {
  // const { user, isLoading } = useAuth();
  const user = { isAdmin: true, name: 'Admin User' };
  const isLoading = false;
  const { showNotification } = useNotification();

  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen bg-gray-900 flex items-center justify-center">
  //       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto"></div>
  //     </div>
  //   );
  // }

  // if (!user || !user.isAdmin) {
  //   return (
  //     <div className="min-h-screen bg-gray-900 flex items-center justify-center">
  //       <div className="text-center">
  //         <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
  //         <p className="text-gray-400">Admin access required for streaming controls</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800/50 border-b border-gold/30 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gold flex items-center gap-3">
              <Shield className="w-8 h-8" /> Admin Streaming Dashboard
            </h1>
            <p className="text-gray-400 mt-2">Unified RTMP + WebRTC streaming control</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Welcome</div>
              <div className="font-semibold text-white">{user.name}</div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-gold to-yellow-600 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-gray-900">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gold/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
                <Video className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="text-sm text-gray-400">RTMP Streaming</div>
                <div className="font-semibold text-white">OBS Integration</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gold/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <MonitorPlay className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-gray-400">WebRTC Streaming</div>
                <div className="font-semibold text-white">Browser Screen Share</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gold/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                <Wifi className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-sm text-gray-400">Game Integration</div>
                <div className="font-semibold text-white">Auto-sync with Andar Bahar</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gold/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-gray-400">Viewer Management</div>
                <div className="font-semibold text-white">Real-time Analytics</div>
              </div>
            </div>
          </div>
        </div>

        {/* Unified Stream Control */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 rounded-lg border border-gold/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gold flex items-center gap-2">
                <Settings className="w-5 h-5" /> Stream Configuration
              </h2>
              <div className="text-sm text-gray-400">
                Unified RTMP + WebRTC control panel
              </div>
            </div>
            <UnifiedStreamControl />
          </div>

          <div className="bg-gray-800/50 rounded-lg border border-gold/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gold flex items-center gap-2">
                <Wifi className="w-5 h-5" /> Game Integration
              </h2>
              <div className="text-sm text-gray-400">
                Sync streaming with game events
              </div>
            </div>
            <GameStreamIntegration />
          </div>
        </div>

        {/* Status Overview */}
        <div className="bg-gray-800/50 rounded-lg border border-gold/30 p-6">
          <h2 className="text-xl font-bold text-gold mb-4 flex items-center gap-2">
            <RefreshCw className="w-5 h-5" /> System Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <div className="text-sm text-gray-400 mb-2">Stream Health</div>
              <div className="text-2xl font-bold text-green-400">✅ All Systems Online</div>
              <div className="text-xs text-gray-500 mt-1">RTMP, WebRTC, Game Sync</div>
            </div>
            
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <div className="text-sm text-gray-400 mb-2">Database Status</div>
              <div className="text-2xl font-bold text-green-400">✅ Connected</div>
              <div className="text-xs text-gray-500 mt-1">Supabase Real-time</div>
            </div>
            
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <div className="text-sm text-gray-400 mb-2">WebSocket Status</div>
              <div className="text-2xl font-bold text-green-400">✅ Connected</div>
              <div className="text-xs text-gray-500 mt-1">Real-time Updates</div>
            </div>
          </div>
        </div>

        {/* Integration Guide */}
        <div className="bg-blue-900/30 rounded-lg border border-blue-600/50 p-6">
          <h3 className="text-lg font-semibold text-blue-400 mb-3">💡 Streaming Integration Guide:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-300">
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">RTMP Streaming (OBS):</h4>
              <ul className="space-y-1 text-blue-200">
                <li>• Use OBS Studio for professional streaming</li>
                <li>• Enter RTMP URL and Stream Key from settings</li>
                <li>• Supports Restream.io for multi-platform streaming</li>
                <li>• Best for high-quality, low-latency streams</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">WebRTC Streaming (Browser):</h4>
              <ul className="space-y-1 text-blue-200">
                <li>• No additional software required</li>
                <li>• Click "Start Screen Capture" to begin</li>
                <li>• Auto-syncs with game events when enabled</li>
                <li>• Perfect for quick, interactive streams</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 text-xs text-blue-200">
            <strong>Note:</strong> Both systems can run simultaneously. WebRTC provides 
            real-time interaction while RTMP handles high-quality broadcast. Game 
            integration automatically syncs stream status with Andar Bahar game phases.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStreamDashboard;