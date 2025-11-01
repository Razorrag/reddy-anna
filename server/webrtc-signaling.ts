/**
 * WEBRTC SIGNALING SERVER
 * 
 * This module handles WebRTC signaling for screen sharing between admin and players.
 * 
 * Flow:
 * 1. Admin captures screen and creates RTCPeerConnection
 * 2. Admin sends SDP offer to server
 * 3. Server broadcasts offer to all connected players
 * 4. Players create RTCPeerConnection and send SDP answer back
 * 5. Server forwards answer to admin
 * 6. ICE candidates are exchanged for NAT traversal
 * 7. Direct peer-to-peer connection established
 */

import { WebSocket } from 'ws';

interface WebRTCClient {
  ws: WebSocket;
  userId: string;
  role: 'admin' | 'player';
  streamId?: string;
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'stream-start' | 'stream-stop' | 'viewer-join';
  from: string;
  to?: string;
  streamId?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

class WebRTCSignalingServer {
  private clients: Map<string, WebRTCClient> = new Map();
  private activeStreams: Map<string, string> = new Map(); // streamId -> adminUserId
  
  /**
   * Register a new WebRTC client
   */
  registerClient(ws: WebSocket, userId: string, role: 'admin' | 'player'): void {
    const client: WebRTCClient = { ws, userId, role };
    this.clients.set(userId, client);

    console.log(`[WebRTC] Client registered: ${userId} (${role})`);
    console.log(`[WebRTC] Total clients: ${this.clients.size}`);

    // If a player joins, notify the admin to create a new peer connection for them
    if (role === 'player') {
      this.activeStreams.forEach(adminUserId => {
        this.sendToClient(adminUserId, {
          type: 'new-viewer',
          from: userId
        });
      });
    }
  }

  /**
   * Unregister a client
   */
  unregisterClient(userId: string): void {
    const client = this.clients.get(userId);
    if (!client) return;

    // If admin disconnects, stop their stream
    if (client.role === 'admin' && client.streamId) {
      this.stopStream(client.streamId);
    }

    // If a player leaves, notify the admin
    if (client.role === 'player') {
      this.activeStreams.forEach(adminUserId => {
        this.sendToClient(adminUserId, {
          type: 'viewer-left',
          from: userId
        });
      });
    }

    this.clients.delete(userId);
    console.log(`[WebRTC] Client unregistered: ${userId}`);
    console.log(`[WebRTC] Total clients: ${this.clients.size}`);
  }

  /**
   * Handle signaling messages
   */
  handleMessage(userId: string, message: SignalingMessage): void {
    const client = this.clients.get(userId);
    if (!client) {
      console.error(`[WebRTC] Unknown client: ${userId}`);
      return;
    }

    console.log(`[WebRTC] Message from ${userId}: ${message.type}`);

    switch (message.type) {
      case 'stream-start':
        this.handleStreamStart(client, message);
        break;

      case 'stream-stop':
        this.handleStreamStop(client, message);
        break;

      case 'offer':
        this.handleOffer(client, message);
        break;

      case 'answer':
        this.handleAnswer(client, message);
        break;

      case 'ice-candidate':
        this.handleIceCandidate(client, message);
        break;

      case 'viewer-join':
        this.handleViewerJoin(client, message);
        break;

      default:
        console.warn(`[WebRTC] Unknown message type: ${message.type}`);
    }
  }

  /**
   * Admin starts streaming
   */
  private handleStreamStart(client: WebRTCClient, message: SignalingMessage): void {
    if (client.role !== 'admin') {
      console.error(`[WebRTC] Only admins can start streams`);
      return;
    }

    const streamId = message.streamId || `stream-${Date.now()}`;
    client.streamId = streamId;
    this.activeStreams.set(streamId, client.userId);

    console.log(`[WebRTC] Stream started: ${streamId} by ${client.userId}`);
    console.log(`[WebRTC] Active streams now: ${Array.from(this.activeStreams.entries()).map(([s, a]) => `${s}->${a}`).join(', ')}`);

    // Count player clients before broadcasting
    let playerCount = 0;
    this.clients.forEach((c) => {
      if (c.role === 'player' && c.ws.readyState === WebSocket.OPEN) {
        playerCount++;
      }
    });
    console.log(`[WebRTC] Broadcasting stream-start to ${playerCount} players`);

    // Notify all players that a stream is available (for UI updates)
    const broadcastMessage = {
      type: 'stream-start',
      from: client.userId,
      streamId
    };
    console.log(`[WebRTC] Broadcast message:`, broadcastMessage);
    this.broadcastToPlayers(broadcastMessage);
    
    // ✅ SIMPLE FIX: Automatically notify admin about ALL existing players
    // Same logic as when a player registers while stream is active (lines 55-63)
    // This way admin automatically creates offers for all existing players
    this.clients.forEach((playerClient, playerUserId) => {
      if (playerClient.role === 'player' && playerClient.ws.readyState === WebSocket.OPEN) {
        console.log(`[WebRTC] Auto-notifying admin about existing player ${playerUserId}`);
        this.sendToClient(client.userId, {  // Send to admin (the stream starter)
          type: 'new-viewer',
          from: playerUserId
        });
      }
    });
  }

  /**
   * Admin stops streaming
   */
  private handleStreamStop(client: WebRTCClient, message: SignalingMessage): void {
    if (client.role !== 'admin') return;

    const streamId = message.streamId || client.streamId;
    if (!streamId) return;

    this.stopStream(streamId);
  }

  /**
   * Stop a stream and notify players
   */
  private stopStream(streamId: string): void {
    const adminUserId = this.activeStreams.get(streamId);
    if (!adminUserId) return;

    this.activeStreams.delete(streamId);

    const admin = this.clients.get(adminUserId);
    if (admin) {
      admin.streamId = undefined;
    }

    console.log(`[WebRTC] Stream stopped: ${streamId}`);

    // Notify all players
    this.broadcastToPlayers({
      type: 'stream-stop',
      from: adminUserId,
      streamId
    });
  }

  /**
   * Get stream status for a specific admin
   * Returns whether stream is active and the streamId
   */
  getStreamStatus(adminId: string): { isActive: boolean; streamId?: string } {
    // Find active stream for this admin
    // Convert Map entries to array to avoid iterator issues
    const entries = Array.from(this.activeStreams.entries());
    for (const [streamId, adminUserId] of entries) {
      if (adminUserId === adminId) {
        return {
          isActive: true,
          streamId
        };
      }
    }
    
    return {
      isActive: false
    };
  }

  /**
   * Admin sends SDP offer to players
   */
  private handleOffer(client: WebRTCClient, message: SignalingMessage): void {
    if (client.role !== 'admin') {
      console.error(`[WebRTC] Only admins can send offers`);
      return;
    }

    if (!message.to) {
      console.error('[WebRTC] Offer must have a "to" field specifying the player client ID.');
      return;
    }
    
    // Send offer to the specific player
    console.log(`[WebRTC] Sending offer from admin ${client.userId} to player ${message.to}`);
    this.sendToClient(message.to, {
      type: 'offer',
      from: client.userId,
      streamId: client.streamId || message.streamId,
      sdp: message.sdp
    });
    console.log(`[WebRTC] Offer sent successfully from ${client.userId} to player ${message.to}`);
  }

  /**
   * Player sends SDP answer back to admin
   */
  private handleAnswer(client: WebRTCClient, message: SignalingMessage): void {
    if (client.role !== 'player') {
      console.error(`[WebRTC] Only players can send answers`);
      return;
    }

    // ✅ FIX: Find admin - try message.to first, then find first active stream admin
    let targetAdminId = message.to;
    
    if (!targetAdminId) {
      // If no 'to' field, find the admin from active streams (only one should be active)
      if (this.activeStreams.size > 0) {
        targetAdminId = Array.from(this.activeStreams.values())[0];
        const streamId = Array.from(this.activeStreams.keys())[0];
        console.log(`[WebRTC] No 'to' in answer from ${client.userId}, using first active admin ${targetAdminId} (stream: ${streamId})`);
      }
    }
    
    if (!targetAdminId) {
      console.warn(`[WebRTC] No admin found to send answer to from ${client.userId}`);
      console.log(`[WebRTC] Active streams: ${Array.from(this.activeStreams.entries()).map(([s, a]) => `${s}->${a}`).join(', ') || 'none'}`);
      return;
    }

    // Send to specific admin
    console.log(`[WebRTC] Sending answer from ${client.userId} to admin ${targetAdminId}`);
    this.sendToClient(targetAdminId, {
      type: 'answer',
      from: client.userId,
      sdp: message.sdp,
      streamId: message.streamId
    });

    console.log(`[WebRTC] Answer sent successfully from ${client.userId} to admin ${targetAdminId}`);
  }

  /**
   * Handle ICE candidate exchange
   */
  private handleIceCandidate(client: WebRTCClient, message: SignalingMessage): void {
    const recipientId = message.to;
    if (!recipientId) {
      console.error('[WebRTC] ICE candidate must have a "to" field.');
      return;
    }

    this.sendToClient(recipientId, {
      type: 'ice-candidate',
      from: client.userId,
      candidate: message.candidate,
      streamId: message.streamId
    });
  }

  /**
   * A player notifies the admin they are ready to receive the stream.
   */
  private handleViewerJoin(client: WebRTCClient, message: SignalingMessage): void {
    if (client.role !== 'player') return;

    const streamId = message.streamId || 'default-stream'; // ✅ FIX: Use default if not provided
    
    // ✅ FIX: Try to find admin by streamId, or use first active stream if streamId is default
    let adminId: string | undefined;
    
    if (streamId === 'default-stream') {
      // If default streamId, find first active stream admin
      if (this.activeStreams.size > 0) {
        adminId = Array.from(this.activeStreams.values())[0];
        console.log(`[WebRTC] Viewer ${client.userId} using default streamId, matched to admin ${adminId}`);
      }
    } else {
      adminId = this.activeStreams.get(streamId);
    }

    if (adminId) {
      console.log(`[WebRTC] Found admin ${adminId} for stream ${streamId}, notifying of new viewer ${client.userId}`);
      this.sendToClient(adminId, {
        type: 'new-viewer',
        from: client.userId
      });
      console.log(`[WebRTC] Viewer ${client.userId} joined, notified admin ${adminId}`);
    } else {
      console.warn(`[WebRTC] No active stream found for viewer ${client.userId} (streamId: ${streamId})`);
      console.log(`[WebRTC] Active streams: ${Array.from(this.activeStreams.entries()).map(([s, a]) => `${s}->${a}`).join(', ') || 'none'}`);
      // ✅ FIX: Send response to viewer indicating no stream is available
      this.sendToClient(client.userId, {
        type: 'stream-not-available',
        from: 'server',
        streamId: streamId,
        message: 'No active stream found. Waiting for admin to start streaming.'
      });
      console.log(`[WebRTC] Sent stream-not-available to ${client.userId}`);
    }
  }

  /**
   * Notify a player about active streams when they join
   */
  private notifyPlayerOfActiveStreams(playerId: string): void {
    this.activeStreams.forEach((adminUserId, streamId) => {
      this.sendToClient(playerId, {
        type: 'stream-start',
        from: adminUserId,
        streamId
      });
    });
  }

  /**
   * Send message to a specific client
   */
  private sendToClient(userId: string, message: any): void {
    const client = this.clients.get(userId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      console.warn(`[WebRTC] Cannot send to ${userId}: not connected (client exists: ${!!client}, readyState: ${client?.ws.readyState})`);
      return;
    }

    try {
      // Send message in the format expected by the frontend
      const payload = {
        type: 'webrtc:signal',
        data: message
      };
      console.log(`[WebRTC] Sending to ${userId} (${client.role}):`, message.type);
      client.ws.send(JSON.stringify(payload));
    } catch (error) {
      console.error(`[WebRTC] Error sending to ${userId}:`, error);
    }
  }

  /**
   * Send message to all admin clients
   */
  private sendToAdmins(message: any): void {
    let sentCount = 0;
    this.clients.forEach((client, userId) => {
      if (client.role === 'admin' && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify({
            type: 'webrtc:signal',
            data: message
          }));
          sentCount++;
        } catch (error) {
          console.error(`[WebRTC] Error sending to admin ${userId}:`, error);
        }
      }
    });
    console.log(`[WebRTC] Sent to ${sentCount} admins`);
  }

  /**
   * Send message to all player clients
   */
  private sendToPlayers(message: any): void {
    let sentCount = 0;
    this.clients.forEach((client, userId) => {
      if (client.role === 'player' && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify({
            type: 'webrtc:signal',
            data: message
          }));
          sentCount++;
        } catch (error) {
          console.error(`[WebRTC] Error sending to player ${userId}:`, error);
        }
      }
    });
    console.log(`[WebRTC] Sent to ${sentCount} players`);
  }

  /**
   * Broadcast message to all players
   */
  private broadcastToPlayers(message: any): void {
    console.log(`[WebRTC] broadcastToPlayers called with message type: ${message.type}`);
    this.sendToPlayers(message);
  }

  /**
   * Get active streams
   */
  getActiveStreams(): Array<{ streamId: string; adminUserId: string }> {
    const streams: Array<{ streamId: string; adminUserId: string }> = [];
    this.activeStreams.forEach((adminUserId, streamId) => {
      streams.push({ streamId, adminUserId });
    });
    return streams;
  }

  /**
   * Get client count
   */
  getClientCount(): { total: number; admins: number; players: number } {
    let admins = 0;
    let players = 0;

    this.clients.forEach((client) => {
      if (client.role === 'admin') admins++;
      else players++;
    });

    return {
      total: this.clients.size,
      admins,
      players
    };
  }
}

// Export singleton instance
export const webrtcSignaling = new WebRTCSignalingServer();
