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
  type: 'offer' | 'answer' | 'ice-candidate' | 'stream-start' | 'stream-stop';
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

    // If player joins and there's an active stream, notify them
    if (role === 'player') {
      this.notifyPlayerOfActiveStreams(userId);
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

    // Notify all players that a stream is available
    this.broadcastToPlayers({
      type: 'stream-start',
      from: client.userId,
      streamId
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
   * Admin sends SDP offer to players
   */
  private handleOffer(client: WebRTCClient, message: SignalingMessage): void {
    if (client.role !== 'admin') {
      console.error(`[WebRTC] Only admins can send offers`);
      return;
    }

    // Ensure streamId is set on the client
    if (message.streamId && !client.streamId) {
      client.streamId = message.streamId;
    }

    if (!message.to) {
      // Broadcast offer to all players
      this.broadcastToPlayers({
        type: 'offer',
        from: client.userId,
        streamId: client.streamId || message.streamId,
        sdp: message.sdp
      });
      console.log(`[WebRTC] Offer broadcasted from ${client.userId} to all players`);
    } else {
      // Send to specific player
      this.sendToClient(message.to, {
        type: 'offer',
        from: client.userId,
        streamId: client.streamId || message.streamId,
        sdp: message.sdp
      });
      console.log(`[WebRTC] Offer sent from ${client.userId} to player ${message.to}`);
    }
  }

  /**
   * Player sends SDP answer back to admin
   */
  private handleAnswer(client: WebRTCClient, message: SignalingMessage): void {
    if (client.role !== 'player') {
      console.error(`[WebRTC] Only players can send answers`);
      return;
    }

    // Find the admin who started the active stream
    let targetAdminId: string | undefined = message.to;
    
    if (!targetAdminId) {
      // Find admin from active stream
      if (message.streamId) {
        targetAdminId = this.activeStreams.get(message.streamId);
      } else {
        // If no streamId, find first admin with an active stream
        this.activeStreams.forEach((adminId) => {
          if (!targetAdminId) {
            const admin = this.clients.get(adminId);
            if (admin && admin.role === 'admin') {
              targetAdminId = adminId;
            }
          }
        });
      }
    }

    if (!targetAdminId) {
      console.warn(`[WebRTC] No admin found to send answer to from ${client.userId}`);
      // Fallback: send to all admins
      this.sendToAdmins({
        type: 'answer',
        from: client.userId,
        sdp: message.sdp,
        streamId: message.streamId
      });
      console.log(`[WebRTC] Answer sent from ${client.userId} to all admins (fallback)`);
      return;
    }

    // Send to specific admin
    this.sendToClient(targetAdminId, {
      type: 'answer',
      from: client.userId,
      sdp: message.sdp,
      streamId: message.streamId
    });

    console.log(`[WebRTC] Answer sent from ${client.userId} to admin ${targetAdminId}`);
  }

  /**
   * Handle ICE candidate exchange
   */
  private handleIceCandidate(client: WebRTCClient, message: SignalingMessage): void {
    if (!message.to) {
      // If no specific recipient, send to opposite role
      if (client.role === 'admin') {
        // Admin sends ICE candidates to all players (broadcast)
        this.sendToPlayers({
          type: 'ice-candidate',
          from: client.userId,
          candidate: message.candidate,
          streamId: client.streamId
        });
      } else {
        // Player sends ICE candidate to the admin who started the stream
        let targetAdminId: string | undefined;
        
        // Find admin from active stream
        if (message.streamId) {
          targetAdminId = this.activeStreams.get(message.streamId);
        } else {
          // If no streamId, find first admin with an active stream
          this.activeStreams.forEach((adminId) => {
            if (!targetAdminId) {
              const admin = this.clients.get(adminId);
              if (admin && admin.role === 'admin') {
                targetAdminId = adminId;
              }
            }
          });
        }

        if (targetAdminId) {
          this.sendToClient(targetAdminId, {
            type: 'ice-candidate',
            from: client.userId,
            candidate: message.candidate,
            streamId: message.streamId
          });
          console.log(`[WebRTC] ICE candidate sent from ${client.userId} to admin ${targetAdminId}`);
        } else {
          // Fallback: send to all admins
          this.sendToAdmins({
            type: 'ice-candidate',
            from: client.userId,
            candidate: message.candidate,
            streamId: message.streamId
          });
          console.log(`[WebRTC] ICE candidate sent from ${client.userId} to all admins (fallback)`);
        }
      }
    } else {
      // Send to specific recipient
      this.sendToClient(message.to, {
        type: 'ice-candidate',
        from: client.userId,
        candidate: message.candidate,
        streamId: message.streamId
      });
      console.log(`[WebRTC] ICE candidate sent from ${client.userId} to ${message.to}`);
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
      console.warn(`[WebRTC] Cannot send to ${userId}: not connected`);
      return;
    }

    try {
      // Send message in the format expected by the frontend
      client.ws.send(JSON.stringify({
        type: 'webrtc:signal',
        data: message
      }));
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
