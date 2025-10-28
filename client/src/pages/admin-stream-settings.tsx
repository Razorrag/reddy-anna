/**
 * Admin Stream Settings Page
 * 
 * Dedicated page for stream configuration in admin dashboard
 * Provides both WebRTC and RTMP streaming options
 */

import React from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import StreamControlPanel from '../components/AdminGamePanel/StreamControlPanel';

export default function AdminStreamSettings() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => setLocation('/admin')}
            className="mb-4 px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-lg flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gold to-yellow-600 bg-clip-text text-transparent drop-shadow-lg mb-2">
            🎥 Stream Settings
          </h1>
          <p className="text-gray-400">Configure WebRTC screen sharing and RTMP streaming for players</p>
        </div>

        {/* Stream Control Panel */}
        <StreamControlPanel />

        {/* Additional Information */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* WebRTC Info */}
          <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-green-500/30 p-6">
            <h3 className="text-xl font-bold text-green-400 mb-4">🌐 WebRTC Screen Share</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div>
                <strong className="text-green-300">Best for:</strong>
                <p className="text-gray-400">Quick setup, real-time games, &lt;100 players</p>
              </div>
              <div>
                <strong className="text-green-300">Latency:</strong>
                <p className="text-gray-400">&lt;1 second - Perfect for card games</p>
              </div>
              <div>
                <strong className="text-green-300">Setup:</strong>
                <p className="text-gray-400">One click - No external software needed</p>
              </div>
              <div>
                <strong className="text-green-300">How it works:</strong>
                <ul className="list-disc list-inside text-gray-400 mt-2 space-y-1">
                  <li>Click "Start Screen Share"</li>
                  <li>Select screen/window to share</li>
                  <li>Stream broadcasts to all players</li>
                  <li>Players see in real-time</li>
                </ul>
              </div>
            </div>
          </div>

          {/* RTMP Info */}
          <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-blue-500/30 p-6">
            <h3 className="text-xl font-bold text-blue-400 mb-4">📡 RTMP Streaming</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div>
                <strong className="text-blue-300">Best for:</strong>
                <p className="text-gray-400">Professional quality, 100+ players, scalability</p>
              </div>
              <div>
                <strong className="text-blue-300">Latency:</strong>
                <p className="text-gray-400">3-10 seconds - Professional streaming</p>
              </div>
              <div>
                <strong className="text-blue-300">Setup:</strong>
                <p className="text-gray-400">Requires OBS Studio or streaming software</p>
              </div>
              <div>
                <strong className="text-blue-300">How it works:</strong>
                <ul className="list-disc list-inside text-gray-400 mt-2 space-y-1">
                  <li>Open OBS Studio</li>
                  <li>Configure stream to Restream/YouTube</li>
                  <li>Copy RTMP URL</li>
                  <li>Paste URL and click "Start RTMP Stream"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="mt-6 bg-gradient-to-r from-gold/20 to-yellow-600/20 border border-gold/30 rounded-xl p-6">
          <h3 className="text-xl font-bold text-gold mb-4">💡 Quick Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <strong className="text-gold">For Testing:</strong>
              <p className="text-gray-400">Use WebRTC screen share - fastest setup</p>
            </div>
            <div>
              <strong className="text-gold">For Production:</strong>
              <p className="text-gray-400">Use RTMP with OBS - better quality and scalability</p>
            </div>
            <div>
              <strong className="text-gold">Resolution:</strong>
              <p className="text-gray-400">Use 1920x1080 (1080p) for best quality</p>
            </div>
            <div>
              <strong className="text-gold">Internet:</strong>
              <p className="text-gray-400">Ensure stable connection (5+ Mbps upload)</p>
            </div>
          </div>
        </div>

        {/* OBS Setup Guide */}
        <div className="mt-6 bg-black/40 backdrop-blur-sm rounded-xl border border-purple-500/30 p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-4">🎬 OBS Studio Setup (for RTMP)</h3>
          <div className="space-y-4 text-sm text-gray-300">
            <div>
              <strong className="text-purple-300">Step 1:</strong>
              <p className="text-gray-400">Download OBS Studio from <a href="https://obsproject.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">obsproject.com</a></p>
            </div>
            <div>
              <strong className="text-purple-300">Step 2:</strong>
              <p className="text-gray-400">Create account on <a href="https://restream.io" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Restream.io</a> (free)</p>
            </div>
            <div>
              <strong className="text-purple-300">Step 3:</strong>
              <p className="text-gray-400">In OBS, go to Settings → Stream</p>
            </div>
            <div>
              <strong className="text-purple-300">Step 4:</strong>
              <p className="text-gray-400">Select "Custom" and enter Restream RTMP URL and Stream Key</p>
            </div>
            <div>
              <strong className="text-purple-300">Step 5:</strong>
              <p className="text-gray-400">Add "Display Capture" source in OBS</p>
            </div>
            <div>
              <strong className="text-purple-300">Step 6:</strong>
              <p className="text-gray-400">Click "Start Streaming" in OBS</p>
            </div>
            <div>
              <strong className="text-purple-300">Step 7:</strong>
              <p className="text-gray-400">Copy your Restream player URL and paste it above</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
