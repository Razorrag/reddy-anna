/**
 * WebRTC Client Implementation
 * 
 * Handles WebRTC peer connections for screen sharing between admin and players
 * Integrates with the unified streaming system and game state
 */

interface WebRTCConfig {
  resolution: string;
  fps: number;
  bitrate: number;
  audioEnabled: boolean;
  screenSource: 'screen' | 'window' | 'tab';
}

interface WebRTCConnection {
  peerConnection: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  stream: MediaStream | null;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export class WebRTCClient {
  private config: WebRTCConfig;
  private connection: WebRTCConnection | null = null;
  private signalingSocket: WebSocket | null = null;
  private localStream: MediaStream | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private streamId: string | null = null;

  constructor(config: Partial<WebRTCConfig> = {}) {
    this.config = {
      resolution: config.resolution || '720p',
      fps: config.fps || 30,
      bitrate: config.bitrate || 2500,
      audioEnabled: config.audioEnabled ?? true,
      screenSource: config.screenSource || 'screen'
    };
  }

  /**
   * Initialize WebRTC connection
   */
  async initialize(streamId?: string): Promise<void> {
    try {
      this.streamId = streamId || `stream-${Date.now()}`;
      
      // Create peer connection
      this.connection = {
        peerConnection: this.createPeerConnection(),
        dataChannel: null,
        stream: null,
        status: 'connecting'
      };

      this.emit('status_change', 'connecting');
      
      console.log('✅ WebRTC client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize WebRTC client:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Start screen capture and create offer
   */
  async startCapture(): Promise<void> {
    if (!this.connection) {
      throw new Error('WebRTC client not initialized');
    }

    try {
      // Get display media stream
      const constraints: any = {
        video: {
          width: this.getResolutionWidth(),
          height: this.getResolutionHeight(),
          frameRate: this.config.fps,
          cursor: 'always'
        },
        audio: this.config.audioEnabled ? { echoCancellation: true } : false
      };

      this.localStream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        this.connection?.peerConnection.addTrack(track, this.localStream!);
      });

      this.connection.stream = this.localStream;
      
      // Create and send offer
      const offer = await this.connection.peerConnection.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      });

      await this.connection.peerConnection.setLocalDescription(offer);

      this.emit('screen_captured', this.localStream);
      console.log('✅ Screen capture started');
      
    } catch (error) {
      console.error('❌ Failed to start screen capture:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop screen capture
   */
  stopCapture(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.connection) {
      this.connection.peerConnection.close();
      this.connection = null;
    }
    
    this.emit('screen_stopped');
    console.log('🛑 Screen capture stopped');
  }

  /**
   * Create WebRTC offer
   */
  /**
   * Create WebRTC offer
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.connection) {
      throw new Error('WebRTC client not initialized');
    }

    const offer = await this.connection.peerConnection.createOffer();
    await this.connection.peerConnection.setLocalDescription(offer);
    
    return offer;
  }

  /**
   * Handle WebRTC answer from player
   */
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.connection) {
      throw new Error('WebRTC client not initialized');
    }

    try {
      await this.connection.peerConnection.setRemoteDescription(answer);
      this.connection.status = 'connected';
      
      this.emit('connected');
      console.log('✅ WebRTC connection established with answer');
    } catch (error) {
      console.error('❌ Failed to handle WebRTC answer:', error);
      this.emit('error', error);
    }
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.connection) {
      throw new Error('WebRTC client not initialized');
    }

    try {
      await this.connection.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('❌ Failed to add ICE candidate:', error);
      this.emit('error', error);
    }
  }

  /**
   * Create ICE candidate
   */
  onIceCandidate(callback: (candidate: RTCIceCandidate) => void): void {
    if (this.connection) {
      this.connection.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 ICE candidate generated:', event.candidate);
          callback(event.candidate);
        }
      };
    }
  }

  /**
   * Handle connection state changes
   */
  onConnectionStateChange(callback: (state: string) => void): void {
    if (this.connection) {
      this.connection.peerConnection.onconnectionstatechange = () => {
        const state = this.connection?.peerConnection.connectionState || 'disconnected';
        callback(state);
        this.emit('status_change', state);
      };
    }
  }

  /**
   * Send signaling message through WebSocket
   */
  sendSignalingMessage(type: string, data: any): void {
    if (this.signalingSocket && this.signalingSocket.readyState === WebSocket.OPEN) {
      this.signalingSocket.send(JSON.stringify({
        type: 'webrtc:signal',
        data: {
          type,
          streamId: this.streamId,
          ...data
        }
      }));
    }
  }

  /**
   * Connect to signaling server
   */
  connectToSignalingServer(url: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.signalingSocket = new WebSocket(`${url}?token=${token}`);
        
        this.signalingSocket.onopen = () => {
          console.log('✅ Connected to WebRTC signaling server');
          this.emit('signaling_connected');
          resolve();
        };
        
        this.signalingSocket.onmessage = (event) => {
          this.handleSignalingMessage(event.data);
        };
        
        this.signalingSocket.onclose = () => {
          console.log('⚠️ WebRTC signaling connection closed');
          this.emit('signaling_disconnected');
        };
        
        this.signalingSocket.onerror = (error) => {
          console.error('❌ WebRTC signaling error:', error);
          this.emit('signaling_error', error);
          reject(error);
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming signaling messages
   */
  private handleSignalingMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'webrtc:signal') {
        const { type, from, streamId, sdp, candidate } = message.data;
        
        switch (type) {
          case 'offer':
            this.emit('offer_received', { from, streamId, sdp });
            break;
          case 'answer':
            this.handleAnswer(sdp);
            break;
          case 'ice-candidate':
            this.addIceCandidate(candidate);
            break;
          case 'stream-start':
            this.emit('stream_started', { from, streamId });
            break;
          case 'stream-stop':
            this.emit('stream_stopped', { from, streamId });
            break;
        }
      }
    } catch (error) {
      console.error('❌ Failed to handle signaling message:', error);
      this.emit('error', error);
    }
  }

  /**
   * Create RTCPeerConnection with optimal configuration
   */
  private createPeerConnection(): RTCPeerConnection {
    const config: RTCConfiguration = {
      iceServers: [
        {
          urls: [
            'stun:stun.l.google.com:19302',
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302'
          ]
        }
      ],
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };

    const peerConnection = new RTCPeerConnection(config);

    // Handle track events
    peerConnection.ontrack = (event) => {
      console.log('📺 Received remote track:', event.track.kind);
      this.emit('remote_track', event.track);
    };

    // Handle data channel
    peerConnection.ondatachannel = (event) => {
      this.connection!.dataChannel = event.channel;
      this.setupDataChannel(event.channel);
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log('🔌 WebRTC connection state:', state);
      this.emit('status_change', state);
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      console.log('🧊 ICE connection state:', state);
    };

    return peerConnection;
  }

  /**
   * Setup data channel for additional communication
   */
  private setupDataChannel(channel: RTCDataChannel): void {
    channel.onopen = () => {
      console.log('✅ Data channel opened');
      this.emit('data_channel_opened');
    };

    channel.onmessage = (event) => {
      this.emit('data_message', event.data);
    };

    channel.onclose = () => {
      console.log('⚠️ Data channel closed');
      this.emit('data_channel_closed');
    };
  }

  /**
   * Get resolution width based on config
   */
  private getResolutionWidth(): number {
    switch (this.config.resolution) {
      case '480p': return 854;
      case '720p': return 1280;
      case '1080p': return 1920;
      default: return 1280;
    }
  }

  /**
   * Get resolution height based on config
   */
  private getResolutionHeight(): number {
    switch (this.config.resolution) {
      case '480p': return 480;
      case '720p': return 720;
      case '1080p': return 1080;
      default: return 720;
    }
  }

  /**
   * Event system
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): string {
    return this.connection?.status || 'disconnected';
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get stream ID
   */
  getStreamId(): string | null {
    return this.streamId;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopCapture();
    
    if (this.signalingSocket) {
      this.signalingSocket.close();
      this.signalingSocket = null;
    }
    
    this.eventListeners.clear();
    
    console.log('🧹 WebRTC client destroyed');
  }
}

// Export singleton instance
export const webrtcClient = new WebRTCClient();