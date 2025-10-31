import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Video, Gamepad2, Eye, Save, RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Card options for dropdown
const CARD_OPTIONS = [
  { value: 'A♠', label: 'A♠ (Ace of Spades)' },
  { value: 'K♠', label: 'K♠ (King of Spades)' },
  { value: 'Q♠', label: 'Q♠ (Queen of Spades)' },
  { value: 'J♠', label: 'J♠ (Jack of Spades)' },
  { value: '10♠', label: '10♠ (Ten of Spades)' },
  { value: '9♠', label: '9♠ (Nine of Spades)' },
  { value: '8♠', label: '8♠ (Eight of Spades)' },
  { value: '7♠', label: '7♠ (Seven of Spades)' },
  { value: '6♠', label: '6♠ (Six of Spades)' },
  { value: '5♠', label: '5♠ (Five of Spades)' },
  { value: '4♠', label: '4♠ (Four of Spades)' },
  { value: '3♠', label: '3♠ (Three of Spades)' },
  { value: '2♠', label: '2♠ (Two of Spades)' },
  { value: 'A♥', label: 'A♥ (Ace of Hearts)' },
  { value: 'K♥', label: 'K♥ (King of Hearts)' },
  { value: 'Q♥', label: 'Q♥ (Queen of Hearts)' },
  { value: 'J♥', label: 'J♥ (Jack of Hearts)' },
  { value: '10♥', label: '10♥ (Ten of Hearts)' },
  { value: '9♥', label: '9♥ (Nine of Hearts)' },
  { value: '8♥', label: '8♥ (Eight of Hearts)' },
  { value: '7♥', label: '7♥ (Seven of Hearts)' },
  { value: '6♥', label: '6♥ (Six of Hearts)' },
  { value: '5♥', label: '5♥ (Five of Hearts)' },
  { value: '4♥', label: '4♥ (Four of Hearts)' },
  { value: '3♥', label: '3♥ (Three of Hearts)' },
  { value: '2♥', label: '2♥ (Two of Hearts)' },
  { value: 'A♦', label: 'A♦ (Ace of Diamonds)' },
  { value: 'K♦', label: 'K♦ (King of Diamonds)' },
  { value: 'Q♦', label: 'Q♦ (Queen of Diamonds)' },
  { value: 'J♦', label: 'J♦ (Jack of Diamonds)' },
  { value: '10♦', label: '10♦ (Ten of Diamonds)' },
  { value: '9♦', label: '9♦ (Nine of Diamonds)' },
  { value: '8♦', label: '8♦ (Eight of Diamonds)' },
  { value: '7♦', label: '7♦ (Seven of Diamonds)' },
  { value: '6♦', label: '6♦ (Six of Diamonds)' },
  { value: '5♦', label: '5♦ (Five of Diamonds)' },
  { value: '4♦', label: '4♦ (Four of Diamonds)' },
  { value: '3♦', label: '3♦ (Three of Diamonds)' },
  { value: '2♦', label: '2♦ (Two of Diamonds)' },
  { value: 'A♣', label: 'A♣ (Ace of Clubs)' },
  { value: 'K♣', label: 'K♣ (King of Clubs)' },
  { value: 'Q♣', label: 'Q♣ (Queen of Clubs)' },
  { value: 'J♣', label: 'J♣ (Jack of Clubs)' },
  { value: '10♣', label: '10♣ (Ten of Clubs)' },
  { value: '9♣', label: '9♣ (Nine of Clubs)' },
  { value: '8♣', label: '8♣ (Eight of Clubs)' },
  { value: '7♣', label: '7♣ (Seven of Clubs)' },
  { value: '6♣', label: '6♣ (Six of Clubs)' },
  { value: '5♣', label: '5♣ (Five of Clubs)' },
  { value: '4♣', label: '4♣ (Four of Clubs)' },
  { value: '3♣', label: '3♣ (Three of Clubs)' },
  { value: '2♣', label: '2♣ (Two of Clubs)' },
];

const BackendSettings: React.FC = () => {
  const { toast } = useToast();
  
  // Game Settings State
  const [gameSettings, setGameSettings] = useState({
    settingsMaxBetAmount: 100000,
    settingsMinBetAmount: 1000,
    gameTimer: 30,
    openingCard: 'A♠'
  });

  // Stream Settings State
  const [streamSettings, setStreamSettings] = useState({
    // RTMP Configuration for OBS
    rtmpServerUrl: 'rtmp://localhost:1936/live',
    streamKey: '',
    rtmpBackupUrl: 'rtmp://localhost:1936/backup',
    
    // HLS/Web Playback URLs
    primaryStreamUrl: 'http://localhost:8001/live/stream.m3u8',
    backupStreamUrl: 'http://localhost:8001/backup/stream.m3u8',
    
    // Stream Display Settings
    streamTitle: 'Andar Bahar Live',
    streamStatus: 'offline',
    streamDescription: 'Live Andar Bahar game with real dealers',
    streamQuality: '1080p',
    streamDelay: 5,
    
    // Stream Configuration
    streamEmbedCode: '',
    obsSceneName: 'Main Game',
    obsSourceName: 'Game Camera',
    
    // Connection Status
    isStreamConnected: false,
    connectionHealth: 'unknown'
  });

  // Loading states
  const [savingGame, setSavingGame] = useState(false);
  const [savingStream, setSavingStream] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load game settings
      const gameResponse = await fetch('/api/game/settings');
      if (gameResponse.ok) {
        const gameData = await gameResponse.json();
        setGameSettings(prev => ({ ...prev, ...gameData }));
      }

      // Load stream settings
      const streamResponse = await fetch('/api/game/stream-settings');
      if (streamResponse.ok) {
        const streamData = await streamResponse.json();
        setStreamSettings(prev => ({ ...prev, ...streamData }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveGameSettings = async () => {
    setSavingGame(true);
    try {
      const response = await fetch('/api/game/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gameSettings),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Game settings saved successfully!",
        });
      } else {
        throw new Error('Failed to save game settings');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save game settings",
        variant: "destructive",
      });
    } finally {
      setSavingGame(false);
    }
  };

  const saveStreamSettings = async () => {
    setSavingStream(true);
    try {
      const response = await fetch('/api/game/stream-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(streamSettings),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Stream settings saved successfully!",
        });
      } else {
        throw new Error('Failed to save stream settings');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save stream settings",
        variant: "destructive",
      });
    } finally {
      setSavingStream(false);
    }
  };

  const testStreamConnection = async () => {
    setTestingConnection(true);
    try {
      const response = await fetch('/api/game/test-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rtmpUrl: streamSettings.rtmpServerUrl,
          streamKey: streamSettings.streamKey,
          playbackUrl: streamSettings.primaryStreamUrl
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setStreamSettings(prev => ({
          ...prev,
          isStreamConnected: result.connected,
          connectionHealth: result.health
        }));
        
        toast({
          title: "Connection Test",
          description: result.connected ? "Stream connection successful!" : "Stream connection failed",
          variant: result.connected ? "default" : "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Test Failed",
        description: "Unable to test stream connection",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'maintenance': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getConnectionIcon = (health: string) => {
    switch (health) {
      case 'excellent': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'good': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'poor': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-purple-900/20 to-red-900/20 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gold mb-2 flex items-center gap-3">
            <Settings className="w-10 h-10" />
            Backend Settings
          </h1>
          <p className="text-white/80">Configure game settings and live stream management</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Game Settings Form */}
          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-gold flex items-center gap-2">
                <Gamepad2 className="w-5 h-5" />
                Game Settings
              </CardTitle>
              <CardDescription className="text-white/80">
                Configure game parameters and betting limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxBet" className="text-white">Max Bet Amount (₹)</Label>
                  <Input
                    id="maxBet"
                    type="number"
                    value={gameSettings.settingsMaxBetAmount}
                    onChange={(e) => setGameSettings(prev => ({ 
                      ...prev, 
                      settingsMaxBetAmount: parseInt(e.target.value) || 0 
                    }))}
                    className="bg-black/30 border-gold/30 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="minBet" className="text-white">Min Bet Amount (₹)</Label>
                  <Input
                    id="minBet"
                    type="number"
                    value={gameSettings.settingsMinBetAmount}
                    onChange={(e) => setGameSettings(prev => ({ 
                      ...prev, 
                      settingsMinBetAmount: parseInt(e.target.value) || 0 
                    }))}
                    className="bg-black/30 border-gold/30 text-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="gameTimer" className="text-white">Game Timer (seconds)</Label>
                <Input
                  id="gameTimer"
                  type="number"
                  value={gameSettings.gameTimer}
                  onChange={(e) => setGameSettings(prev => ({ 
                    ...prev, 
                    gameTimer: parseInt(e.target.value) || 30 
                  }))}
                  className="bg-black/30 border-gold/30 text-white"
                />
              </div>

              <div>
                <Label htmlFor="openingCard" className="text-white">Opening Card</Label>
                <Select
                  value={gameSettings.openingCard}
                  onValueChange={(value) => setGameSettings(prev => ({ ...prev, openingCard: value }))}
                >
                  <SelectTrigger className="bg-black/30 border-gold/30 text-white">
                    <SelectValue placeholder="Select opening card" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-gold/30">
                    {CARD_OPTIONS.map((card) => (
                      <SelectItem key={card.value} value={card.value} className="text-white">
                        {card.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={saveGameSettings}
                disabled={savingGame}
                className="w-full bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-gold-light hover:to-yellow-500"
              >
                {savingGame ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Game Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Live Stream Management Form */}
          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-gold flex items-center gap-2">
                <Video className="w-5 h-5" />
                Live Stream Management
              </CardTitle>
              <CardDescription className="text-white/80">
                Configure OBS Studio and stream settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* RTMP Configuration for OBS */}
              <div className="space-y-4">
                <h3 className="text-gold font-semibold text-lg">OBS Studio Configuration</h3>
                
                <div>
                  <Label htmlFor="rtmpServerUrl" className="text-white">RTMP Server URL</Label>
                  <Input
                    id="rtmpServerUrl"
                    value={streamSettings.rtmpServerUrl}
                    onChange={(e) => setStreamSettings(prev => ({ ...prev, rtmpServerUrl: e.target.value }))}
                    placeholder="rtmp://localhost:1936/live"
                    className="bg-black/30 border-gold/30 text-white font-mono text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="streamKey" className="text-white">Stream Key</Label>
                  <Input
                    id="streamKey"
                    value={streamSettings.streamKey}
                    onChange={(e) => setStreamSettings(prev => ({ ...prev, streamKey: e.target.value }))}
                    placeholder="your-stream-key-here"
                    className="bg-black/30 border-gold/30 text-white font-mono text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="rtmpBackupUrl" className="text-white">Backup RTMP URL</Label>
                  <Input
                    id="rtmpBackupUrl"
                    value={streamSettings.rtmpBackupUrl}
                    onChange={(e) => setStreamSettings(prev => ({ ...prev, rtmpBackupUrl: e.target.value }))}
                    placeholder="rtmp://localhost:1936/backup"
                    className="bg-black/30 border-gold/30 text-white font-mono text-sm"
                  />
                </div>
              </div>

              {/* HLS/Web Playback URLs */}
              <div className="space-y-4">
                <h3 className="text-gold font-semibold text-lg">Playback URLs</h3>
                
                <div>
                  <Label htmlFor="primaryStreamUrl" className="text-white">Primary Stream URL (HLS)</Label>
                  <Input
                    id="primaryStreamUrl"
                    value={streamSettings.primaryStreamUrl}
                    onChange={(e) => setStreamSettings(prev => ({ ...prev, primaryStreamUrl: e.target.value }))}
                    placeholder="http://localhost:8001/live/stream.m3u8"
                    className="bg-black/30 border-gold/30 text-white font-mono text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="backupStreamUrl" className="text-white">Backup Stream URL (HLS)</Label>
                  <Input
                    id="backupStreamUrl"
                    value={streamSettings.backupStreamUrl}
                    onChange={(e) => setStreamSettings(prev => ({ ...prev, backupStreamUrl: e.target.value }))}
                    placeholder="http://localhost:8001/backup/stream.m3u8"
                    className="bg-black/30 border-gold/30 text-white font-mono text-sm"
                  />
                </div>
              </div>

              {/* Stream Display Settings */}
              <div className="space-y-4">
                <h3 className="text-gold font-semibold text-lg">Stream Display Settings</h3>
                
                <div>
                  <Label htmlFor="streamTitle" className="text-white">Stream Title</Label>
                  <Input
                    id="streamTitle"
                    value={streamSettings.streamTitle}
                    onChange={(e) => setStreamSettings(prev => ({ ...prev, streamTitle: e.target.value }))}
                    className="bg-black/30 border-gold/30 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="streamStatus" className="text-white">Stream Status</Label>
                    <Select
                      value={streamSettings.streamStatus}
                      onValueChange={(value) => setStreamSettings(prev => ({ ...prev, streamStatus: value }))}
                    >
                      <SelectTrigger className="bg-black/30 border-gold/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-gold/30">
                        <SelectItem value="live" className="text-white">Live</SelectItem>
                        <SelectItem value="offline" className="text-white">Offline</SelectItem>
                        <SelectItem value="maintenance" className="text-white">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="streamQuality" className="text-white">Stream Quality</Label>
                    <Select
                      value={streamSettings.streamQuality}
                      onValueChange={(value) => setStreamSettings(prev => ({ ...prev, streamQuality: value }))}
                    >
                      <SelectTrigger className="bg-black/30 border-gold/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-gold/30">
                        <SelectItem value="480p" className="text-white">480p SD</SelectItem>
                        <SelectItem value="720p" className="text-white">720p HD</SelectItem>
                        <SelectItem value="1080p" className="text-white">1080p Full HD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="streamDescription" className="text-white">Stream Description</Label>
                  <Textarea
                    id="streamDescription"
                    value={streamSettings.streamDescription}
                    onChange={(e) => setStreamSettings(prev => ({ ...prev, streamDescription: e.target.value }))}
                    className="bg-black/30 border-gold/30 text-white min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="streamDelay" className="text-white">Stream Delay (seconds)</Label>
                    <Input
                      id="streamDelay"
                      type="number"
                      value={streamSettings.streamDelay}
                      onChange={(e) => setStreamSettings(prev => ({ 
                        ...prev, 
                        streamDelay: parseInt(e.target.value) || 0 
                      }))}
                      className="bg-black/30 border-gold/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="obsSceneName" className="text-white">OBS Scene Name</Label>
                    <Input
                      id="obsSceneName"
                      value={streamSettings.obsSceneName}
                      onChange={(e) => setStreamSettings(prev => ({ ...prev, obsSceneName: e.target.value }))}
                      placeholder="Main Game"
                      className="bg-black/30 border-gold/30 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="streamEmbedCode" className="text-white">Embed Code (HTML/PHP)</Label>
                  <Textarea
                    id="streamEmbedCode"
                    value={streamSettings.streamEmbedCode}
                    onChange={(e) => setStreamSettings(prev => ({ ...prev, streamEmbedCode: e.target.value }))}
                    placeholder="<iframe src='...' width='640' height='360'></iframe>"
                    className="bg-black/30 border-gold/30 text-white min-h-[100px] font-mono text-sm"
                  />
                </div>
              </div>

              {/* Connection Test */}
              <div className="space-y-4">
                <h3 className="text-gold font-semibold text-lg">Connection Status</h3>
                
                <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getConnectionIcon(streamSettings.connectionHealth)}
                    <div>
                      <p className="text-white font-medium">Stream Connection</p>
                      <p className="text-white/60 text-sm">
                        {streamSettings.isStreamConnected ? 'Connected' : 'Disconnected'} • {streamSettings.connectionHealth}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={testStreamConnection}
                    disabled={testingConnection}
                    variant="outline"
                    className="border-gold/30 text-gold hover:bg-gold/10"
                  >
                    {testingConnection ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                onClick={saveStreamSettings}
                disabled={savingStream}
                className="w-full bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-gold-light hover:to-yellow-500"
              >
                {savingStream ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Stream Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Stream Preview Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Stream Preview */}
          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-gold flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Stream Preview
              </CardTitle>
              <CardDescription className="text-white/80">
                Preview of the primary HLS stream
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                {streamSettings.primaryStreamUrl ? (
                  <video
                    controls
                    className="w-full h-full"
                    src={streamSettings.primaryStreamUrl}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Video className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">No stream URL configured</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(streamSettings.streamStatus)}`} />
                <span className="text-white capitalize">{streamSettings.streamStatus}</span>
                <span className="text-gray-400">• {streamSettings.streamQuality}</span>
              </div>
            </CardContent>
          </Card>

          {/* OBS Configuration Guide */}
          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-gold flex items-center gap-2">
                <Settings className="w-5 h-5" />
                OBS Studio Setup Guide
              </CardTitle>
              <CardDescription className="text-white/80">
                Step-by-step OBS configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-black/30 p-4 rounded-lg">
                <h4 className="text-gold font-semibold mb-2">1. Open OBS Studio</h4>
                <p className="text-white/60 text-sm">Launch OBS and go to Settings → Stream</p>
              </div>
              
              <div className="bg-black/30 p-4 rounded-lg">
                <h4 className="text-gold font-semibold mb-2">2. Configure Stream Settings</h4>
                <p className="text-white/60 text-sm">Service: Custom</p>
                <p className="text-white/60 text-sm">Server: {streamSettings.rtmpServerUrl}</p>
                <p className="text-white/60 text-sm">Stream Key: {streamSettings.streamKey || 'Set your stream key above'}</p>
              </div>
              
              <div className="bg-black/30 p-4 rounded-lg">
                <h4 className="text-gold font-semibold mb-2">3. Set Output Settings</h4>
                <p className="text-white/60 text-sm">Video Bitrate: 2500-6000 Kbps</p>
                <p className="text-white/60 text-sm">Audio Bitrate: 128 Kbps</p>
                <p className="text-white/60 text-sm">Encoder: x264 or NVENC</p>
              </div>
              
              <div className="bg-black/30 p-4 rounded-lg">
                <h4 className="text-gold font-semibold mb-2">4. Start Streaming</h4>
                <p className="text-white/60 text-sm">Click "Start Streaming" in OBS</p>
                <p className="text-white/60 text-sm">Monitor connection status above</p>
              </div>

              <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-lg">
                <h4 className="text-green-400 font-semibold mb-2">✅ Configuration Complete!</h4>
                <p className="text-white/60 text-sm">
                  Your OBS stream will be available at: {streamSettings.primaryStreamUrl}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BackendSettings;
