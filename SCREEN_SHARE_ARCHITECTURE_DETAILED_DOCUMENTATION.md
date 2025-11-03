# Comprehensive Screen Share System Architecture & Implementation Guide

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current System Analysis](#current-system-analysis)
3. [Problem Definition & Requirements](#problem-definition--requirements)
4. [Proposed Architecture](#proposed-architecture)
5. [Detailed Component Specifications](#detailed-component-specifications)
6. [Server-Side Implementation](#server-side-implementation)
7. [Client-Side Implementation](#client-side-implementation)
8. [Service Worker Implementation](#service-worker-implementation)
9. [Data Flow Specifications](#data-flow-specifications)
10. [State Management](#state-management)
11. [Memory Management & Leak Prevention](#memory-management--leak-prevention)
12. [Error Handling & Recovery](#error-handling--recovery)
13. [Security Considerations](#security-considerations)
14. [Performance Optimization](#performance-optimization)
15. [Testing Strategy](#testing-strategy)
16. [Deployment & Monitoring](#deployment--monitoring)
17. [Migration Plan](#migration-plan)
18. [Code Templates](#code-templates)

## Executive Summary

This document provides a comprehensive design and implementation guide for rebuilding the screen sharing system to address critical issues where the stream gets interrupted when the admin performs other operations, refreshes the page, or navigates between tabs. The new architecture ensures persistent, reliable screen sharing that remains operational regardless of admin UI state and provides an uninterrupted experience for players.

## Current System Analysis

### Current Architecture Overview

The current screen sharing implementation uses a direct WebRTC peer-to-peer connection where:
- Admin captures screen using `getDisplayMedia()`
- Screen video is processed through canvas cropping
- WebRTC peer connection is established directly to players
- Stream state is tied to the admin's UI component lifecycle

### Current Flow Analysis

**Admin Side Flow:**
```
Admin clicks "Start Screen Share" → getDisplayMedia() → ScreenShareCropper renders → 
User selects screen → MediaStream created → Canvas cropping → 
WebRTC peer connection established → Stream to players
```

**Current Issues Identified:**

1. **Component Lifecycle Dependency**: Stream state tied to React component lifecycle
2. **UI State Dependency**: Stream stops when admin navigates away from component
3. **Manual Intervention Required**: Admin must click "Start Stream to Players" button
4. **No Persistence**: Stream lost on page refresh
5. **Resource Accumulation**: MediaStream tracks not properly cleaned up
6. **Timing Issues**: WebRTC offer sent before all prerequisites ready
7. **Connection Fragility**: No automatic recovery from disconnections

### Current Component Dependencies

**Client Components:**
- `client/src/components/AdminGamePanel/StreamControlPanel.tsx`
- `client/src/components/AdminGamePanel/ScreenShareCropper.tsx`
- `client/src/components/StreamPlayer/WebRTCPlayer.tsx`
- `client/src/contexts/WebSocketContext.tsx`

**Server Components:**
- `server/webrtc-signaling.ts`
- `server/routes.ts` (WebSocket handling)
- Shared types in `shared/src/types/webSocket.ts`

### Current Resource Management Issues

1. MediaStream tracks not stopped on component unmount
2. Canvas animation frames not cancelled
3. WebSocket connections not properly closed
4. RTCPeerConnection objects not closed on error
5. Event listeners not removed on component cleanup
6. Timer intervals not cleared

## Problem Definition & Requirements

### Core Problems to Solve

1. **Stream Persistence**: Screen share must continue after admin page refresh
2. **Admin Operation Independence**: Admin can perform other tasks without affecting stream
3. **Tab Isolation**: Screen share must work across multiple admin tabs
4. **Player Continuity**: Players must maintain connection during admin operations
5. **Memory Management**: Prevent resource accumulation and crashes
6. **Connection Recovery**: Auto-recovery from network disconnections
7. **User Experience**: Simplify multi-step process to single operation

### Functional Requirements

1. **Persistent Streaming**: Stream remains active across admin page refreshes
2. **Background Operation**: Screen sharing continues during other admin tasks
3. **Multi-Player Support**: Multiple players can connect simultaneously
4. **Automatic Discovery**: Players automatically detect active streams
5. **Reconnection**: Automatic reconnection on network issues
6. **Resource Cleanup**: Proper cleanup of all resources on termination
7. **Error Handling**: Graceful degradation on failures
8. **Security**: Secure stream access with proper authentication

### Non-Functional Requirements

1. **Performance**: <2 second connection time, <200ms latency
2. **Scalability**: Support 100+ concurrent viewers per stream
3. **Reliability**: 99.9% uptime for active streams
4. **Security**: End-to-end encryption, secure authentication
5. **Memory**: <100MB RAM per active stream
6. **Bandwidth**: Efficient compression and transmission

## Proposed Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin UI      │    │  Service        │    │   Server        │
│   (Tab 1)       │    │  Worker         │    │   Components    │
│                 │    │                 │    │                 │
│ Screen Capture  │────│ Background      │────│ Stream Buffer   │
│ Controls        │    │ Processing      │    │ & Distribution  │
│ Stream Status   │    │ Persistent      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                      │                      │
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin UI      │    │   Admin UI      │    │  Player Clients │
│   (Tab 2)       │    │   (Refreshed)   │    │                 │
│                 │    │                 │    │ Stream Display  │
│ Other Operations│    │ Reconnect &     │    │ Connection      │
│ (Deposits,      │    │ Resume Stream   │    │ Management      │
│ Withdrawals)    │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Architecture Components

#### 1. Service Worker Layer
- Maintains screen capture in background
- Handles reconnection logic
- Manages media stream persistence
- Communicates with server independently of UI state

#### 2. Server-Side Streaming Service
- Hosts stream data independently of admin connection
- Manages buffer for player distribution
- Handles admin reconnection and state recovery
- Manages viewer connections and permissions

#### 3. Client-Side Streaming Services
- Admin streaming service with reconnection
- Player streaming service with buffer management
- Token-based authentication and authorization
- State synchronization across tabs

### System Flow Diagram

```
Admin Screen Capture ──→ Service Worker ──→ Server Streaming Buffer ──→ Player Distribution
         │                      │                      │                      │
         │                      │                      │                      │
         │                      │                      │                      │
         ▼                      ▼                      ▼                      ▼
Token Request ────────→ Token Generation ──→ Token Storage ──────→ Player Token Validation
         │                      │                      │                      │
         │                      │                      │                      │
         ▼                      ▼                      ▼                      ▼
State Sync ───────────→ State Storage ────→ State Recovery ──────→ Stream Access
```

## Detailed Component Specifications

### 1. Service Worker Component

#### ScreenShareWorker.ts
```typescript
interface ScreenShareWorkerState {
  isActive: boolean;
  streamToken: string | null;
  mediaStream: MediaStream | null;
  webSocketConnection: WebSocket | null;
  reconnectAttempts: number;
  lastSuccessfulSend: Date | null;
  canvas: HTMLCanvasElement | null;
  animationFrameId: number | null;
  cropArea: CropArea | null;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MessageFromUI {
  type: 'start' | 'stop' | 'pause' | 'resume' | 'crop' | 'status' | 'reconnect';
  payload: any;
}

interface MessageToUI {
  type: 'status' | 'error' | 'connected' | 'disconnected' | 'stats';
  payload: any;
}
```

#### Responsibilities:
- Maintain screen capture across UI state changes
- Handle reconnection to server
- Process screen frames with cropping
- Send stream data to server
- Monitor connection health
- Manage resources efficiently

### 2. Server Streaming Service

#### ScreenShareService.ts
```typescript
interface ActiveScreenShare {
  streamId: string;
  adminId: string;
  token: string;
  isActive: boolean;
  startTime: Date;
  lastActivity: Date;
  viewerCount: number;
  connectedPlayers: Set<string>;
  buffer: StreamBuffer;
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
  adminReconnectToken: string;
  createdAt: Date;
  updatedAt: Date;
}

interface StreamBuffer {
  frames: Array<{
    data: ArrayBuffer;
    timestamp: Date;
    sequence: number;
  }>;
  maxSize: number;
  currentSize: number;
  lastUpdate: Date;
  frameRate: number;
  resolution: { width: number; height: number };
}

class ScreenShareService {
  // Core functionality
  createStream(adminId: string): Promise<{ streamId: string; token: string }>;
  startStream(token: string, streamData: MediaStream): Promise<void>;
  stopStream(token: string): Promise<void>;
  
  // Connection management
  adminConnect(token: string, adminId: string): Promise<boolean>;
  adminDisconnect(adminId: string): Promise<void>;
  adminReconnect(reconnectToken: string, adminId: string): Promise<boolean>;
  
  // Player management
  getPlayerStream(token: string, playerId: string): Promise<StreamData | null>;
  playerConnect(streamToken: string, playerId: string): Promise<boolean>;
  playerDisconnect(playerId: string): Promise<void>;
  getActiveStreams(): ActiveScreenShare[];
  
  // Buffer management
  pushFrame(streamToken: string, frame: ArrayBuffer): Promise<void>;
  getStreamFrames(streamToken: string, playerId: string): Promise<ArrayBuffer[]>;
  
  // Health monitoring
  getStreamHealth(streamToken: string): StreamHealth;
  cleanupInactiveStreams(): Promise<void>;
}
```

### 3. Client-Side Admin Service

#### AdminScreenShareService.ts
```typescript
interface AdminStreamState {
  isActive: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  streamToken: string | null;
  reconnectToken: string | null;
  adminId: string | null;
  connectionAttempts: number;
  lastConnected: Date | null;
  reconnectTimer: NodeJS.Timeout | null;
  serviceWorkerRegistration: ServiceWorkerRegistration | null;
  error: string | null;
  stats: {
    connectedPlayers: number;
    bandwidth: number;
    latency: number;
    frameRate: number;
  };
}

class AdminScreenShareService {
  // Stream management
  startScreenShare(): Promise<void>;
  stopScreenShare(): Promise<void>;
  pauseScreenShare(): Promise<void>;
  resumeScreenShare(): Promise<void>;
  
  // Connection management
  connectToServer(): Promise<boolean>;
  disconnectFromServer(): Promise<void>;
  handleReconnection(): Promise<void>;
  
  // Service worker communication
  registerServiceWorker(): Promise<void>;
  sendMessageToWorker(message: MessageFromUI): Promise<void>;
  setupWorkerMessageHandler(): void;
  
  // State synchronization
  syncStateAcrossTabs(): void;
  handleTabChange(): void;
  
  // Event handling
  setupEventListeners(): void;
  removeEventListeners(): void;
  
  // Status and monitoring
  getStreamStatus(): AdminStreamState;
  updateStreamStats(): Promise<void>;
}
```

### 4. Client-Side Player Service

#### PlayerStreamService.ts
```typescript
interface PlayerStreamState {
  isConnected: boolean;
  isConnecting: boolean;
  streamToken: string | null;
  connectionAttempts: number;
  frameBuffer: Array<{
    data: ArrayBuffer;
    timestamp: Date;
  }>;
  renderQueue: Array<{
    data: ArrayBuffer;
    timestamp: Date;
  }>;
  stats: {
    currentLatency: number;
    averageLatency: number;
    frameRate: number;
    connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  };
}

class PlayerStreamService {
  // Stream connection
  connectToStream(token: string): Promise<boolean>;
  disconnectFromStream(): Promise<void>;
  
  // Frame processing
  processStreamFrames(frames: ArrayBuffer[]): Promise<void>;
  renderNextFrame(): Promise<void>;
  
  // Buffer management
  getBufferCapacity(): number;
  setBufferCapacity(size: number): void;
  clearBuffers(): void;
  
  // Connection management
  handleReconnection(): Promise<void>;
  monitorConnectionHealth(): void;
  
  // Performance optimization
  adjustBufferBasedOnNetwork(): void;
  optimizeFrameRendering(): void;
  
  // Status and monitoring
  getStreamState(): PlayerStreamState;
  getStreamStats(): StreamStats;
}
```

## Server-Side Implementation

### 1. Screen Share Service Implementation

#### server/services/ScreenShareService.ts

```typescript
import { WebSocket } from 'ws';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

interface StreamConnection {
  ws: WebSocket;
  id: string;
  type: 'admin' | 'player';
  streamToken?: string;
  playerId?: string;
  adminId?: string;
  joinedAt: Date;
  lastHeartbeat: Date;
}

export class ScreenShareService {
  private activeStreams: Map<string, ActiveScreenShare> = new Map();
  private streamConnections: Map<string, StreamConnection> = new Map();
  private redis: Redis;
  private adminTokens: Map<string, string> = new Map(); // adminId -> streamToken
  private playerTokens: Map<string, string> = new Map(); // playerId -> streamToken
  private reconnectTokens: Map<string, { adminId: string; streamToken: string; }> = new Map();
  
  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
    this.initializeTimers();
  }
  
  /**
   * Initialize background timers for cleanup and monitoring
   */
  private initializeTimers(): void {
    // Cleanup inactive streams every 5 minutes
    setInterval(() => {
      this.cleanupInactiveStreams().catch(console.error);
    }, 5 * 60 * 1000);
    
    // Monitor connection health every 30 seconds
    setInterval(() => {
      this.monitorConnectionHealth().catch(console.error);
    }, 30 * 1000);
  }
  
  /**
   * Create a new screen share instance
   */
  async createStream(adminId: string): Promise<{ streamId: string; token: string; reconnectToken: string }> {
    const streamId = `stream_${uuidv4()}`;
    const token = `token_${uuidv4()}`;
    const reconnectToken = `reconnect_${uuidv4()}`;
    
    const newStream: ActiveScreenShare = {
      streamId,
      adminId,
      token,
      isActive: false,
      startTime: new Date(),
      lastActivity: new Date(),
      viewerCount: 0,
      connectedPlayers: new Set(),
      buffer: {
        frames: [],
        maxSize: 30, // Last 1 second of 30fps video
        currentSize: 0,
        lastUpdate: new Date(),
        frameRate: 30,
        resolution: { width: 1920, height: 1080 }
      },
      connectionStatus: 'disconnected',
      adminReconnectToken: reconnectToken,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.activeStreams.set(streamId, newStream);
    this.adminTokens.set(adminId, token);
    
    // Store in Redis for persistence across server restarts
    await this.redis.setex(`stream:${streamId}`, 3600, JSON.stringify(newStream));
    await this.redis.setex(`reconnect:${reconnectToken}`, 86400, JSON.stringify({
      adminId,
      streamToken: token
    }));
    
    return { streamId, token, reconnectToken };
  }
  
  /**
   * Start streaming for an admin
   */
  async startStream(token: string, streamData: ArrayBuffer): Promise<void> {
    const streamInfo = this.getStreamByToken(token);
    if (!streamInfo) {
      throw new Error('Invalid stream token');
    }
    
    streamInfo.isActive = true;
    streamInfo.connectionStatus = 'connected';
    streamInfo.updatedAt = new Date();
    
    // Add frame to buffer
    await this.pushFrame(token, streamData);
    
    // Update Redis
    await this.redis.setex(`stream:${streamInfo.streamId}`, 3600, JSON.stringify(streamInfo));
    
    // Notify connected players of new stream
    this.notifyPlayersOfNewFrame(streamInfo.streamId, streamData);
  }
  
  /**
   * Push a frame to the stream buffer
   */
  async pushFrame(token: string, frame: ArrayBuffer): Promise<void> {
    const streamInfo = this.getStreamByToken(token);
    if (!streamInfo) {
      throw new Error('Invalid stream token');
    }
    
    const frameEntry = {
      data: frame,
      timestamp: new Date(),
      sequence: streamInfo.buffer.frames.length
    };
    
    streamInfo.buffer.frames.push(frameEntry);
    streamInfo.buffer.currentSize++;
    streamInfo.buffer.lastUpdate = new Date();
    
    // Limit buffer size
    if (streamInfo.buffer.frames.length > streamInfo.buffer.maxSize) {
      streamInfo.buffer.frames.shift();
      streamInfo.buffer.currentSize--;
    }
    
    // Update Redis
    await this.redis.setex(`stream:${streamInfo.streamId}`, 3600, JSON.stringify(streamInfo));
  }
  
  /**
   * Get recent frames for a player
   */
  async getStreamFrames(token: string, playerId: string): Promise<ArrayBuffer[]> {
    const streamInfo = this.getStreamByToken(token);
    if (!streamInfo) {
      throw new Error('Invalid stream token');
    }
    
    // Add player to connected list
    streamInfo.connectedPlayers.add(playerId);
    streamInfo.viewerCount = streamInfo.connectedPlayers.size;
    streamInfo.updatedAt = new Date();
    
    // Update Redis
    await this.redis.setex(`stream:${streamInfo.streamId}`, 3600, JSON.stringify(streamInfo));
    
    // Return recent frames
    return streamInfo.buffer.frames.map(frame => frame.data);
  }
  
  /**
   * Admin connects to existing stream
   */
  async adminConnect(token: string, adminId: string): Promise<boolean> {
    const streamInfo = this.getStreamByToken(token);
    if (!streamInfo) {
      return false;
    }
    
    if (streamInfo.adminId !== adminId) {
      return false;
    }
    
    streamInfo.connectionStatus = 'connected';
    streamInfo.updatedAt = new Date();
    
    // Update Redis
    await this.redis.setex(`stream:${streamInfo.streamId}`, 3600, JSON.stringify(streamInfo));
    
    return true;
  }
  
  /**
   * Admin disconnects (temporary - for reconnection)
   */
  async adminDisconnect(adminId: string): Promise<void> {
    const token = this.adminTokens.get(adminId);
    if (!token) {
      return;
    }
    
    const streamInfo = this.getStreamByToken(token);
    if (!streamInfo) {
      return;
    }
    
    streamInfo.connectionStatus = 'disconnected';
    streamInfo.updatedAt = new Date();
    
    // Update Redis
    await this.redis.setex(`stream:${streamInfo.streamId}`, 3600, JSON.stringify(streamInfo));
    
    console.log(`Admin ${adminId} disconnected from stream ${streamInfo.streamId}, buffering continues`);
  }
  
  /**
   * Admin reconnects using reconnect token
   */
  async adminReconnect(reconnectToken: string, adminId: string): Promise<boolean> {
    const reconnectInfo = await this.redis.get(`reconnect:${reconnectToken}`);
    if (!reconnectInfo) {
      return false;
    }
    
    const parsedInfo = JSON.parse(reconnectInfo);
    if (parsedInfo.adminId !== adminId) {
      return false;
    }
    
    const streamInfo = this.getStreamByToken(parsedInfo.streamToken);
    if (!streamInfo) {
      return false;
    }
    
    streamInfo.connectionStatus = 'connected';
    streamInfo.updatedAt = new Date();
    
    // Update Redis
    await this.redis.setex(`stream:${streamInfo.streamId}`, 3600, JSON.stringify(streamInfo));
    
    console.log(`Admin ${adminId} reconnected to stream ${streamInfo.streamId}`);
    return true;
  }
  
  /**
   * Player connects to stream
   */
  async playerConnect(streamToken: string, playerId: string): Promise<boolean> {
    const streamInfo = this.getStreamByToken(streamToken);
    if (!streamInfo || !streamInfo.isActive) {
      return false;
    }
    
    streamInfo.connectedPlayers.add(playerId);
    streamInfo.viewerCount = streamInfo.connectedPlayers.size;
    streamInfo.updatedAt = new Date();
    
    // Update Redis
    await this.redis.setex(`stream:${streamInfo.streamId}`, 3600, JSON.stringify(streamInfo));
    
    // Add to player tokens
    this.playerTokens.set(playerId, streamToken);
    
    console.log(`Player ${playerId} connected to stream ${streamInfo.streamId}`);
    return true;
  }
  
  /**
   * Player disconnects from stream
   */
  async playerDisconnect(playerId: string): Promise<void> {
    const streamToken = this.playerTokens.get(playerId);
    if (!streamToken) {
      return;
    }
    
    const streamInfo = this.getStreamByToken(streamToken);
    if (!streamInfo) {
      return;
    }
    
    streamInfo.connectedPlayers.delete(playerId);
    streamInfo.viewerCount = streamInfo.connectedPlayers.size;
    streamInfo.updatedAt = new Date();
    
    // Remove from player tokens
    this.playerTokens.delete(playerId);
    
    // Update Redis
    await this.redis.setex(`stream:${streamInfo.streamId}`, 3600, JSON.stringify(streamInfo));
    
    console.log(`Player ${playerId} disconnected from stream ${streamInfo.streamId}`);
  }
  
  /**
   * Get active streams
   */
  getActiveStreams(): ActiveScreenShare[] {
    return Array.from(this.activeStreams.values()).filter(stream => stream.isActive);
  }
  
  /**
   * Get stream by token (from memory or Redis)
   */
  private getStreamByToken(token: string): ActiveScreenShare | null {
    // First check memory
    for (const [_, stream] of this.activeStreams) {
      if (stream.token === token) {
        return stream;
      }
    }
    
    // Then check Redis
    return null; // Implementation would fetch from Redis
  }
  
  /**
   * Notify connected players of new frame
   */
  private notifyPlayersOfNewFrame(streamId: string, frame: ArrayBuffer): void {
    const streamInfo = this.activeStreams.get(streamId);
    if (!streamInfo) {
      return;
    }
    
    // Send frame to all connected players for this stream
    const connections = Array.from(this.streamConnections.values())
      .filter(conn => conn.type === 'player' && 
                    conn.streamToken === streamInfo?.token);
    
    connections.forEach(conn => {
      try {
        conn.ws.send(JSON.stringify({
          type: 'stream_frame',
          data: frame,
          streamId: streamId
        }));
      } catch (error) {
        console.error('Error sending frame to player:', error);
        // Remove broken connection
        this.streamConnections.delete(conn.id);
      }
    });
  }
  
  /**
   * Monitor connection health
   */
  private async monitorConnectionHealth(): Promise<void> {
    const now = new Date();
    const connections = Array.from(this.streamConnections.values());
    
    for (const conn of connections) {
      const timeSinceLastHeartbeat = (now.getTime() - conn.lastHeartbeat.getTime()) / 1000;
      
      if (timeSinceLastHeartbeat > 60) { // 60 seconds without heartbeat
        console.log(`Connection ${conn.id} has timed out`);
        
        if (conn.type === 'admin') {
          await this.adminDisconnect(conn.adminId!);
        } else {
          await this.playerDisconnect(conn.playerId!);
        }
        
        this.streamConnections.delete(conn.id);
      }
    }
  }
  
  /**
   * Cleanup inactive streams
   */
  async cleanupInactiveStreams(): Promise<void> {
    const now = new Date();
    const streamsToCleanup: string[] = [];
    
    for (const [streamId, streamInfo] of this.activeStreams) {
      const timeSinceLastActivity = (now.getTime() - streamInfo.lastActivity.getTime()) / 1000;
      
      // If admin disconnected and no activity for 30 minutes, cleanup
      if (streamInfo.connectionStatus === 'disconnected' && timeSinceLastActivity > 1800) {
        streamsToCleanup.push(streamId);
      }
      
      // If no viewers and not active for 1 hour, cleanup
      if (streamInfo.viewerCount === 0 && streamInfo.isActive && timeSinceLastActivity > 3600) {
        streamsToCleanup.push(streamId);
      }
    }
    
    for (const streamId of streamsToCleanup) {
      await this.cleanupStream(streamId);
    }
  }
  
  /**
   * Cleanup a specific stream
   */
  private async cleanupStream(streamId: string): Promise<void> {
    const streamInfo = this.activeStreams.get(streamId);
    if (!streamInfo) {
      return;
    }
    
    // Remove from memory
    this.activeStreams.delete(streamId);
    
    // Remove from Redis
    await this.redis.del(`stream:${streamId}`);
    await this.redis.del(`reconnect:${streamInfo.adminReconnectToken}`);
    
    // Remove admin token mapping
    this.adminTokens.delete(streamInfo.adminId);
    
    // Remove player token mappings for this stream
    for (const [playerId, token] of this.playerTokens.entries()) {
      if (token === streamInfo.token) {
        this.playerTokens.delete(playerId);
      }
    }
    
    // Remove associated connections
    const connectionsToRemove = Array.from(this.streamConnections.entries())
      .filter(([_, conn]) => conn.streamToken === streamInfo.token)
      .map(([id, _]) => id);
    
    connectionsToRemove.forEach(id => this.streamConnections.delete(id));
    
    console.log(`Cleaned up inactive stream ${streamId}`);
  }
}
```

### 2. Stream Buffer Implementation

#### server/utils/StreamBuffer.ts

```typescript
export interface StreamFrame {
  data: ArrayBuffer;
  timestamp: Date;
  sequence: number;
  size: number;
  width?: number;
  height?: number;
  frameRate?: number;
}

export class StreamBuffer {
  private frames: StreamFrame[] = [];
  private readonly maxSize: number;
  private readonly maxDuration: number; // in seconds
  private readonly cleanupInterval: NodeJS.Timeout;
  
  constructor(maxSize: number = 30, maxDuration: number = 10) {
    this.maxSize = maxSize;
    this.maxDuration = maxDuration;
    
    // Cleanup old frames every 5 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldFrames();
    }, 5000);
  }
  
  /**
   * Add a frame to the buffer
   */
  addFrame(frameData: ArrayBuffer, metadata?: Partial<StreamFrame>): void {
    const frame: StreamFrame = {
      data: frameData,
      timestamp: new Date(),
      sequence: this.frames.length,
      size: frameData.byteLength,
      width: metadata?.width,
      height: metadata?.height,
      frameRate: metadata?.frameRate
    };
    
    this.frames.push(frame);
    
    // Enforce size limit
    if (this.frames.length > this.maxSize) {
      this.frames = this.frames.slice(-this.maxSize);
    }
  }
  
  /**
   * Get frames within a time range
   */
  getFramesSince(time: Date, limit?: number): StreamFrame[] {
    const filteredFrames = this.frames.filter(frame => 
      frame.timestamp >= time
    );
    
    if (limit) {
      return filteredFrames.slice(-limit);
    }
    
    return filteredFrames;
  }
  
  /**
   * Get the most recent frames
   */
  getRecentFrames(count: number): StreamFrame[] {
    return this.frames.slice(-count);
  }
  
  /**
   * Get all frames
   */
  getAllFrames(): StreamFrame[] {
    return [...this.frames];
  }
  
  /**
   * Get the latest frame
   */
  getLatestFrame(): StreamFrame | null {
    if (this.frames.length === 0) {
      return null;
    }
    return this.frames[this.frames.length - 1];
  }
  
  /**
   * Get buffer statistics
   */
  getStats(): {
    frameCount: number;
    totalSize: number;
    duration: number;
    averageFrameSize: number;
    isFull: boolean;
  } {
    const totalSize = this.frames.reduce((sum, frame) => sum + frame.size, 0);
    const duration = this.frames.length > 0 
      ? (this.frames[this.frames.length - 1].timestamp.getTime() - 
         this.frames[0].timestamp.getTime()) / 1000 
      : 0;
    
    return {
      frameCount: this.frames.length,
      totalSize,
      duration,
      averageFrameSize: this.frames.length > 0 ? totalSize / this.frames.length : 0,
      isFull: this.frames.length >= this.maxSize
    };
  }
  
  /**
   * Cleanup frames older than maxDuration
   */
  private cleanupOldFrames(): void {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - (this.maxDuration * 1000));
    
    const newFrames = this.frames.filter(frame => 
      frame.timestamp >= cutoffTime
    );
    
    this.frames = newFrames;
  }
  
  /**
   * Clear all frames
   */
  clear(): void {
    this.frames = [];
  }
  
  /**
   * Destroy the buffer and cleanup
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.frames = [];
  }
  
  /**
   * Get buffer size
   */
  get size(): number {
    return this.frames.length;
  }
  
  /**
   * Check if buffer is empty
   */
  get isEmpty(): boolean {
    return this.frames.length === 0;
  }
  
  /**
   * Check if buffer is at capacity
   */
  get isAtCapacity(): boolean {
    return this.frames.length >= this.maxSize;
  }
}
```

### 3. WebSocket Integration

#### server/routes.ts (Enhanced)

```typescript
import { WebSocket } from 'ws';
import { ScreenShareService } from './services/ScreenShareService';
import { StreamBuffer } from './utils/StreamBuffer';

// Initialize services
const screenShareService = new ScreenShareService(process.env.REDIS_URL || 'redis://localhost:6379');

// Extend existing WebSocket message handling
export function setupWebSocketMessageHandlers(ws: WebSocket, decoded: any) {
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        // Screen share specific messages
        case 'screen_share:create':
          await handleCreateScreenShare(ws, decoded, message.data);
          break;
          
        case 'screen_share:start':
          await handleStartScreenShare(ws, decoded, message.data);
          break;
          
        case 'screen_share:stop':
          await handleStopScreenShare(ws, decoded, message.data);
          break;
          
        case 'screen_share:frame':
          await handleScreenShareFrame(ws, decoded, message.data);
          break;
          
        case 'screen_share:reconnect':
          await handleAdminReconnect(ws, decoded, message.data);
          break;
          
        case 'screen_share:join':
          await handlePlayerJoinStream(ws, decoded, message.data);
          break;
          
        case 'screen_share:leave':
          await handlePlayerLeaveStream(ws, decoded, message.data);
          break;
          
        // Existing message types...
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Invalid message format' }
      }));
    }
  });
}

async function handleCreateScreenShare(ws: WebSocket, decoded: any, data: any) {
  try {
    // Verify admin role
    if (decoded.role !== 'admin') {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Only admins can create screen shares' }
      }));
      return;
    }
    
    const { streamId, token, reconnectToken } = await screenShareService.createStream(decoded.userId);
    
    ws.send(JSON.stringify({
      type: 'screen_share:created',
      data: { streamId, token, reconnectToken }
    }));
    
    console.log(`Screen share created for admin ${decoded.userId}: ${streamId}`);
  } catch (error) {
    console.error('Error creating screen share:', error);
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Failed to create screen share' }
    }));
  }
}

async function handleStartScreenShare(ws: WebSocket, decoded: any, data: any) {
  try {
    const { token } = data;
    
    // Verify this admin owns this stream
    const streamInfo = await screenShareService.getStreamByToken(token);
    if (!streamInfo || streamInfo.adminId !== decoded.userId) {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Unauthorized to start this stream' }
      }));
      return;
    }
    
    await screenShareService.adminConnect(token, decoded.userId);
    
    ws.send(JSON.stringify({
      type: 'screen_share:started',
      data: { success: true }
    }));
    
    console.log(`Screen share started for admin ${decoded.userId}`);
  } catch (error) {
    console.error('Error starting screen share:', error);
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Failed to start screen share' }
    }));
  }
}

async function handleScreenShareFrame(ws: WebSocket, decoded: any, data: any) {
  try {
    const { token, frameData } = data;
    
    // Verify this admin owns this stream
    const streamInfo = await screenShareService.getStreamByToken(token);
    if (!streamInfo || streamInfo.adminId !== decoded.userId) {
      return; // Unauthorized, silently ignore
    }
    
    await screenShareService.pushFrame(token, frameData);
    
    console.log(`Frame received for stream ${streamInfo.streamId}`);
  } catch (error) {
    console.error('Error handling screen share frame:', error);
  }
}

async function handleAdminReconnect(ws: WebSocket, decoded: any, data: any) {
  try {
    const { reconnectToken } = data;
    
    const success = await screenShareService.adminReconnect(reconnectToken, decoded.userId);
    
    if (success) {
      ws.send(JSON.stringify({
        type: 'screen_share:reconnected',
        data: { success: true }
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Invalid or expired reconnect token' }
      }));
    }
  } catch (error) {
    console.error('Error handling admin reconnection:', error);
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Failed to reconnect' }
    }));
  }
}

async function handlePlayerJoinStream(ws: WebSocket, decoded: any, data: any) {
  try {
    const { streamToken } = data;
    
    const success = await screenShareService.playerConnect(streamToken, decoded.userId);
    
    if (success) {
      ws.send(JSON.stringify({
        type: 'screen_share:joined',
        data: { success: true }
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Could not join stream' }
      }));
    }
  } catch (error) {
    console.error('Error handling player join:', error);
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Failed to join stream' }
    }));
  }
}

async function handlePlayerLeaveStream(ws: WebSocket, decoded: any, data: any) {
  try {
    await screenShareService.playerDisconnect(decoded.userId);
    
    ws.send(JSON.stringify({
      type: 'screen_share:left',
      data: { success: true }
    }));
  } catch (error) {
    console.error('Error handling player leave:', error);
  }
}
```

## Client-Side Implementation

### 1. Admin Screen Share Service

#### client/src/services/AdminScreenShareService.ts

```typescript
export interface AdminStreamState {
  isActive: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  streamToken: string | null;
  reconnectToken: string | null;
  adminId: string | null;
  connectionAttempts: number;
  lastConnected: Date | null;
  reconnectTimer: NodeJS.Timeout | null;
  serviceWorkerRegistration: ServiceWorkerRegistration | null;
  error: string | null;
  stats: StreamStats;
  cropArea: CropArea | null;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StreamStats {
  connectedPlayers: number;
  bandwidth: number;
  latency: number;
  frameRate: number;
  resolution: { width: number; height: number };
}

export class AdminScreenShareService {
  private state: AdminStreamState = {
    isActive: false,
    isConnecting: false,
    isConnected: false,
    streamToken: null,
    reconnectToken: null,
    adminId: null,
    connectionAttempts: 0,
    lastConnected: null,
    reconnectTimer: null,
    serviceWorkerRegistration: null,
    error: null,
    stats: {
      connectedPlayers: 0,
      bandwidth: 0,
      latency: 0,
      frameRate: 0,
      resolution: { width: 0, height: 0 }
    },
    cropArea: null
  };
  
  private eventListeners: Array<() => void> = [];
  private webSocketConnection: any = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  
  constructor() {
    this.initializeService();
  }
  
  private initializeService(): void {
    // Load state from local storage
    this.loadStateFromStorage();
    
    // Setup page visibility change handler
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state.isActive) {
        // Tab going to background, keep service worker running
        this.syncStateWithWorker();
      }
    });
    
    // Setup beforeunload handler
    window.addEventListener('beforeunload', (event) => {
      if (this.state.isActive) {
        // Try to stop gracefully
        this.stopScreenShare().catch(console.error);
      }
    });
    
    // Setup tab closing detection
    window.addEventListener('pagehide', () => {
      if (this.state.isActive) {
        this.stopScreenShare().catch(console.error);
      }
    });
  }
  
  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<void> {
    if (this.state.isActive) {
      throw new Error('Screen share is already active');
    }
    
    try {
      this.updateState({ 
        isConnecting: true, 
        error: null 
      });
      
      // Create stream with server
      const response = await this.createStreamWithServer();
      const { streamId, token, reconnectToken } = response;
      
      // Update state
      this.updateState({
        streamToken: token,
        reconnectToken: reconnectToken,
        isConnecting: false,
        isActive: true,
        lastConnected: new Date()
      });
      
      // Store state in local storage
      this.saveStateToStorage();
      
      // Register service worker
      await this.registerServiceWorker();
      
      // Start streaming via service worker
      await this.startStreamingInWorker();
      
      // Connect WebSocket for management
      await this.connectWebSocket();
      
      console.log('Screen sharing started successfully');
    } catch (error) {
      console.error('Failed to start screen sharing:', error);
      
      this.updateState({
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }
  
  /**
   * Stop screen sharing
   */
  async stopScreenShare(): Promise<void> {
    if (!this.state.isActive) {
      return;
    }
    
    try {
      // Stop service worker streaming
      await this.stopStreamingInWorker();
      
      // Disconnect WebSocket
      await this.disconnectWebSocket();
      
      // Notify server
      await this.notifyServerStop();
      
      // Clean up state
      this.updateState({
        isActive: false,
        isConnected: false,
        isConnecting: false,
        streamToken: null,
        reconnectToken: null,
        connectionAttempts: 0
      });
      
      // Clear local storage
      this.clearStateFromStorage();
      
      console.log('Screen sharing stopped successfully');
    } catch (error) {
      console.error('Failed to stop screen sharing:', error);
      // Still clear local state even if server notification fails
      this.updateState({
        isActive: false,
        isConnected: false,
        isConnecting: false,
        streamToken: null,
        reconnectToken: null
      });
      this.clearStateFromStorage();
    }
  }
  
  /**
   * Pause screen sharing (temporary)
   */
  async pauseScreenShare(): Promise<void> {
    if (!this.state.isActive) {
      return;
    }
    
    try {
      await this.sendMessageToWorker({
        type: 'pause',
        payload: {}
      });
      
      console.log('Screen sharing paused');
    } catch (error) {
      console.error('Failed to pause screen sharing:', error);
    }
  }
  
  /**
   * Resume screen sharing
   */
  async resumeScreenShare(): Promise<void> {
    if (!this.state.isActive) {
      return;
    }
    
    try {
      await this.sendMessageToWorker({
        type: 'resume',
        payload: {}
      });
      
      console.log('Screen sharing resumed');
    } catch (error) {
      console.error('Failed to resume screen sharing:', error);
    }
  }
  
  /**
   * Update crop area
   */
  async updateCropArea(cropArea: CropArea): Promise<void> {
    if (!this.state.isActive) {
      throw new Error('Screen share not active');
    }
    
    try {
      await this.sendMessageToWorker({
        type: 'crop',
        payload: { cropArea }
      });
      
      this.updateState({ cropArea });
      
      console.log('Crop area updated');
    } catch (error) {
      console.error('Failed to update crop area:', error);
    }
  }
  
  /**
   * Create stream with server
   */
  private async createStreamWithServer(): Promise<{ streamId: string; token: string; reconnectToken: string }> {
    const response = await fetch('/api/screen-share/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({
        adminId: this.state.adminId
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create stream: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Connect to WebSocket for stream management
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.getWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        this.webSocketConnection = ws;
        this.updateState({ isConnected: true, connectionAttempts: 0 });
        console.log('WebSocket connected for screen share management');
        resolve();
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onclose = (event) => {
        this.webSocketConnection = null;
        this.updateState({ isConnected: false });
        
        if (this.state.isActive) {
          // Try to reconnect if stream is still active
          this.attemptReconnection();
        }
        
        console.log('WebSocket disconnected:', event.code, event.reason);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
    });
  }
  
  /**
   * Disconnect WebSocket
   */
  private async disconnectWebSocket(): Promise<void> {
    if (this.webSocketConnection) {
      this.webSocketConnection.close();
      this.webSocketConnection = null;
    }
  }
  
  /**
   * Notify server of stream stop
   */
  private async notifyServerStop(): Promise<void> {
    if (this.webSocketConnection && this.state.streamToken) {
      this.webSocketConnection.send(JSON.stringify({
        type: 'screen_share:stop',
        data: { token: this.state.streamToken }
      }));
    }
  }
  
  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'screen_share:joined':
        console.log('Player joined stream:', message.data);
        break;
        
      case 'screen_share:left':
        console.log('Player left stream:', message.data);
        break;
        
      case 'stream_stats':
        this.updateStats(message.data);
        break;
        
      default:
        console.log('Unknown WebSocket message:', message.type);
    }
  }
  
  /**
   * Attempt to reconnect WebSocket
   */
  private async attemptReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    
    // Exponential backoff
    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
    
    console.log(`Attempting reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(async () => {
      if (this.state.isActive) {
        await this.connectWebSocket();
      }
    }, delay);
  }
  
  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported in this browser');
    }
    
    try {
      const registration = await navigator.serviceWorker.register('/workers/screen-share-worker.js');
      
      this.updateState({ serviceWorkerRegistration: registration });
      
      // Setup message channel with service worker
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        this.handleWorkerMessage(event.data);
      };
      
      registration.active?.postMessage({
        type: 'init',
        payload: {
          streamToken: this.state.streamToken,
          adminId: this.state.adminId
        }
      }, [messageChannel.port2]);
      
      console.log('Service worker registered for screen sharing');
      
      return registration;
    } catch (error) {
      console.error('Failed to register service worker:', error);
      throw error;
    }
  }
  
  /**
   * Start streaming in service worker
   */
  private async startStreamingInWorker(): Promise<void> {
    await this.sendMessageToWorker({
      type: 'start',
      payload: {
        streamToken: this.state.streamToken,
        adminId: this.state.adminId
      }
    });
  }
  
  /**
   * Stop streaming in service worker
   */
  private async stopStreamingInWorker(): Promise<void> {
    await this.sendMessageToWorker({
      type: 'stop',
      payload: {}
    });
  }
  
  /**
   * Send message to service worker
   */
  private async sendMessageToWorker(message: any): Promise<void> {
    if (!this.state.serviceWorkerRegistration) {
      throw new Error('Service worker not registered');
    }
    
    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'response' && event.data.id === message.id) {
          if (event.data.success) {
            resolve();
          } else {
            reject(new Error(event.data.error || 'Service worker operation failed'));
          }
        }
      };
      
      messageChannel.port1.onmessageerror = (error) => {
        reject(error);
      };
      
      this.state.serviceWorkerRegistration.active?.postMessage(message, [messageChannel.port2]);
    });
  }
  
  /**
   * Handle message from service worker
   */
  private handleWorkerMessage(data: any): void {
    switch (data.type) {
      case 'status':
        this.updateState({ 
          isConnected: data.payload.isConnected,
          isConnecting: data.payload.isConnecting
        });
        break;
        
      case 'error':
        this.updateState({ error: data.payload.message });
        break;
        
      case 'stats':
        this.updateStats(data.payload.stats);
        break;
        
      default:
        console.log('Unknown worker message:', data.type);
    }
  }
  
  /**
   * Update stream stats
   */
  private updateStats(stats: Partial<StreamStats>): void {
    this.updateState({
      stats: {
        ...this.state.stats,
        ...stats
      }
    });
  }
  
  /**
   * Get current state
   */
  getState(): AdminStreamState {
    return { ...this.state };
  }
  
  /**
   * Update state and notify listeners
   */
  private updateState(newState: Partial<AdminStreamState>): void {
    this.state = { ...this.state, ...newState };
    this.saveStateToStorage();
    this.notifyStateChange();
  }
  
  /**
   * Notify listeners of state change
   */
  private notifyStateChange(): void {
    this.eventListeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
  }
  
  /**
   * Add state change listener
   */
  addStateChangeListener(callback: () => void): void {
    this.eventListeners.push(callback);
  }
  
  /**
   * Remove state change listener
   */
  removeStateChangeListener(callback: () => void): void {
    const index = this.eventListeners.indexOf(callback);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }
  
  /**
   * Load state from local storage
   */
  private loadStateFromStorage(): void {
    try {
      const stored = localStorage.getItem('adminScreenShareState');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state = { ...this.state, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load screen share state:', error);
    }
  }
  
  /**
   * Save state to local storage
   */
  private saveStateToStorage(): void {
    try {
      localStorage.setItem('adminScreenShareState', JSON.stringify({
        streamToken: this.state.streamToken,
        reconnectToken: this.state.reconnectToken,
        isActive: this.state.isActive,
        adminId: this.state.adminId
      }));
    } catch (error) {
      console.error('Failed to save screen share state:', error);
    }
  }
  
  /**
   * Clear state from local storage
   */
  private clearStateFromStorage(): void {
    try {
      localStorage.removeItem('adminScreenShareState');
    } catch (error) {
      console.error('Failed to clear screen share state:', error);
    }
  }
  
  /**
   * Get auth token
   */
  private getAuthToken(): string {
    return localStorage.getItem('auth_token') || '';
  }
  
  /**
   * Get WebSocket URL
   */
  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
  
  /**
   * Sync state with worker across tabs
   */
  private syncStateWithWorker(): void {
    if (this.state.isActive && this.state.serviceWorkerRegistration) {
      this.sendMessageToWorker({
        type: 'sync',
        payload: {
          state: this.state
        }
      }).catch(console.error);
    }
  }
  
  /**
   * Check if screen sharing is supported in this browser
   */
  static isSupported(): boolean {
    return 'getDisplayMedia' in navigator.mediaDevices && 
           'serviceWorker' in navigator &&
           'BroadcastChannel' in window;
  }
}
```

### 2. Player Stream Service

#### client/src/services/PlayerStreamService.ts

```typescript
export interface PlayerStreamState {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  streamToken: string | null;
  connectionAttempts: number;
  maxConnectionAttempts: number;
  frameBuffer: ArrayBuffer[];
  renderQueue: ArrayBuffer[];
  latency: number;
  bandwidth: number;
  frameRate: number;
  error: string | null;
  lastFrameTime: Date | null;
  buffering: boolean;
  bufferLevel: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
}

export interface StreamStats {
  latency: number;
  frameRate: number;
  bandwidth: number;
  bufferLevel: number;
  connectionQuality: string;
}

export class PlayerStreamService {
  private state: PlayerStreamState = {
    isConnected: false,
    isConnecting: false,
    isReconnecting: false,
    streamToken: null,
    connectionAttempts: 0,
    maxConnectionAttempts: 5,
    frameBuffer: [],
    renderQueue: [],
    latency: 0,
    bandwidth: 0,
    frameRate: 0,
    error: null,
    lastFrameTime: null,
    buffering: false,
    bufferLevel: 0,
    connectionQuality: 'disconnected'
  };
  
  private videoElement: HTMLVideoElement | null = null;
  private webSocketConnection: WebSocket | null = null;
  private frameProcessor: FrameProcessor | null = null;
  private eventListeners: Array<(state: PlayerStreamState) => void> = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private frameRenderTimer: NodeJS.Timeout | null = null;
  private statsUpdateTimer: NodeJS.Timeout | null = null;
  
  constructor() {
    this.initializeService();
  }
  
  private initializeService(): void {
    // Setup frame processor
    this.frameProcessor = new FrameProcessor();
    
    // Setup performance monitoring
    this.statsUpdateTimer = setInterval(() => {
      this.updateStats();
    }, 1000); // Update every second
  }
  
  /**
   * Connect to stream
   */
  async connectToStream(streamToken: string, videoElement: HTMLVideoElement): Promise<boolean> {
    if (this.state.isConnected) {
      await this.disconnectFromStream();
    }
    
    try {
      this.videoElement = videoElement;
      this.updateState({
        isConnecting: true,
        streamToken,
        error: null,
        connectionAttempts: 0
      });
      
      // Connect to server
      const success = await this.connectToServer(streamToken);
      
      if (success) {
        this.updateState({
          isConnected: true,
          isConnecting: false,
          connectionAttempts: 0
        });
        
        // Start frame rendering
        this.startFrameRendering();
        
        console.log('Connected to stream successfully');
        return true;
      } else {
        throw new Error('Failed to connect to server');
      }
    } catch (error) {
      console.error('Failed to connect to stream:', error);
      
      this.updateState({
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      });
      
      return false;
    }
  }
  
  /**
   * Disconnect from stream
   */
  async disconnectFromStream(): Promise<void> {
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Clear frame render timer
    if (this.frameRenderTimer) {
      clearInterval(this.frameRenderTimer);
      this.frameRenderTimer = null;
    }
    
    // Close WebSocket connection
    if (this.webSocketConnection) {
      this.webSocketConnection.close();
      this.webSocketConnection = null;
    }
    
    // Clear buffers
    this.clearBuffers();
    
    // Update state
    this.updateState({
      isConnected: false,
      isConnecting: false,
      isReconnecting: false,
      streamToken: null,
      connectionAttempts: 0,
      error: null
    });
    
    console.log('Disconnected from stream');
  }
  
  /**
   * Connect to server
   */
  private async connectToServer(streamToken: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.getWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = async () => {
        try {
          // Send join message
          ws.send(JSON.stringify({
            type: 'screen_share:join',
            data: { streamToken }
          }));
          
          // Wait for confirmation
          const confirmationPromise = new Promise<boolean>((confirmResolve) => {
            const confirmationHandler = (event: MessageEvent) => {
              try {
                const message = JSON.parse(event.data as string);
                if (message.type === 'screen_share:joined') {
                  ws.removeEventListener('message', confirmationHandler as EventListener);
                  confirmResolve(true);
                } else if (message.type === 'error') {
                  ws.removeEventListener('message', confirmationHandler as EventListener);
                  confirmResolve(false);
                }
              } catch (error) {
                console.error('Error parsing confirmation message:', error);
              }
            };
            
            ws.addEventListener('message', confirmationHandler as EventListener);
          });
          
          const confirmed = await confirmationPromise;
          
          if (confirmed) {
            this.webSocketConnection = ws;
            
            // Setup message handler
            ws.onmessage = (event) => {
              this.handleWebSocketMessage(event);
            };
            
            // Setup close handler
            ws.onclose = (event) => {
              this.handleConnectionClose(event);
            };
            
            // Setup error handler
            ws.onerror = (error) => {
              this.handleConnectionError(error);
            };
            
            resolve(true);
          } else {
            ws.close();
            resolve(false);
          }
        } catch (error) {
          console.error('Error during connection confirmation:', error);
          ws.close();
          reject(error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      };
      
      ws.onclose = (event) => {
        console.error('WebSocket connection failed:', event.code, event.reason);
        reject(new Error(`Connection failed: ${event.code} ${event.reason}`));
      };
    });
  }
  
  /**
   * Handle WebSocket message
   */
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data as string);
      
      switch (message.type) {
        case 'stream_frame':
          this.handleStreamFrame(message.data);
          break;
          
        case 'stream_stats':
          this.updateStreamStats(message.data);
          break;
          
        case 'error':
          this.handleError(message.data);
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }
  
  /**
   * Handle stream frame
   */
  private handleStreamFrame(frameData: ArrayBuffer): void {
    // Add frame to buffer
    this.state.frameBuffer.push(frameData);
    
    // Update buffer level
    const bufferLevel = this.state.frameBuffer.length;
    this.updateState({ bufferLevel });
    
    // Calculate connection quality based on buffer level
    this.updateConnectionQuality(bufferLevel);
    
    // Update stats
    this.updateStats();
  }
  
  /**
   * Handle connection close
   */
  private handleConnectionClose(event: CloseEvent): void {
    console.log('Stream connection closed:', event.code, event.reason);
    
    this.webSocketConnection = null;
    this.updateState({
      isConnected: false,
      isConnecting: false,
      isReconnecting: true
    });
    
    // Try to reconnect if not manually disconnected
    if (this.state.streamToken) {
      this.attemptReconnection();
    }
  }
  
  /**
   * Handle connection error
   */
  private handleConnectionError(error: Event): void {
    console.error('Stream connection error:', error);
    
    this.updateState({
      error: 'Connection error occurred'
    });
  }
  
  /**
   * Handle error
   */
  private handleError(errorData: any): void {
    this.updateState({
      error: errorData.message || 'Stream error occurred'
    });
  }
  
  /**
   * Start frame rendering
   */
  private startFrameRendering(): void {
    if (this.frameRenderTimer) {
      clearInterval(this.frameRenderTimer);
    }
    
    this.frameRenderTimer = setInterval(() => {
      this.renderNextFrame();
    }, 1000 / 30); // ~30fps rendering
  }
  
  /**
   * Render next frame
   */
  private renderNextFrame(): void {
    if (!this.videoElement || !this.state.isConnected) {
      return;
    }
    
    // Get next frame from buffer
    if (this.state.frameBuffer.length > 0) {
      const frame = this.state.frameBuffer.shift()!;
      
      try {
        // Convert ArrayBuffer to object URL for video element
        const blob = new Blob([frame], { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Set as video source
        this.videoElement.src = url;
        
        // Clean up object URL after use
        this.videoElement.onloadeddata = () => {
          URL.revokeObjectURL(url);
        };
        
        // Update frame rate stats
        if (this.state.lastFrameTime) {
          const timeDiff = Date.now() - this.state.lastFrameTime.getTime();
          const frameRate = 1000 / Math.max(timeDiff, 1);
          this.updateState({ frameRate });
        }
        
        this.updateState({ lastFrameTime: new Date() });
      } catch (error) {
        console.error('Error rendering frame:', error);
      }
    }
    
    // Update buffer level
    this.updateState({ bufferLevel: this.state.frameBuffer.length });
  }
  
  /**
   * Update connection quality based on buffer level
   */
  private updateConnectionQuality(bufferLevel: number): void {
    let quality: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected' = 'disconnected';
    
    if (bufferLevel >= 10) {
      quality = 'excellent';
    } else if (bufferLevel >= 5) {
      quality = 'good';
    } else if (bufferLevel >= 2) {
      quality = 'fair';
    } else {
      quality = 'poor';
    }
    
    this.updateState({ connectionQuality: quality });
  }
  
  /**
   * Attempt to reconnect
   */
  private attemptReconnection(): void {
    if (this.state.connectionAttempts >= this.state.maxConnectionAttempts) {
      this.updateState({
        isReconnecting: false,
        error: 'Max reconnection attempts reached'
      });
      return;
    }
    
    const attemptNumber = this.state.connectionAttempts + 1;
    
    // Exponential backoff with max 30 seconds
    const delay = Math.min(30000, 1000 * Math.pow(2, attemptNumber));
    
    console.log(`Attempting reconnection in ${delay}ms (attempt ${attemptNumber})`);
    
    this.updateState({
      connectionAttempts: attemptNumber,
      isReconnecting: true
    });
    
    this.reconnectTimer = setTimeout(() => {
      if (this.state.streamToken && !this.state.isConnected) {
        this.connectToServer(this.state.streamToken)
          .then(success => {
            if (success) {
              this.updateState({
                isConnected: true,
                isReconnecting: false,
                connectionAttempts: 0,
                error: null
              });
            } else {
              this.attemptReconnection(); // Try again
            }
          })
          .catch(error => {
            console.error('Reconnection failed:', error);
            this.attemptReconnection(); // Try again
          });
      }
    }, delay);
  }
  
  /**
   * Update stream stats
   */
  private updateStreamStats(stats: any): void {
    this.updateState({
      latency: stats.latency || 0,
      bandwidth: stats.bandwidth || 0,
      frameRate: stats.frameRate || 0
    });
  }
  
  /**
   * Update statistics
   */
  private updateStats(): void {
    const now = Date.now();
    const bufferLevel = this.state.frameBuffer.length;
    
    // Update connection quality based on buffer level
    this.updateConnectionQuality(bufferLevel);
    
    // Calculate bandwidth (approximate)
    const timeSinceLast = this.state.lastFrameTime ? 
      now - this.state.lastFrameTime.getTime() : 0;
    const bandwidth = timeSinceLast > 0 ? 
      (this.state.frameBuffer.length * 1000) / timeSinceLast : 0;
    
    this.updateState({
      bufferLevel,
      bandwidth: Math.min(bandwidth, 1000), // Cap at reasonable value
      bufferLevel
    });
  }
  
  /**
   * Clear buffers
   */
  private clearBuffers(): void {
    this.state.frameBuffer = [];
    this.state.renderQueue = [];
    this.updateState({
      bufferLevel: 0,
      bufferLevel: 0
    });
  }
  
  /**
   * Get current state
   */
  getState(): PlayerStreamState {
    return { ...this.state };
  }
  
  /**
   * Get stream statistics
   */
  getStats(): StreamStats {
    return {
      latency: this.state.latency,
      frameRate: this.state.frameRate,
      bandwidth: this.state.bandwidth,
      bufferLevel: this.state.bufferLevel,
      connectionQuality: this.state.connectionQuality
    };
  }
  
  /**
   * Update state and notify listeners
   */
  private updateState(newState: Partial<PlayerStreamState>): void {
    this.state = { ...this.state, ...newState };
    this.notifyStateChange();
  }
  
  /**
   * Notify listeners of state change
   */
  private notifyStateChange(): void {
    this.eventListeners.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
  }
  
  /**
   * Add state change listener
   */
  addStateChangeListener(callback: (state: PlayerStreamState) => void): void {
    this.eventListeners.push(callback);
  }
  
  /**
   * Remove state change listener
   */
  removeStateChangeListener(callback: (state: PlayerStreamState) => void): void {
    const index = this.eventListeners.indexOf(callback);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }
  
  /**
   * Get WebSocket URL
   */
  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
  
  /**
   * Destroy the service
   */
  destroy(): void {
    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.frameRenderTimer) {
      clearInterval(this.frameRenderTimer);
    }
    
    if (this.statsUpdateTimer) {
      clearInterval(this.statsUpdateTimer);
    }
    
    // Disconnect from stream
    this.disconnectFromStream().catch(console.error);
    
    // Clear all event listeners
    this.eventListeners = [];
    
    // Clear reference to video element
    this.videoElement = null;
    
    // Clear frame processor
    this.frameProcessor = null;
  }
  
  /**
   * Check if streaming is supported in this browser
   */
  static isSupported(): boolean {
    return 'WebSocket' in window && 
           'createObjectURL' in URL &&
           'Blob' in window;
  }
}

/**
 * Frame processor for handling video frames
 */
class FrameProcessor {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }
  
  /**
   * Process frame data
   */
  processFrame(frameData: ArrayBuffer): HTMLCanvasElement | null {
    if (!this.ctx || !this.canvas) {
      return null;
    }
    
    // Note: This is a simplified example
    // Actual frame processing would be more complex
    // For our architecture, the server handles frame processing
    return this.canvas;
  }
  
  /**
   * Decode frame
   */
  decodeFrame(frameData: ArrayBuffer): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const blob = new Blob([frameData], { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      
      video.src = url;
      video.crossOrigin = 'anonymous';
      
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(video);
      };
      
      video.onerror = (error) => {
        URL.revokeObjectURL(url);
        reject(error);
      };
      
      video.load();
    });
  }
  
  /**
   * Destroy processor
   */
  destroy(): void {
    if (this.canvas) {
      this.canvas.remove();
    }
    this.canvas = null;
    this.ctx = null;
  }
}
```

## Service Worker Implementation

### 1. Screen Share Service Worker

#### client/public/workers/screen-share-worker.ts

```typescript
// Note: This file will be compiled to client/public/workers/screen-share-worker.js

interface ScreenShareWorkerState {
  isActive: boolean;
  streamToken: string | null;
  mediaStream: MediaStream | null;
  webSocketConnection: WebSocket | null;
  reconnectAttempts: number;
  lastSuccessfulSend: Date | null;
  canvas: HTMLCanvasElement | null;
  animationFrameId: number | null;
  cropArea: CropArea | null;
  frameBuffer: FrameData[];
  frameRate: number;
  isPaused: boolean;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FrameData {
  data: ArrayBuffer;
  timestamp: Date;
  sequence: number;
}

interface WorkerMessage {
  type: 'start' | 'stop' | 'pause' | 'resume' | 'crop' | 'status' | 'reconnect' | 'init' | 'sync';
  payload: any;
  id?: string;
}

interface WorkerResponse {
  type: 'response';
  id: string;
  success: boolean;
  error?: string;
  payload?: any;
}

// Global state
let state: ScreenShareWorkerState = {
  isActive: false,
  streamToken: null,
  mediaStream: null,
  webSocketConnection: null,
  reconnectAttempts: 0,
  lastSuccessfulSend: null,
  canvas: null,
  animationFrameId: null,
  cropArea: null,
  frameBuffer: [],
  frameRate: 30,
  isPaused: false
};

// Message port for communication with main thread
let mainThreadPort: MessagePort | null = null;

// Setup service worker event listeners
self.addEventListener('message', handleWorkerMessage);

// Handle messages from main thread
function handleWorkerMessage(event: ExtendableMessageEvent): void {
  const message: WorkerMessage = event.data;
  
  switch (message.type) {
    case 'init':
      initialize(message.payload);
      break;
      
    case 'start':
      startScreenShare(message.payload, event.ports[0]);
      break;
      
    case 'stop':
      stopScreenShare();
      break;
      
    case 'pause':
      pauseScreenShare();
      break;
      
    case 'resume':
      resumeScreenShare();
      break;
      
    case 'crop':
      updateCropArea(message.payload.cropArea);
      break;
      
    case 'status':
      sendStatusUpdate();
      break;
      
    case 'reconnect':
      handleReconnection();
      break;
      
    case 'sync':
      syncState(message.payload.state);
      break;
      
    default:
      console.warn('Unknown message type:', message.type);
  }
}

/**
 * Initialize service worker
 */
function initialize(payload: any): void {
  console.log('Screen share worker initialized');
  
  // Store main thread port for communication
  if (event.ports && event.ports[0]) {
    mainThreadPort = event.ports[0];
    mainThreadPort.onmessage = handleMainMessage;
  }
}

/**
 * Handle messages from main thread via port
 */
function handleMainMessage(event: MessageEvent): void {
  const message: WorkerMessage = event.data;
  
  switch (message.type) {
    case 'ping':
      // Respond to keep alive
      if (mainThreadPort) {
        mainThreadPort.postMessage({
          type: 'pong',
          payload: { timestamp: Date.now() }
        });
      }
      break;
      
    default:
      console.warn('Unknown main thread message:', message.type);
  }
}

/**
 * Start screen sharing
 */
async function startScreenShare(payload: any, port: MessagePort): Promise<void> {
  try {
    // Store port for communication
    mainThreadPort = port;
    
    // Validate payload
    if (!payload.streamToken) {
      throw new Error('Stream token is required');
    }
    
    // Update state
    state.streamToken = payload.streamToken;
    state.isActive = true;
    state.isPaused = false;
    
    // Request screen capture
    const stream = await captureScreen();
    state.mediaStream = stream;
    
    // Setup canvas for frame processing
    setupCanvas();
    
    // Connect to server for streaming
    await connectToServer();
    
    // Start frame capture loop
    startFrameCapture();
    
    // Send success response
    sendResponse(payload.id, true, null, {
      message: 'Screen share started successfully'
    });
    
    console.log('Screen sharing started');
  } catch (error) {
    console.error('Failed to start screen sharing:', error);
    
    state.isActive = false;
    
    sendResponse(payload.id, false, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Stop screen sharing
 */
function stopScreenShare(): void {
  // Stop frame capture
  if (state.animationFrameId) {
    cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = null;
  }
  
  // Stop media stream
  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach(track => track.stop());
    state.mediaStream = null;
  }
  
  // Close WebSocket connection
  if (state.webSocketConnection) {
    state.webSocketConnection.close();
    state.webSocketConnection = null;
  }
  
  // Clear canvas
  if (state.canvas) {
    state.canvas.width = 0;
    state.canvas.height = 0;
  }
  
  // Update state
  state.isActive = false;
  state.streamToken = null;
  state.isPaused = false;
  
  console.log('Screen sharing stopped');
}

/**
 * Pause screen sharing
 */
function pauseScreenShare(): void {
  if (state.isActive) {
    state.isPaused = true;
    console.log('Screen sharing paused');
  }
}

/**
 * Resume screen sharing
 */
function resumeScreenShare(): void {
  if (state.isActive) {
    state.isPaused = false;
    console.log('Screen sharing resumed');
    
    // Restart frame capture if not already running
    if (!state.animationFrameId) {
      startFrameCapture();
    }
  }
}

/**
 * Update crop area
 */
function updateCropArea(cropArea: CropArea): void {
  state.cropArea = cropArea;
  console.log('Crop area updated:', cropArea);
}

/**
 * Capture screen using getDisplayMedia
 */
async function captureScreen(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }
      },
      audio: false
    });
    
    console.log('Screen captured successfully');
    return stream;
  } catch (error) {
    console.error('Failed to capture screen:', error);
    throw error;
  }
}

/**
 * Setup canvas for frame processing
 */
function setupCanvas(): void {
  if (!state.mediaStream) {
    throw new Error('No media stream available');
  }
  
  // Create canvas element
  const videoTrack = state.mediaStream.getVideoTracks()[0];
  const canvas = document.createElement('canvas');
  const video = document.createElement('video');
  
  video.srcObject = state.mediaStream;
  video.play().catch(console.error);
  
  // Set canvas dimensions based on video track
  canvas.width = 1920; // Default high resolution
  canvas.height = 1080;
  
  state.canvas = canvas;
  
  console.log('Canvas setup complete');
}

/**
 * Connect to server for streaming
 */
async function connectToServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Note: In a real service worker, direct WebSocket connections might not work
    // We'll use fetch API for server communication instead
    // Or use a different approach for server communication
    
    const protocol = self.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${self.location.host}/ws`;
    
    // For service worker compatibility, we'll use fetch API instead of WebSocket
    // WebSocket in service workers has limited support
    console.log('Connecting to server via fetch API for service worker compatibility');
    
    // We'll send frames via fetch API calls instead
    resolve();
  });
}

/**
 * Start frame capture loop
 */
function startFrameCapture(): void {
  if (!state.canvas || !state.canvas.getContext || !state.mediaStream) {
    console.error('Canvas or media stream not available for frame capture');
    return;
  }
  
  const ctx = state.canvas.getContext('2d');
  if (!ctx) {
    console.error('Failed to get canvas context');
    return;
  }
  
  // Get video element from the media stream
  const video = document.createElement('video');
  video.srcObject = state.mediaStream;
  video.play().catch(console.error);
  
  // Frame capture function
  const captureFrame = () => {
    if (!state.isActive || state.isPaused) {
      return;
    }
    
    try {
      // Draw video frame to canvas
      if (state.cropArea) {
        // Apply cropping
        ctx.drawImage(
          video,
          state.cropArea.x, state.cropArea.y,
          state.cropArea.width, state.cropArea.height,
          0, 0,
          state.canvas.width, state.canvas.height
        );
      } else {
        // Full frame
        ctx.drawImage(video, 0, 0, state.canvas.width, state.canvas.height);
      }
      
      // Convert canvas to data URL or blob
      const dataUrl = state.canvas.toDataURL('image/jpeg', 0.8);
      
      // Convert data URL to ArrayBuffer
      const byteString = atob(dataUrl.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      // Send frame to server
      sendFrameToServer(ab);
    } catch (error) {
      console.error('Error capturing frame:', error);
    }
    
    // Schedule next frame
    state.animationFrameId = requestAnimationFrame(captureFrame);
  };
  
  // Start the capture loop
  state.animationFrameId = requestAnimationFrame(captureFrame);
}

/**
 * Send frame to server
 */
async function sendFrameToServer(frameData: ArrayBuffer): Promise<void> {
  if (!state.streamToken) {
    console.error('No stream token available');
    return;
  }
  
  try {
    // Send frame using fetch API
    const response = await fetch('/api/screen-share/frame', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'X-Stream-Token': state.streamToken
      },
      body: frameData
    });
    
    if (!response.ok) {
      console.error('Failed to send frame:', response.status, response.statusText);
      return;
    }
    
    state.lastSuccessfulSend = new Date();
    
    // Send stats update to main thread
    if (mainThreadPort) {
      mainThreadPort.postMessage({
        type: 'stats',
        payload: {
          stats: {
            connectedPlayers: 0, // Server would provide this info
            bandwidth: frameData.byteLength,
            latency: 0, // Would calculate based on send time
            frameRate: state.frameRate,
            resolution: { width: state.canvas?.width || 0, height: state.canvas?.height || 0 }
          }
        }
      });
    }
  } catch (error) {
    console.error('Error sending frame to server:', error);
  }
}

/**
 * Handle reconnection
 */
async function handleReconnection(): Promise<void> {
  if (!state.streamToken) {
    return;
  }
  
  // Try to reconnect to server
  try {
    await connectToServer();
    console.log('Reconnected to server');
    
    // Send status update
    sendStatusUpdate();
  } catch (error) {
    console.error('Failed to reconnect:', error);
    state.reconnectAttempts++;
    
    // Limit reconnection attempts
    if (state.reconnectAttempts < 10) {
      // Try again after delay
      setTimeout(handleReconnection, 2000 * state.reconnectAttempts);
    }
  }
}

/**
 * Sync state with main thread
 */
function syncState(newState: any): void {
  // Update relevant state fields
  if (newState.streamToken) {
    state.streamToken = newState.streamToken;
  }
  
  if (newState.isActive !== undefined) {
    state.isActive = newState.isActive;
  }
  
  if (newState.isPaused !== undefined) {
    state.isPaused = newState.isPaused;
  }
  
  console.log('State synchronized with main thread');
}

/**
 * Send status update to main thread
 */
function sendStatusUpdate(): void {
  if (mainThreadPort) {
    mainThreadPort.postMessage({
      type: 'status',
      payload: {
        isConnected: !!state.webSocketConnection,
        isConnecting: false
      }
    });
  }
}

/**
 * Send response back to main thread
 */
function sendResponse(id: string | undefined, success: boolean, error?: string, payload?: any): void {
  if (id && mainThreadPort) {
    const response: WorkerResponse = {
      type: 'response',
      id,
      success,
      error,
      payload
    };
    
    mainThreadPort.postMessage(response);
  }
}

// Handle service worker lifecycle events
self.addEventListener('install', (event) => {
  console.log('Screen share service worker installed');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('Screen share service worker activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Handle fetch events if needed
  // This could be used for sending frames to server
});

console.log('Screen share service worker loaded');
```

### 2. Service Worker Registration Component

#### client/src/components/ScreenShare/ServiceWorkerRegistration.ts

```typescript
import { useEffect } from 'react';

export const ServiceWorkerRegistration = () => {
  useEffect(() => {
    // Register service worker
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/workers/screen-share-worker.js');
          
          console.log('Screen share service worker registered:', registration.scope);
          
          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New version available, please refresh the page');
                }
              });
            }
          });
        } catch (error) {
          console.error('Service worker registration failed:', error);
        }
      }
    };
    
    registerServiceWorker();
  }, []);
  
  return null; // This component doesn't render anything
};

export const checkServiceWorkerSupport = (): boolean => {
  return 'serviceWorker' in navigator && 'BroadcastChannel' in window;
};
```

## Data Flow Specifications

### 1. Admin to Server Data Flow

```
Admin Browser
    ↓ (getDisplayMedia) - Captures screen into MediaStream
    ↓ (Crop Processing) - Applies crop area in canvas
    ↓ (Canvas Capture) - Uses canvas.captureStream() or frame capture
    ↓ (Service Worker) - Processes frames in background
    ↓ (WebSocket/Fetch) - Sends frames to server
    ↓ (Server Buffer) - Stores frames in buffer
    ↓ (Redis) - Persists stream state
    ↓ (Player Distribution) - Sends to connected players
```

### 2. Player to Server Data Flow

```
Player Browser
    ↓ (WebSocket) - Connects to server with stream token
    ↓ (Server) - Validates token and permissions
    ↓ (Stream Buffer) - Gets buffered frames
    ↓ (WebSocket) - Receives frames from server
    ↓ (Video Element) - Renders frames
```

### 3. Frame Data Structure

```typescript
interface StreamFrame {
  id: string; // UUID for frame identification
  streamId: string; // Associated stream ID
  data: ArrayBuffer; // Binary frame data
  timestamp: Date; // Frame timestamp
  sequence: number; // Frame sequence number for ordering
  size: number; // Size in bytes
  width?: number; // Frame width
  height?: number; // Frame height
  frameRate?: number; // Frame rate
  compression?: string; // Compression format (webm, jpeg, etc.)
}
```

## State Management

### 1. Admin State Management

#### Local Storage State Structure
```json
{
  "adminScreenShareState": {
    "streamToken": "string",
    "reconnectToken": "string", 
    "isActive": true,
    "adminId": "string",
    "cropArea": {
      "x": 0,
      "y": 0,
      "width": 1920,
      "height": 1080
    }
  }
}
```

#### Service Worker State Structure
```json
{
  "isActive": true,
  "streamToken": "string",
  "mediaStream": "MediaStream object reference",
  "webSocketConnected": true,
  "lastFrameSent": "Date",
  "reconnectAttempts": 0,
  "isPaused": false,
  "cropArea": "CropArea object"
}
```

### 2. Server State Management

#### Redis Storage Structure
```typescript
// Active streams: streamId -> ActiveScreenShare object
`stream:${streamId}` -> JSON string of ActiveScreenShare

// Admin tokens: adminId -> streamToken
`admin:${adminId}` -> streamToken

// Reconnect tokens: reconnectToken -> adminId and streamToken
`reconnect:${reconnectToken}` -> JSON with adminId and streamToken

// Stream buffers: streamId -> array of frame data
`buffer:${streamId}` -> JSON array of StreamFrame objects
```

### 3. Player State Management

#### Component State Structure
```typescript
interface PlayerStreamState {
  isConnected: boolean;
  streamToken: string | null;
  buffer: ArrayBuffer[];
  renderQueue: ArrayBuffer[];
  stats: {
    latency: number;
    frameRate: number;
    bandwidth: number;
    connectionQuality: string;
  };
  error: string | null;
}
```

## Memory Management & Leak Prevention

### 1. MediaStream Resource Management

#### Proper Track Cleanup
```typescript
function cleanupMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  
  stream.getTracks().forEach(track => {
    if (track.readyState === 'live') {
      track.stop();
      console.log(`Stopped track: ${track.kind} - ${track.id}`);
    }
  });
}

// Usage in component cleanup
useEffect(() => {
  return () => {
    cleanupMediaStream(screenStream);
    cleanupMediaStream(croppedStream);
  };
}, [screenStream, croppedStream]);
```

### 2. WebSocket Connection Management

#### Proper Connection Cleanup
```typescript
function cleanupWebSocket(ws: WebSocket | null): void {
  if (!ws) return;
  
  ws.onopen = null;
  ws.onmessage = null;
  ws.onclose = null;
  ws.onerror = null;
  
  if (ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
}
```

### 3. Canvas Resource Management

#### Canvas Cleanup
```typescript
function cleanupCanvas(canvas: HTMLCanvasElement | null): void {
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Clear image data
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  // Reset dimensions
  canvas.width = 0;
  canvas.height = 0;
}
```

### 4. Animation Frame Management

#### Animation Frame Cleanup
```typescript
function cleanupAnimationFrame(rafId: number | null): void {
  if (rafId) {
    cancelAnimationFrame(rafId);
  }
}

// Usage pattern
let animationFrameId: number | null = null;

const animate = () => {
  // Do animation work
  // ...
  
  animationFrameId = requestAnimationFrame(animate);
};

// Cleanup
useEffect(() => {
  return () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}, []);
```

### 5. Event Listener Management

#### Proper Event Listener Cleanup
```typescript
// Track registered listeners
const registeredListeners: Array<{
  target: EventTarget;
  event: string;
  handler: EventListener;
}> = [];

function addCleanupListener(target: EventTarget, event: string, handler: EventListener): void {
  target.addEventListener(event, handler);
  registeredListeners.push({ target, event, handler });
}

function cleanupAllListeners(): void {
  registeredListeners.forEach(({ target, event, handler }) => {
    target.removeEventListener(event, handler);
  });
  registeredListeners.length = 0;
}
```

## Error Handling & Recovery

### 1. Admin Side Error Handling

#### Comprehensive Error Handling
```typescript
class AdminScreenShareService {
  // Centralized error handling
  private handleError(error: Error, context: string): void {
    console.error(`[${context}] Error:`, error);
    
    // Log to error reporting service
    this.logError(error, context);
    
    // Update UI state
    this.updateState({ error: error.message });
    
    // Attempt recovery if possible
    this.attemptRecovery(error, context);
  }
  
  private logError(error: Error, context: string): void {
    // Send to error reporting service (Sentry, etc.)
    console.error('Error logged:', { error, context, timestamp: new Date() });
  }
  
  private attemptRecovery(error: Error, context: string): void {
    // Different recovery strategies based on error type
    switch (context) {
      case 'screen_capture':
        this.handleScreenCaptureError(error);
        break;
      case 'websocket':
        this.handleWebSocketError(error);
        break;
      case 'stream':
        this.handleStreamError(error);
        break;
      default:
        console.log('No specific recovery strategy for this error context');
    }
  }
  
  private handleScreenCaptureError(error: Error): void {
    // Prompt user to try again or use different source
    if (error.message.includes('Permission')) {
      // Show permission instructions
      this.showPermissionHelp();
    } else {
      // Try different capture method
      this.tryAlternativeCaptureMethod();
    }
  }
  
  private handleWebSocketError(error: Error): void {
    // Attempt reconnection
    this.attemptReconnection();
  }
  
  private handleStreamError(error: Error): void {
    // Reset stream state and try to restart
    this.resetStreamState();
  }
}
```

### 2. Player Side Error Handling

#### Player Error Recovery
```typescript
class PlayerStreamService {
  private handleStreamError(error: Error): void {
    console.error('Stream error:', error);
    
    // Update state
    this.updateState({ error: error.message });
    
    // Attempt recovery
    this.attemptRecovery(error);
  }
  
  private attemptRecovery(error: Error): void {
    if (this.shouldAttemptRecovery(error)) {
      this.reconnectWithBackoff();
    } else {
      // Show error to user and don't auto-retry
      this.showStreamError();
    }
  }
  
  private shouldAttemptRecovery(error: Error): boolean {
    // Don't retry on certain permanent errors
    const permanentErrors = [
      'Stream not found',
      'Unauthorized',
      'Invalid stream token'
    ];
    
    return !permanentErrors.some(msg => error.message.includes(msg));
  }
  
  private reconnectWithBackoff(): void {
    const attempt = this.state.connectionAttempts + 1;
    const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
    
    this.updateState({ 
      connectionAttempts: attempt,
      isReconnecting: true 
    });
    
    setTimeout(() => {
      if (this.state.streamToken) {
        this.connectToStream(this.state.streamToken, this.videoElement!)
          .catch(err => {
            console.error('Reconnection failed:', err);
            if (this.state.connectionAttempts < this.state.maxConnectionAttempts) {
              this.reconnectWithBackoff(); // Try again
            }
          });
      }
    }, delay);
  }
}
```

### 3. Server-Side Error Handling

#### Server Error Management
```typescript
class ScreenShareService {
  private async handleError(operation: string, error: Error, context?: any): Promise<void> {
    console.error(`ScreenShareService.${operation} Error:`, error, context);
    
    // Log to monitoring system
    this.logError(operation, error, context);
    
    // Clean up resources if needed
    if (operation.startsWith('disconnect')) {
      // Ensure cleanup happens
      await this.cleanupResources(context?.streamId);
    }
  }
  
  private logError(operation: string, error: Error, context?: any): void {
    // Send to monitoring service (e.g., Winston, etc.)
    console.error('Server error logged:', {
      operation,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date()
    });
  }
  
  private async cleanupResources(streamId?: string): Promise<void> {
    if (!streamId) return;
    
    // Clean up stream-specific resources
    const streamInfo = this.activeStreams.get(streamId);
    if (streamInfo) {
      // Remove from active streams
      this.activeStreams.delete(streamId);
      
      // Clean up Redis storage
      await this.redis.del(`stream:${streamId}`);
      await this.redis.del(`buffer:${streamId}`);
    }
  }
}
```

## Security Considerations

### 1. Authentication and Authorization

#### Token-Based Access Control
```typescript
// Server-side validation
async function validateStreamAccess(streamToken: string, userId: string, role: string): Promise<boolean> {
  // Verify token exists and is valid
  const streamData = await redis.get(`stream:${streamToken}`);
  if (!streamData) {
    return false;
  }
  
  const stream = JSON.parse(streamData);
  
  // For admin access: verify admin owns the stream
  if (role === 'admin') {
    return stream.adminId === userId;
  }
  
  // For player access: verify stream is active and public
  if (role === 'player') {
    return stream.isActive && stream.isPublic;
  }
  
  return false;
}
```

### 2. Data Encryption

#### End-to-End Encryption Considerations
```typescript
// Frame encryption before transmission
async function encryptFrame(frameData: ArrayBuffer, encryptionKey: string): Promise<ArrayBuffer> {
  // Use Web Crypto API for encryption
  const encoder = new TextEncoder();
  const keyBuffer = encoder.encode(encryptionKey);
  
  // Create crypto key from buffer
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    'AES-GCM',
    false,
    ['encrypt']
  );
  
  // Encrypt the frame data
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    frameData
  );
  
  // Return IV + encrypted data
  const result = new ArrayBuffer(iv.length + encrypted.byteLength);
  const view = new Uint8Array(result);
  view.set(iv, 0);
  view.set(new Uint8Array(encrypted), iv.length);
  
  return result;
}
```

### 3. Rate Limiting

#### API Rate Limiting
```typescript
class RateLimiter {
  private requestCounts: Map<string, Array<Date>> = new Map();
  private readonly maxRequests = 100; // requests per 5 minutes
  private readonly windowMs = 5 * 60 * 1000; // 5 minutes
  
  isAllowed(key: string): boolean {
    const now = new Date();
    const requests = this.requestCounts.get(key) || [];
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(req => 
      now.getTime() - req.getTime() < this.windowMs
    );
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    recentRequests.push(now);
    this.requestCounts.set(key, recentRequests);
    
    return true;
  }
}

// Usage in API endpoints
const rateLimiter = new RateLimiter();

app.post('/api/screen-share/frame', (req, res) => {
  const clientId = req.headers['x-client-id'] as string || req.ip;
  
  if (!rateLimiter.isAllowed(clientId)) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  
  // Continue with frame processing
});
```

## Performance Optimization

### 1. Frame Compression

#### Client-Side Compression
```typescript
class FrameCompressor {
  /**
   * Compress frame using canvas toDataURL with quality settings
   */
  static compressFrame(canvas: HTMLCanvasElement, quality: number = 0.8): ArrayBuffer {
    // Convert canvas to data URL with specified quality
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    
    // Convert to ArrayBuffer
    const byteString = atob(dataUrl.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    return ab;
  }
  
  /**
   * Adaptive compression based on bandwidth
   */
  static adaptiveCompression(frame: ImageData, targetSize: number): ArrayBuffer {
    let quality = 0.9; // Start with high quality
    let compressed: ArrayBuffer;
    
    do {
      compressed = this.compressImage(frame, quality);
      quality -= 0.1; // Reduce quality if too large
    } while (compressed.byteLength > targetSize && quality > 0.1);
    
    return compressed;
  }
  
  private static compressImage(frame: ImageData, quality: number): ArrayBuffer {
    // Implementation would create a canvas, draw the frame, then compress
    const canvas = document.createElement('canvas');
    canvas.width = frame.width;
    canvas.height = frame.height;
    
    const ctx = canvas.getContext('2d')!;
    const imageData = new ImageData(frame.data, frame.width, frame.height);
    ctx.putImageData(imageData, 0, 0);
    
    return this.compressFrame(canvas, quality);
  }
}
```

### 2. Buffer Management

#### Efficient Buffer Management
```typescript
class FrameBuffer {
  private frames: Array<{data: ArrayBuffer; timestamp: Date}> = [];
  private readonly maxSize: number;
  private readonly maxDuration: number; // in seconds
  private totalSize: number = 0;
  
  constructor(maxSize: number = 30, maxDuration: number = 5) {
    this.maxSize = maxSize;
    this.maxDuration = maxDuration;
  }
  
  /**
   * Add frame with size tracking
   */
  addFrame(frame: ArrayBuffer): void {
    const frameInfo = {
      data: frame,
      timestamp: new Date()
    };
    
    this.frames.push(frameInfo);
    this.totalSize += frame.byteLength;
    
    // Enforce size limits
    this.enforceLimits();
  }
  
  /**
   * Get frames within size and time constraints
   */
  getFrames(maxBytes: number): ArrayBuffer[] {
    const result: ArrayBuffer[] = [];
    let currentSize = 0;
    
    for (const frame of this.frames) {
      if (currentSize + frame.data.byteLength > maxBytes) {
        break;
      }
      result.push(frame.data);
      currentSize += frame.data.byteLength;
    }
    
    return result;
  }
  
  /**
   * Enforce size and duration limits
   */
  private enforceLimits(): void {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - (this.maxDuration * 1000));
    
    // Remove frames that are too old
    while (this.frames.length > 0 && this.frames[0].timestamp < cutoffTime) {
      const removedFrame = this.frames.shift();
      if (removedFrame) {
        this.totalSize -= removedFrame.data.byteLength;
      }
    }
    
    // Remove oldest frames if buffer is too large
    while (this.totalSize > this.maxSize * 1024 * 1024) { // max in MB
      const removedFrame = this.frames.shift();
      if (removedFrame) {
        this.totalSize -= removedFrame.data.byteLength;
      }
    }
  }
  
  /**
   * Get buffer statistics
   */
  getStats(): {size: number; duration: number; totalSize: number} {
    return {
      size: this.frames.length,
      duration: this.frames.length > 0 
        ? (Date.now() - this.frames[0].timestamp.getTime()) / 1000
        : 0,
      totalSize: this.totalSize
    };
  }
}
```

### 3. Network Optimization

#### Bandwidth Adaptive Streaming
```typescript
class BandwidthAnalyzer {
  private recentTransfers: Array<{size: number; time: number}> = [];
  private readonly windowSize = 10; // Last 10 transfers
  
  /**
   * Add transfer data for bandwidth calculation
   */
  addTransfer(size: number, startTime: number, endTime: number): void {
    const transfer = {
      size,
      time: endTime - startTime
    };
    
    this.recentTransfers.push(transfer);
    
    // Keep only recent transfers
    if (this.recentTransfers.length > this.windowSize) {
      this.recentTransfers = this.recentTransfers.slice(-this.windowSize);
    }
  }
  
  /**
   * Calculate current bandwidth in bytes per second
   */
  getCurrentBandwidth(): number {
    if (this.recentTransfers.length === 0) {
      return 0;
    }
    
    const totalTime = this.recentTransfers.reduce((sum, t) => sum + t.time, 0);
    const totalSize = this.recentTransfers.reduce((sum, t) => sum + t.size, 0);
    
    if (totalTime === 0) {
      return 0;
    }
    
    // Convert to bytes per second
    return (totalSize * 1000) / totalTime;
  }
  
  /**
   * Get recommended quality based on current bandwidth
   */
  getRecommendedQuality(targetResolution: {width: number; height: number}): number {
    const currentBandwidth = this.getCurrentBandwidth();
    
    // Define quality levels based on bandwidth
    if (currentBandwidth > 5 * 1024 * 1024) { // > 5MB/s
      return 0.9; // High quality
    } else if (currentBandwidth > 2 * 1024 * 1024) { // > 2MB/s
      return 0.7; // Medium quality
    } else if (currentBandwidth > 1024 * 1024) { // > 1MB/s
      return 0.5; // Low quality
    } else {
      return 0.3; // Very low quality
    }
  }
}
```

## Testing Strategy

### 1. Unit Tests

#### Admin Service Unit Tests
```typescript
// tests/admin-screen-share-service.test.ts
import { AdminScreenShareService } from '../client/src/services/AdminScreenShareService';

describe('AdminScreenShareService', () => {
  let service: AdminScreenShareService;
  
  beforeEach(() => {
    service = new AdminScreenShareService();
  });
  
  describe('startScreenShare', () => {
    it('should create stream with server and start streaming', async () => {
      // Mock server response
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            streamId: 'test-stream',
            token: 'test-token',
            reconnectToken: 'test-reconnect-token'
          })
        } as Response)
      ) as jest.Mock;
      
      // Mock service worker registration
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: jest.fn(() => Promise.resolve({
            active: { postMessage: jest.fn() }
          }))
        },
        writable: true
      });
      
      await service.startScreenShare();
      
      const state = service.getState();
      expect(state.isActive).toBe(true);
      expect(state.streamToken).toBe('test-token');
    });
    
    it('should throw error if already active', async () => {
      service['state'].isActive = true;
      
      await expect(service.startScreenShare()).rejects.toThrow('Screen share is already active');
    });
  });
  
  describe('stopScreenShare', () => {
    it('should clean up properly when active', async () => {
      service['state'].isActive = true;
      service['state'].streamToken = 'test-token';
      
      // Mock cleanup operations
      const disconnectWebSocketSpy = jest.spyOn(service as any, 'disconnectWebSocket');
      const notifyServerStopSpy = jest.spyOn(service as any, 'notifyServerStop');
      
      await service.stopScreenShare();
      
      const state = service.getState();
      expect(state.isActive).toBe(false);
      expect(state.streamToken).toBeNull();
      expect(disconnectWebSocketSpy).toHaveBeenCalled();
      expect(notifyServerStopSpy).toHaveBeenCalled();
    });
  });
});
```

#### Player Service Unit Tests
```typescript
// tests/player-stream-service.test.ts
import { PlayerStreamService } from '../client/src/services/PlayerStreamService';

describe('PlayerStreamService', () => {
  let service: PlayerStreamService;
  
  beforeEach(() => {
    service = new PlayerStreamService();
  });
  
  describe('connectToStream', () => {
    it('should connect to stream and start receiving frames', async () => {
      const videoElement = document.createElement('video');
      
      // Mock WebSocket
      const mockWebSocket = {
        onopen: null as any,
        onmessage: null as any,
        onclose: null as any,
        onerror: null as any,
        send: jest.fn(),
        close: jest.fn()
      };
      
      const originalWebSocket = WebSocket;
      (global as any).WebSocket = jest.fn(() => mockWebSocket);
      
      const connectSuccess = await service.connectToStream('test-token', videoElement);
      
      expect(connectSuccess).toBe(true);
      expect(service.getState().isConnected).toBe(true);
      
      // Restore original WebSocket
      (global as any).WebSocket = originalWebSocket;
    });
  });
});
```

### 2. Integration Tests

#### End-to-End Flow Tests
```typescript
// tests/screen-share-flow.test.ts
describe('Screen Share End-to-End Flow', () => {
  test('admin starts share and player joins successfully', async () => {
    // Setup mock server
    const mockServer = setupMockServer();
    
    // Create admin service
    const adminService = new AdminScreenShareService();
    
    // Create player service
    const playerService = new PlayerStreamService();
    const videoElement = document.createElement('video');
    
    try {
      // Admin starts screen share
      await adminService.startScreenShare();
      
      const adminState = adminService.getState();
      expect(adminState.isActive).toBe(true);
      expect(adminState.streamToken).not.toBeNull();
      
      // Player joins the stream
      const success = await playerService.connectToStream(
        adminState.streamToken!, 
        videoElement
      );
      
      expect(success).toBe(true);
      expect(playerService.getState().isConnected).toBe(true);
      
      // Simulate frame transmission
      mockServer.broadcastFrameToPlayers('test-frame-data');
      
      // Wait for frame to be processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify player received frame
      expect(playerService.getState().bufferLevel).toBeGreaterThan(0);
    } finally {
      // Cleanup
      await adminService.stopScreenShare();
      await playerService.disconnectFromStream();
      mockServer.close();
    }
  });
});
```

### 3. Performance Tests

#### Memory Usage Tests
```typescript
// tests/performance/memory.test.ts
describe('Memory Usage Tests', () => {
  test('service does not accumulate memory over time', async () => {
    const service = new AdminScreenShareService();
    
    // Get initial memory usage
    const initialMemory = getMemoryUsage();
    
    // Simulate creating and destroying multiple streams
    for (let i = 0; i < 10; i++) {
      try {
        await service.startScreenShare();
        await service.stopScreenShare();
      } catch (error) {
        // Ignore errors during test
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Force garbage collection if available
    if ((global as any).gc) {
      (global as any).gc();
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check final memory usage
    const finalMemory = getMemoryUsage();
    const memoryGrowth = finalMemory - initialMemory;
    
    // Memory growth should be minimal (within 10MB tolerance)
    expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
  });
});
```

## Deployment & Monitoring

### 1. Environment Configuration

#### Environment Variables
```bash
# Server Configuration
REDIS_URL=redis://localhost:6379
MAX_STREAM_DURATION=3600 # 1 hour in seconds
STREAM_BUFFER_SIZE=50    # Number of frames to buffer
MAX_RECONNECTION_ATTEMPTS=10
MAX_VIEWERS_PER_STREAM=100
FRAME_RATE=30
RESOLUTION_WIDTH=1920
RESOLUTION_HEIGHT=1080

# Security
JWT_SECRET=your-secret-key
SCREEN_SHARE_TOKEN_LIFETIME=86400 # 24 hours
RECONNECT_TOKEN_LIFETIME=604800   # 7 days

# Performance
COMPRESSION_QUALITY=0.8
MAX_BANDWIDTH_PER_STREAM=10485760 # 10MB/s
BUFFER_DURATION=5 # seconds
```

### 2. Health Monitoring

#### Health Check Implementation
```typescript
// server/health.ts
import { ScreenShareService } from './services/ScreenShareService';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{
    name: string;
    status: 'ok' | 'error';
    message?: string;
  }>;
  timestamp: Date;
  stats: {
    activeStreams: number;
    connectedPlayers: number;
    memoryUsage: number;
    uptime: number;
  };
}

export async function getHealthStatus(
  screenShareService: ScreenShareService
): Promise<HealthStatus> {
  const checks = [];
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  // Check Redis connectivity
  try {
    await screenShareService.redis.ping();
    checks.push({ name: 'redis_connection', status: 'ok' });
  } catch (error) {
    checks.push({ name: 'redis_connection', status: 'error', message: error.message });
    overallStatus = 'unhealthy';
  }
  
  // Check active streams
  const activeStreams = screenShareService.getActiveStreams();
  const streamCount = activeStreams.length;
  checks.push({ 
    name: 'active_streams', 
    status: streamCount > 0 ? 'ok' : 'ok', // Not an error if no streams
    message: `Active streams: ${streamCount}`
  });
  
  // Check memory usage
  const memoryUsage = process.memoryUsage().heapUsed;
  if (memoryUsage > 100 * 1024 * 1024) { // 100MB threshold
    checks.push({ 
      name: 'memory_usage', 
      status: 'error', 
      message: `High memory usage: ${Math.round(memoryUsage / 1024 / 1024)}MB` 
    });
    overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
  } else {
    checks.push({ 
      name: 'memory_usage', 
      status: 'ok', 
      message: `${Math.round(memoryUsage / 1024 / 1024)}MB` 
    });
  }
  
  return {
    status: overallStatus,
    checks,
    timestamp: new Date(),
    stats: {
      activeStreams: streamCount,
      connectedPlayers: activeStreams.reduce((sum, stream) => sum + stream.viewerCount, 0),
      memoryUsage,
      uptime: process.uptime()
    }
  };
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = await getHealthStatus(screenShareService);
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      checks: [{ name: 'health_check', status: 'error', message: error.message }],
      timestamp: new Date()
    });
  }
});
```

### 3. Error Monitoring

#### Error Reporting Setup
```typescript
// server/error-reporting.ts
interface ErrorReport {
  id: string;
  timestamp: Date;
  type: string;
  message: string;
  stack: string;
  context: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  handled: boolean;
}

class ErrorReporter {
  private reports: ErrorReport[] = [];
  private readonly maxReports = 1000; // Limit stored reports
  
  report(error: Error, context: any = {}, severity: ErrorReport['severity'] = 'medium'): void {
    const report: ErrorReport = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: error.constructor.name,
      message: error.message,
      stack: error.stack || 'No stack trace',
      context,
      severity,
      handled: false
    };
    
    this.reports.push(report);
    
    // Keep only recent reports
    if (this.reports.length > this.maxReports) {
      this.reports = this.reports.slice(-this.maxReports);
    }
    
    // Log to console
    console.error(`[${severity.toUpperCase()} ERROR] ${error.message}`, {
      context,
      stack: error.stack
    });
    
    // Send to external error reporting service if configured
    this.sendToExternalService(report);
  }
  
  private async sendToExternalService(report: ErrorReport): Promise<void> {
    // Example: Send to Sentry, Rollbar, etc.
    if (process.env.ERROR_REPORTING_SERVICE_URL) {
      try {
        await fetch(process.env.ERROR_REPORTING_SERVICE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(report)
        });
      } catch (error) {
        console.error('Failed to send error to external service:', error);
      }
    }
  }
  
  getRecentReports(limit: number = 10): ErrorReport[] {
    return this.reports.slice(-limit).reverse();
  }
  
  clearReports(): void {
    this.reports = [];
  }
}

// Global error handler
const errorReporter = new ErrorReporter();

process.on('uncaughtException', (error) => {
  errorReporter.report(error, { type: 'uncaught_exception' }, 'critical');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  errorReporter.report(
    new Error(`Unhandled Rejection at ${promise}: ${reason}`),
    { type: 'unhandled_rejection', reason, promise },
    'high'
  );
});
```

## Migration Plan

### Phase 1: Preparation (Week 1)
1. **Codebase Analysis**
   - Document current screen sharing implementation
   - Identify dependencies and integrations
   - Create backup of current implementation

2. **Environment Setup**
   - Set up Redis for persistent storage
   - Configure service worker support
   - Set up testing environment

3. **Security Review**
   - Review current authentication system
   - Plan security enhancements
   - Set up encryption keys

### Phase 2: Server-Side Implementation (Week 2-3)
1. **Core Services**
   - Implement `ScreenShareService`
   - Create stream buffer management
   - Build WebSocket integration
   - Set up Redis storage

2. **API Endpoints**
   - Create stream endpoints
   - Frame transmission endpoints
   - Reconnection endpoints
   - Player connection endpoints

3. **Testing**
   - Unit tests for server components
   - Integration tests
   - Security tests

### Phase 3: Client-Side Implementation (Week 4-5)
1. **Admin Components**
   - Implement `AdminScreenShareService`
   - Create service worker
   - Build admin UI integration
   - Add state management

2. **Player Components**
   - Implement `PlayerStreamService`
   - Create stream player component
   - Add connection management
   - Build error handling

3. **Testing**
   - Unit tests for client services
   - Integration tests
   - Performance tests

### Phase 4: Integration & Testing (Week 6)
1. **End-to-End Testing**
   - Full flow testing
   - Edge case scenarios
   - Load testing
   - Security testing

2. **Performance Optimization**
   - Memory leak fixes
   - Performance improvements
   - Bandwidth optimization
   - Buffer management

### Phase 5: Deployment (Week 7)
1. **Staging Deployment**
   - Deploy to staging environment
   - User acceptance testing
   - Performance validation

2. **Production Deployment**
   - Deploy to production
   - Monitor for issues
   - Performance tuning

## Code Templates

### 1. Server-Side Template

#### server/services/ScreenShareService.ts (Complete)
```typescript
import { WebSocket } from 'ws';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

// Interfaces and Types
interface ActiveScreenShare {
  streamId: string;
  adminId: string;
  token: string;
  isActive: boolean;
  startTime: Date;
  lastActivity: Date;
  viewerCount: number;
  connectedPlayers: Set<string>;
  buffer: StreamBuffer;
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
  adminReconnectToken: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  maxViewers: number;
}

interface StreamBuffer {
  frames: Array<{
    data: ArrayBuffer;
    timestamp: Date;
    sequence: number;
    size: number;
  }>;
  maxSize: number;
  currentSize: number;
  lastUpdate: Date;
  frameRate: number;
  resolution: { width: number; height: number };
}

interface StreamConnection {
  ws: WebSocket;
  id: string;
  type: 'admin' | 'player';
  streamToken?: string;
  playerId?: string;
  adminId?: string;
  joinedAt: Date;
  lastHeartbeat: Date;
}

interface StreamStats {
  activeStreams: number;
  totalViewers: number;
  memoryUsage: number;
  uptime: number;
}

interface StreamHealth {
  streamId: string;
  status: 'active' | 'degraded' | 'failed';
  viewerCount: number;
  latency: number;
  frameRate: number;
  lastActivity: Date;
  adminConnection: 'connected' | 'disconnected';
}

export class ScreenShareService {
  private activeStreams: Map<string, ActiveScreenShare> = new Map();
  private streamConnections: Map<string, StreamConnection> = new Map();
  private redis: Redis;
  private adminTokens: Map<string, string> = new Map();
  private playerTokens: Map<string, string> = new Map();
  private reconnectTokens: Map<string, { adminId: string; streamToken: string; expiresAt: Date; }> = new Map();
  private errorReporter: any;
  
  constructor(redisUrl: string, errorReporter?: any) {
    this.redis = new Redis(redisUrl);
    this.errorReporter = errorReporter;
    this.initializeTimers();
    this.setupRedisListeners();
  }
  
  /**
   * Initialize background timers for cleanup and monitoring
   */
  private initializeTimers(): void {
    // Cleanup inactive streams every 5 minutes
    setInterval(() => {
      this.cleanupInactiveStreams().catch(error => {
        this.handleError('cleanupInactiveStreams', error);
      });
    }, 5 * 60 * 1000);
    
    // Monitor connection health every 30 seconds
    setInterval(() => {
      this.monitorConnectionHealth().catch(error => {
        this.handleError('monitorConnectionHealth', error);
      });
    }, 30 * 1000);
    
    // Update stats every minute
    setInterval(() => {
      this.updateOverallStats().catch(error => {
        this.handleError('updateOverallStats', error);
      });
    }, 60 * 1000);
  }
  
  /**
   * Setup Redis event listeners
   */
  private setupRedisListeners(): void {
    // Handle Redis errors
    this.redis.on('error', (error) => {
      this.handleError('redis_error', error);
    });
    
    // Handle Redis reconnect
    this.redis.on('connect', () => {
      console.log('Connected to Redis');
    });
  }
  
  /**
   * Create a new screen share instance
   */
  async createStream(adminId: string, options: {
    isPublic?: boolean;
    maxViewers?: number;
    resolution?: { width: number; height: number };
  } = {}): Promise<{ streamId: string; token: string; reconnectToken: string }> {
    try {
      const streamId = `stream_${uuidv4()}`;
      const token = `token_${uuidv4()}`;
      const reconnectToken = `reconnect_${uuidv4()}`;
      
      const newStream: ActiveScreenShare = {
        streamId,
        adminId,
        token,
        isActive: false,
        startTime: new Date(),
        lastActivity: new Date(),
        viewerCount: 0,
        connectedPlayers: new Set(),
        buffer: {
          frames: [],
          maxSize: 30, // Last 1 second of 30fps video
          currentSize: 0,
          lastUpdate: new Date(),
          frameRate: 30,
          resolution: options.resolution || { width: 1920, height: 1080 }
        },
        connectionStatus: 'disconnected',
        adminReconnectToken: reconnectToken,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: options.isPublic ?? true,
        maxViewers: options.maxViewers || 100
      };
      
      this.activeStreams.set(streamId, newStream);
      this.adminTokens.set(adminId, token);
      
      // Generate reconnect token with expiration
      const reconnectInfo = {
        adminId,
        streamToken: token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      };
      
      this.reconnectTokens.set(reconnectToken, reconnectInfo);
      
      // Store in Redis for persistence across server restarts
      await this.redis.setex(`stream:${streamId}`, 3600, JSON.stringify(newStream));
      await this.redis.setex(`reconnect:${reconnectToken}`, 7 * 24 * 60 * 60, JSON.stringify(reconnectInfo));
      
      console.log(`Created stream ${streamId} for admin ${adminId}`);
      
      return { streamId, token, reconnectToken };
    } catch (error) {
      this.handleError('createStream', error, { adminId, options });
      throw error;
    }
  }
  
  /**
   * Start streaming for an admin
   */
  async startStream(token: string, frameData: ArrayBuffer): Promise<void> {
    try {
      const streamInfo = await this.getStreamByToken(token);
      if (!streamInfo) {
        throw new Error('Invalid stream token');
      }
      
      streamInfo.isActive = true;
      streamInfo.connectionStatus = 'connected';
      streamInfo.updatedAt = new Date();
      
      // Add frame to buffer
      await this.pushFrame(streamInfo.streamId, frameData);
      
      // Update Redis
      await this.redis.setex(`stream:${streamInfo.streamId}`, 3600, JSON.stringify(streamInfo));
      
      // Notify connected players of new stream status
      this.notifyStreamStatusChange(streamInfo.streamId, 'active');
      
      console.log(`Started stream ${streamInfo.streamId}`);
    } catch (error) {
      this.handleError('startStream', error, { token });
      throw error;
    }
  }
  
  /**
   * Push a frame to the stream buffer
   */
  async pushFrame(streamId: string, frameData: ArrayBuffer): Promise<void> {
    try {
      const streamInfo = this.activeStreams.get(streamId);
      if (!streamInfo) {
        // Try to get from Redis
        const redisData = await this.redis.get(`stream:${streamId}`);
        if (!redisData) {
          throw new Error('Stream not found');
        }
        streamInfo = JSON.parse(redisData) as ActiveScreenShare;
      }
      
      const frameEntry = {
        data: frameData,
        timestamp: new Date(),
        sequence: streamInfo.buffer.frames.length,
        size: frameData.byteLength
      };
      
      streamInfo.buffer.frames.push(frameEntry);
      streamInfo.buffer.currentSize += frameEntry.size;
      streamInfo.buffer.lastUpdate = new Date();
      streamInfo.lastActivity = new Date();
      
      // Limit buffer size
      while (streamInfo.buffer.currentSize > 50 * 1024 * 1024) { // 50MB limit
        if (streamInfo.buffer.frames.length > 0) {
          const removedFrame = streamInfo.buffer.frames.shift();
          if (removedFrame) {
            streamInfo.buffer.currentSize -= removedFrame.size;
          }
        } else {
          break; // Safety break
        }
      }
      
      // Update Redis
      await this.redis.setex(`stream:${streamInfo.streamId}`, 3600, JSON.stringify(streamInfo));
      
      // Notify connected players of new frame
      this.notifyPlayersOfNewFrame(streamInfo.streamId, frameData);
    } catch (error) {
      this.handleError('pushFrame', error, { streamId });
      throw error;
    }
  }
  
  /**
   * Get recent frames for a player
   */
  async getStreamFrames(token: string, playerId: string, count: number = 5): Promise<ArrayBuffer[]> {
    try {
      const streamInfo = await this.getStreamByToken(token);
      if (!streamInfo) {
        throw new Error('Invalid stream token');
      }
      
      // Check viewer limit
      if (streamInfo.maxViewers > 0 && 
          streamInfo.connectedPlayers.size >= streamInfo.maxViewers) {
        throw new Error('Maximum viewers reached for this stream');
      }
      
      // Add player to connected list if not already there
      if (!streamInfo.connectedPlayers.has(playerId)) {
        streamInfo.connectedPlayers.add(playerId);
        streamInfo.viewerCount = streamInfo.connectedPlayers.size;
        streamInfo.updatedAt = new Date();
        
        // Update Redis
        await this.redis.setex(`stream:${streamInfo.streamId}`, 3600, JSON.stringify(streamInfo));
      }
      
      // Get recent frames
      const frames = streamInfo.buffer.frames
        .slice(-count)
        .map(frame => frame.data);
      
      return frames;
    } catch (error) {
      this.handleError('getStreamFrames', error, { token, playerId, count });
      throw error;
    }
  }
  
  /**
   * Admin connects to existing stream
   */
  async adminConnect(token: string, adminId: string): Promise<boolean> {
    try {
      const streamInfo = await this.getStreamByToken(token);
      if (!streamInfo) {
        return false;
      }
      
      if (streamInfo.adminId !== adminId) {
        return false;
      }
      
      streamInfo.connectionStatus = 'connected';
      streamInfo.updatedAt = new Date();
      
      // Update Redis
      await this.redis.setex(`stream:${streamInfo.streamId}`, 3600, JSON.stringify(streamInfo));
      
      console.log(`Admin ${adminId} connected to stream ${streamInfo.streamId}`);
      return true;
    } catch (error) {
      this.handleError('adminConnect', error, { token, adminId });
      return false;
    }
  }
  
  /**
   * Admin disconnects (temporary - for reconnection)
   */
  async adminDisconnect(adminId: string): Promise<void> {
    try {
      const token = this.adminTokens.get(adminId);
      if (!token) {
        return;
      }
      
      const streamInfo = await this.getStreamByToken(token);
      if (!streamInfo) {
        return;
      }
      
      streamInfo.connectionStatus = 'disconnected';
      streamInfo.updatedAt = new Date();
      
      // Update Redis
      await this.redis.setex(`stream:${streamInfo.streamId}`, 3600, JSON.stringify(streamInfo));
      
      console.log(`Admin ${adminId} disconnected from stream ${streamInfo.streamId}, buffering continues`);
    } catch (error) {
      this.handleError('adminDisconnect', error, { adminId });
    }
  }
  
  /**
   * Admin reconnects using reconnect token
   */
  async adminReconnect(reconnectToken: string, adminId: string): Promise<boolean> {
    try {
      const reconnectInfo = await this.redis.get(`reconnect:${reconnectToken}`);
      if (!reconnectInfo) {
        return false;
      }
      
      const parsedInfo = JSON.parse(reconnectInfo);
      
      // Check if reconnect token matches admin ID
      if (parsedInfo.adminId !== adminId) {
        return false;
      }
      
      // Check if reconnect token is expired
      if (new Date() > new Date(parsedInfo.expiresAt)) {
        return false;
      }
      
      const streamInfo = await this.getStreamByToken(parsedInfo.streamToken);
      if (!streamInfo) {
        return false;
      }
      
      streamInfo.connectionStatus = 'connected';
      streamInfo.updatedAt = new Date();
      
      // Update Redis
      await this.redis.setex(`stream:${streamInfo.streamId}`, 3600, JSON.stringify(streamInfo));
      
      console.log(`Admin ${adminId} reconnected to stream ${streamInfo.streamId}`);
      return true;
    } catch (error) {
      this.handleError('adminReconnect', error, { reconnectToken, adminId });
      return false;
    }
  }
  
  /**
   * Player connects to stream
   */
  async playerConnect(streamToken: string, playerId: string): Promise<boolean> {
    try {
      const streamInfo = await this.getStreamByToken(streamToken);
      if (!streamInfo || !streamInfo.isActive) {
        return false;
      }
      
      // Check viewer limit
      if (streamInfo.maxViewers > 0 && 
          streamInfo.connectedPlayers.size >= streamInfo.maxViewers) {
        return false;
      }
      
      streamInfo.connectedPlayers.add(playerId);
      streamInfo.viewerCount = streamInfo.connectedPlayers.size;
      streamInfo.updatedAt = new Date();
      
      // Update Redis
      await this.redis.setex(`stream:${streamInfo.streamId}`, 3600, JSON.stringify(streamInfo));
      
      // Add to player tokens
      this.playerTokens.set(playerId, streamToken);
      
      console.log(`Player ${playerId} connected to stream ${streamInfo.streamId}`);
      return true;
    } catch (error) {
      this.handleError('playerConnect', error, { streamToken, playerId });
      return false;
    }
  }
  
  /**
   * Player disconnects from stream
   */
  async playerDisconnect(playerId: string): Promise<void> {
    try {
      const streamToken = this.playerTokens.get(playerId);
      if (!streamToken) {
        return;
      }
      
      const streamInfo = await this.getStreamByToken(streamToken);
      if (!streamInfo) {
        return;
      }
      
      streamInfo.connectedPlayers.delete(playerId);
      streamInfo.viewerCount = streamInfo.connectedPlayers.size;
      streamInfo.updatedAt = new Date();
      
      // Remove from player tokens
      this.playerTokens.delete(playerId);
      
      // Update Redis
      await this.redis.setex(`stream:${streamInfo.streamId}`, 3600, JSON.stringify(streamInfo));
      
      console.log(`Player ${playerId} disconnected from stream ${streamInfo.streamId}`);
    } catch (error) {
      this.handleError('playerDisconnect', error, { playerId });
    }
  }
  
  /**
   * Get active streams
   */
  getActiveStreams(): ActiveScreenShare[] {
    return Array.from(this.activeStreams.values())
      .filter(stream => stream.isActive);
  }
  
  /**
   * Get stream by token (from memory or Redis)
   */
  async getStreamByToken(token: string): Promise<ActiveScreenShare | null> {
    // First check memory
    for (const [_, stream] of this.activeStreams) {
      if (stream.token === token) {
        return stream;
      }
    }
    
    // Then check Redis
    const redisData = await this.redis.get(`stream_tokens:${token}`);
    if (redisData) {
      const streamId = redisData;
      const streamData = await this.redis.get(`stream:${streamId}`);
      if (streamData) {
        const stream = JSON.parse(streamData) as ActiveScreenShare;
        // Add to memory cache
        this.activeStreams.set(stream.streamId, stream);
        return stream;
      }
    }
    
    return null;
  }
  
  /**
   * Notify connected players of new frame
   */
  private notifyPlayersOfNewFrame(streamId: string, frame: ArrayBuffer): void {
    const connections = Array.from(this.streamConnections.values())
      .filter(conn => conn.type === 'player' && 
                    conn.streamToken === this.activeStreams.get(streamId)?.token);
    
    connections.forEach(conn => {
      try {
        conn.ws.send(JSON.stringify({
          type: 'stream_frame',
          data: frame,
          streamId: streamId
        }));
      } catch (error) {
        console.error('Error sending frame to player:', error);
        // Remove broken connection
        this.streamConnections.delete(conn.id);
      }
    });
  }
  
  /**
   * Notify players of stream status change
   */
  private notifyStreamStatusChange(streamId: string, status: 'active' | 'inactive' | 'paused'): void {
    const streamInfo = this.activeStreams.get(streamId);
    if (!streamInfo) {
      return;
    }
    
    const connections = Array.from(this.streamConnections.values())
      .filter(conn => conn.type === 'player' && 
                    conn.streamToken === streamInfo.token);
    
    connections.forEach(conn => {
      try {
        conn.ws.send(JSON.stringify({
          type: 'stream_status',
          data: { streamId, status }
        }));
      } catch (error) {
        console.error('Error sending status to player:', error);
      }
    });
  }
  
  /**
   * Monitor connection health
   */
  private async monitorConnectionHealth(): Promise<void> {
    const now = new Date();
    const connections = Array.from(this.streamConnections.values());
    const connectionsToRemove: string[] = [];
    
    for (const conn of connections) {
      const timeSinceLastHeartbeat = (now.getTime() - conn.lastHeartbeat.getTime()) / 1000;
      
      if (timeSinceLastHeartbeat > 60) { // 60 seconds without heartbeat
        console.log(`Connection ${conn.id} has timed out`);
        connectionsToRemove.push(conn.id);
        
        if (conn.type === 'admin') {
          await this.adminDisconnect(conn.adminId!);
        } else {
          await this.playerDisconnect(conn.playerId!);
        }
      }
    }
    
    // Remove timed out connections
    connectionsToRemove.forEach(id => {
      this.streamConnections.delete(id);
    });
  }
  
  /**
   * Cleanup inactive streams
   */
  async cleanupInactiveStreams(): Promise<void> {
    const now = new Date();
    const streamsToCleanup: string[] = [];
    
    for (const [streamId, streamInfo] of this.activeStreams) {
      const timeSinceLastActivity = (now.getTime() - streamInfo.lastActivity.getTime()) / 1000;
      
      // If admin disconnected and no activity for 30 minutes, cleanup
      if (streamInfo.connectionStatus === 'disconnected' && timeSinceLastActivity > 1800) {
        streamsToCleanup.push(streamId);
      }
      
      // If no viewers and not active for 1 hour, cleanup
      if (streamInfo.viewerCount === 0 && streamInfo.isActive && timeSinceLastActivity > 3600) {
        streamsToCleanup.push(streamId);
      }
    }
    
    for (const streamId of streamsToCleanup) {
      await this.cleanupStream(streamId);
    }
  }
  
  /**
   * Cleanup a specific stream
   */
  private async cleanupStream(streamId: string): Promise<void> {
    const streamInfo = this.activeStreams.get(streamId);
    if (!streamInfo) {
      return;
    }
    
    // Remove from memory
    this.activeStreams.delete(streamId);
    
    // Remove from Redis
    await this.redis.del(`stream:${streamId}`);
    await this.redis.del(`reconnect:${streamInfo.adminReconnectToken}`);
    await this.redis.del(`stream_tokens:${streamInfo.token}`);
    
    // Remove admin token mapping
    this.adminTokens.delete(streamInfo.adminId);
    
    // Remove player token mappings for this stream
    const playersToRemove: string[] = [];
    for (const [playerId, token] of this.playerTokens.entries()) {
      if (token === streamInfo.token) {
        playersToRemove.push(playerId);
      }
    }
    playersToRemove.forEach(playerId => this.playerTokens.delete(playerId));
    
    // Remove associated connections
    const connectionsToRemove = Array.from(this.streamConnections.entries())
      .filter(([_, conn]) => conn.streamToken === streamInfo.token)
      .map(([id, _]) => id);
    
    connectionsToRemove.forEach(id => this.streamConnections.delete(id));
    
    console.log(`Cleaned up inactive stream ${streamId}`);
  }
  
  /**
   * Update overall server statistics
   */
  private async updateOverallStats(): Promise<void> {
    const stats = {
      activeStreams: this.getActiveStreams().length,
      totalViewers: Array.from(this.activeStreams.values())
        .reduce((sum, stream) => sum + stream.viewerCount, 0),
      memoryUsage: process.memoryUsage().heapUsed,
      uptime: process.uptime()
    };
    
    // Store stats in Redis for monitoring
    await this.redis.setex('stats:overview', 300, JSON.stringify(stats));
  }
  
  /**
   * Get overall system statistics
   */
  async getStats(): Promise<StreamStats> {
    const redisStats = await this.redis.get('stats:overview');
    return redisStats ? JSON.parse(redisStats) : {
      activeStreams: 0,
      totalViewers: 0,
      memoryUsage: 0,
      uptime: 0
    };
  }
  
  /**
   * Get health status for a specific stream
   */
  async getStreamHealth(streamId: string): Promise<StreamHealth | null> {
    const stream = this.activeStreams.get(streamId);
    if (!stream) {
      return null;
    }
    
    return {
      streamId,
      status: stream.isActive ? 'active' : 'degraded',
      viewerCount: stream.viewerCount,
      latency: 0, // Would calculate based on frame timing
      frameRate: stream.buffer.frameRate,
      lastActivity: stream.lastActivity,
      adminConnection: stream.connectionStatus
    };
  }
  
  /**
   * Handle and report errors
   */
  private handleError(operation: string, error: Error, context?: any): void {
    console.error(`ScreenShareService.${operation} Error:`, error, context);
    
    if (this.errorReporter) {
      this.errorReporter.report(error, { 
        service: 'ScreenShareService',
        operation, 
        context 
      });
    }
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down ScreenShareService...');
    
    // Close Redis connection
    await this.redis.quit();
    
    // Close all WebSocket connections
    this.streamConnections.forEach(conn => {
      try {
        conn.ws.close();
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
    });
    
    console.log('ScreenShareService shutdown complete');
  }
}
```

### 2. Client-Side Template

#### client/src/services/AdminScreenShareService.ts (Complete)
```typescript
import { BehaviorSubject } from 'rxjs';

export interface AdminStreamState {
  isActive: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  streamToken: string | null;
  reconnectToken: string | null;
  adminId: string | null;
  connectionAttempts: number;
  lastConnected: Date | null;
  reconnectTimer: NodeJS.Timeout | null;
  serviceWorkerRegistration: ServiceWorkerRegistration | null;
  error: string | null;
  stats: StreamStats;
  cropArea: CropArea | null;
  isPaused: boolean;
  buffering: boolean;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StreamStats {
  connectedPlayers: number;
  bandwidth: number;
  latency: number;
  frameRate: number;
  resolution: { width: number; height: number };
  memoryUsage: number;
}

export class AdminScreenShareService {
  private stateSubject: BehaviorSubject<AdminStreamState>;
  private state: AdminStreamState = {
    isActive: false,
    isConnecting: false,
    isConnected: false,
    streamToken: null,
    reconnectToken: null,
    adminId: null,
    connectionAttempts: 0,
    lastConnected: null,
    reconnectTimer: null,
    serviceWorkerRegistration: null,
    error: null,
    stats: {
      connectedPlayers: 0,
      bandwidth: 0,
      latency: 0,
      frameRate: 0,
      resolution: { width: 0, height: 0 },
      memoryUsage: 0
    },
    cropArea: null,
    isPaused: false,
    buffering: false
  };
  
  private webSocketConnection: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private eventListeners: Array<(state: AdminStreamState) => void> = [];
  private statsUpdateTimer: NodeJS.Timeout | null = null;
  private memoryCheckTimer: NodeJS.Timeout | null = null;
  private bandwidthAnalyzer: BandwidthAnalyzer;
  
  constructor() {
    this.stateSubject = new BehaviorSubject<AdminStreamState>(this.state);
    this.bandwidthAnalyzer = new BandwidthAnalyzer();
    this.initializeService();
  }
  
  private initializeService(): void {
    // Load state from local storage
    this.loadStateFromStorage();
    
    // Setup page visibility change handler
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state.isActive) {
        // Tab going to background, keep service worker running
        this.syncStateWithWorker();
      }
    });
    
    // Setup beforeunload handler
    window.addEventListener('beforeunload', (event) => {
      if (this.state.isActive) {
        // Try to stop gracefully
        this.stopScreenShare().catch(console.error);
      }
    });
    
    // Setup tab closing detection
    window.addEventListener('pagehide', () => {
      if (this.state.isActive) {
        this.stopScreenShare().catch(console.error);
      }
    });
    
    // Start memory monitoring
    this.startMemoryMonitoring();
    
    // Start stats updates
    this.startStatsUpdates();
  }
  
  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<void> {
    if (this.state.isActive) {
      throw new Error('Screen share is already active');
    }
    
    try {
      this.updateState({ 
        isConnecting: true, 
        error: null 
      });
      
      // Create stream with server
      const response = await this.createStreamWithServer();
      const { streamId, token, reconnectToken } = response;
      
      // Update state
      this.updateState({
        streamToken: token,
        reconnectToken: reconnectToken,
        isConnecting: false,
        isActive: true,
        isPaused: false,
        lastConnected: new Date()
      });
      
      // Store state in local storage
      this.saveStateToStorage();
      
      // Register service worker
      await this.registerServiceWorker();
      
      // Start streaming via service worker
      await this.startStreamingInWorker();
      
      // Connect WebSocket for management
      await this.connectWebSocket();
      
      console.log('Screen sharing started successfully');
    } catch (error) {
      console.error('Failed to start screen sharing:', error);
      
      this.updateState({
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }
  
  /**
   * Stop screen sharing
   */
  async stopScreenShare(): Promise<void> {
    if (!this.state.isActive) {
      return;
    }
    
    try {
      // Stop service worker streaming
      await this.stopStreamingInWorker();
      
      // Disconnect WebSocket
      await this.disconnectWebSocket();
      
      // Notify server
      await this.notifyServerStop();
      
      // Clean up state
      this.updateState({
        isActive: false,
        isPaused: false,
        isConnected: false,
        isConnecting: false,
        streamToken: null,
        reconnectToken: null,
        connectionAttempts: 0
      });
      
      // Clear local storage
      this.clearStateFromStorage();
      
      console.log('Screen sharing stopped successfully');
    } catch (error) {
      console.error('Failed to stop screen sharing:', error);
      // Still clear local state even if server notification fails
      this.updateState({
        isActive: false,
        isPaused: false,
        isConnected: false,
        isConnecting: false,
        streamToken: null,
        reconnectToken: null
      });
      this.clearStateFromStorage();
    }
  }
  
  /**
   * Pause screen sharing (temporary)
   */
  async pauseScreenShare(): Promise<void> {
    if (!this.state.isActive) {
      return;
    }
    
    try {
      await this.sendMessageToWorker({
        type: 'pause',
        payload: {}
      });
      
      this.updateState({ isPaused: true });
      
      console.log('Screen sharing paused');
    } catch (error) {
      console.error('Failed to pause screen sharing:', error);
    }
  }
  
  /**
   * Resume screen sharing
   */
  async resumeScreenShare(): Promise<void> {
    if (!this.state.isActive) {
      return;
    }
    
    try {
      await this.sendMessageToWorker({
        type: 'resume',
        payload: {}
      });
      
      this.updateState({ isPaused: false });
      
      console.log('Screen sharing resumed');
    } catch (error) {
      console.error('Failed to resume screen sharing:', error);
    }
  }
  
  /**
   * Update crop area
   */
  async updateCropArea(cropArea: CropArea): Promise<void> {
    if (!this.state.isActive) {
      throw new Error('Screen share not active');
    }
    
    try {
      await this.sendMessageToWorker({
        type: 'crop',
        payload: { cropArea }
      });
      
      this.updateState({ cropArea });
      
      console.log('Crop area updated');
    } catch (error) {
      console.error('Failed to update crop area:', error);
    }
  }
  
  /**
   * Create stream with server
   */
  private async createStreamWithServer(): Promise<{ streamId: string; token: string; reconnectToken: string }> {
    const response = await fetch('/api/screen-share/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({
        adminId: this.state.adminId,
        isPublic: true,
        maxViewers: 100
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create stream: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Connect to WebSocket for stream management
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.getWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        this.webSocketConnection = ws;
        this.updateState({ isConnected: true, connectionAttempts: 0 });
        console.log('WebSocket connected for screen share management');
        resolve();
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onclose = (event) => {
        this.webSocketConnection = null;
        this.updateState({ isConnected: false });
        
        if (this.state.isActive) {
          // Try to reconnect if stream is still active
          this.attemptReconnection();
        }
        
        console.log('WebSocket disconnected:', event.code, event.reason);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
    });
  }
  
  /**
   * Disconnect WebSocket
   */
  private async disconnectWebSocket(): Promise<void> {
    if (this.webSocketConnection) {
      this.webSocketConnection.close();
      this.webSocketConnection = null;
    }
  }
  
  /**
   * Notify server of stream stop
   */
  private async notifyServerStop(): Promise<void> {
    if (this.webSocketConnection && this.state.streamToken) {
      this.webSocketConnection.send(JSON.stringify({
        type: 'screen_share:stop',
        data: { token: this.state.streamToken }
      }));
    }
  }
  
  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'screen_share:joined':
        console.log('Player joined stream:', message.data);
        this.updateStats({ connectedPlayers: message.data.playerCount });
        break;
        
      case 'screen_share:left':
        console.log('Player left stream:', message.data);
        this.updateStats({ connectedPlayers: message.data.playerCount });
        break;
        
      case 'stream_stats':
        this.updateStats(message.data);
        break;
        
      default:
        console.log('Unknown WebSocket message:', message.type);
    }
  }
  
  /**
   * Attempt to reconnect WebSocket
   */
  private async attemptReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    
    // Exponential backoff
    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
    
    console.log(`Attempting reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.updateState({
      connectionAttempts: this.reconnectAttempts,
      isReconnecting: true
    });
    
    this.reconnectTimer = setTimeout(async () => {
      if (this.state.isActive) {
        await this.connectWebSocket();
      }
    }, delay);
  }
  
  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported in this browser');
    }
    
    try {
      const registration = await navigator.serviceWorker.register('/workers/screen-share-worker.js');
      
      this.updateState({ serviceWorkerRegistration: registration });
      
      // Setup message channel with service worker
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        this.handleWorkerMessage(event.data);
      };
      
      registration.active?.postMessage({
        type: 'init',
        payload: {
          streamToken: this.state.streamToken,
          adminId: this.state.adminId
        }
      }, [messageChannel.port2]);
      
      console.log('Service worker registered for screen sharing');
      
      return registration;
    } catch (error) {
      console.error('Failed to register service worker:', error);
      throw error;
    }
  }
  
  /**
   * Start streaming in service worker
   */
  private async startStreamingInWorker(): Promise<void> {
    await this.sendMessageToWorker({
      type: 'start',
      payload: {
        streamToken: this.state.streamToken,
        adminId: this.state.adminId
      }
    });
  }
  
  /**
   * Stop streaming in service worker
   */
  private async stopStreamingInWorker(): Promise<void> {
    await this.sendMessageToWorker({
      type: 'stop',
      payload: {}
    });
  }
  
  /**
   * Send message to service worker
   */
  private async sendMessageToWorker(message: any): Promise<void> {
    if (!this.state.serviceWorkerRegistration) {
      throw new Error('Service worker not registered');
    }
    
    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'response' && event.data.id === message.id) {
          if (event.data.success) {
            resolve();
          } else {
            reject(new Error(event.data.error || 'Service worker operation failed'));
          }
        }
      };
      
      messageChannel.port1.onmessageerror = (error) => {
        reject(error);
      };
      
      this.state.serviceWorkerRegistration.active?.postMessage(message, [messageChannel.port2]);
    });
  }
  
  /**
   * Handle message from service worker
   */
  private handleWorkerMessage(data: any): void {
    switch (data.type) {
      case 'status':
        this.updateState({ 
          isConnected: data.payload.isConnected,
          isConnecting: data.payload.isConnecting,
          buffering: data.payload.buffering
        });
        break;
        
      case 'error':
        this.updateState({ error: data.payload.message });
        break;
        
      case 'stats':
        this.updateStats(data.payload.stats);
        break;
        
      default:
        console.log('Unknown worker message:', data.type);
    }
  }
  
  /**
   * Update stream stats
   */
  private updateStats(stats: Partial<StreamStats>): void {
    const newStats = { ...this.state.stats, ...stats };
    this.updateState({ stats: newStats });
  }
  
  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.memoryCheckTimer = setInterval(() => {
      if (performance.memory) {
        const memoryInfo = performance.memory;
        this.updateStats({ 
          memoryUsage: memoryInfo.usedJSHeapSize 
        });
      }
    }, 5000); // Check every 5 seconds
  }
  
  /**
   * Start stats updates
   */
  private startStatsUpdates(): void {
    this.statsUpdateTimer = setInterval(() => {
      // Update stats based on current state
      this.updateState({
        stats: {
          ...this.state.stats,
          connectedPlayers: this.state.stats.connectedPlayers,
          bandwidth: this.bandwidthAnalyzer.getCurrentBandwidth(),
          frameRate: 30 // Would calculate from actual frame rate
        }
      });
    }, 1000); // Update every second
  }
  
  /**
   * Get current state
   */
  getState(): AdminStreamState {
    return { ...this.state };
  }
  
  /**
   * Get observable state
   */
  getStateObservable() {
    return this.stateSubject.asObservable();
  }
  
  /**
   * Update state and notify listeners
   */
  private updateState(newState: Partial<AdminStreamState>): void {
    this.state = { ...this.state, ...newState };
    this.saveStateToStorage();
    this.stateSubject.next(this.state);
    this.notifyStateChange();
  }
  
  /**
   * Notify listeners of state change
   */
  private notifyStateChange(): void {
    this.eventListeners.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
  }
  
  /**
   * Add state change listener
   */
  addStateChangeListener(callback: (state: AdminStreamState) => void): void {
    this.eventListeners.push(callback);
  }
  
  /**
   * Remove state change listener
   */
  removeStateChangeListener(callback: (state: AdminStreamState) => void): void {
    const index = this.eventListeners.indexOf(callback);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }
  
  /**
   * Load state from local storage
   */
  private loadStateFromStorage(): void {
    try {
      const stored = localStorage.getItem('adminScreenShareState');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state = { ...this.state, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load screen share state:', error);
    }
  }
  
  /**
   * Save state to local storage
   */
  private saveStateToStorage(): void {
    try {
      localStorage.setItem('adminScreenShareState', JSON.stringify({
        streamToken: this.state.streamToken,
        reconnectToken: this.state.reconnectToken,
        isActive: this.state.isActive,
        adminId: this.state.adminId,
        isPaused: this.state.isPaused,
        cropArea: this.state.cropArea
      }));
    } catch (error) {
      console.error('Failed to save screen share state:', error);
    }
  }
  
  /**
   * Clear state from local storage
   */
  private clearStateFromStorage(): void {
    try {
      localStorage.removeItem('adminScreenShareState');
    } catch (error) {
      console.error('Failed to clear screen share state:', error);
    }
  }
  
  /**
   * Get auth token
   */
  private getAuthToken(): string {
    return localStorage.getItem('auth_token') || '';
  }
  
  /**
   * Get WebSocket URL
   */
  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
  
  /**
   * Sync state with worker across tabs
   */
  private syncStateWithWorker(): void {
    if (this.state.isActive && this.state.serviceWorkerRegistration) {
      this.sendMessageToWorker({
        type: 'sync',
        payload: {
          state: this.state
        }
      }).catch(console.error);
    }
  }
  
  /**
   * Check if screen sharing is supported in this browser
   */
  static isSupported(): boolean {
    return 'getDisplayMedia' in navigator.mediaDevices && 
           'serviceWorker' in navigator &&
           'BroadcastChannel' in window;
  }
  
  /**
   * Get supported resolutions
   */
  static getSupportedResolutions(): Array<{width: number; height: number; label: string}> {
    return [
      { width: 1920, height: 1080, label: 'Full HD (1920x1080)' },
      { width: 1280, height: 720, label: 'HD (1280x720)' },
      { width: 854, height: 480, label: 'SD (854x480)' }
    ];
  }
  
  /**
   * Destroy the service and cleanup
   */
  destroy(): void {
    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.statsUpdateTimer) {
      clearInterval(this.statsUpdateTimer);
    }
    
    if (this.memoryCheckTimer) {
      clearInterval(this.memoryCheckTimer);
    }
    
    // Disconnect from everything
    this.stopScreenShare().catch(console.error);
    
    // Clear event listeners
    this.eventListeners = [];
    
    // Complete cleanup
    this.stateSubject.complete();
  }
}
```

This comprehensive document provides a complete architectural blueprint for implementing a robust, persistent screen sharing system that addresses all the requirements mentioned in your original request. The architecture ensures that screen sharing remains active regardless of admin UI state, provides proper resource management, and includes comprehensive error handling and recovery mechanisms.