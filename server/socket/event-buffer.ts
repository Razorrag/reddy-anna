/**
 * Event Replay Buffer for WebSocket Connections
 * Stores recent game events for clients who disconnect and reconnect
 */

interface BufferedEvent {
  type: string;
  data: any;
  timestamp: number;
  gameId?: string;
}

class EventBuffer {
  private events: Map<string, BufferedEvent[]> = new Map();
  private readonly maxEventsPerGame = 50; // Maximum events to buffer per game
  private readonly eventTimeout = 60000; // 60 seconds - events older than this are discarded

  /**
   * Add an event to the buffer for a specific game
   */
  addEvent(gameId: string, type: string, data: any): void {
    if (!this.events.has(gameId)) {
      this.events.set(gameId, []);
    }

    const gameEvents = this.events.get(gameId)!;
    
    const event: BufferedEvent = {
      type,
      data,
      timestamp: Date.now(),
      gameId
    };

    gameEvents.push(event);

    // Limit buffer size
    if (gameEvents.length > this.maxEventsPerGame) {
      gameEvents.shift(); // Remove oldest event
    }

    // Clean up old events periodically
    this.cleanupOldEvents(gameId);
  }

  /**
   * Get all events for a game since a specific timestamp
   */
  getEventsSince(gameId: string, sinceTimestamp: number): BufferedEvent[] {
    const gameEvents = this.events.get(gameId);
    if (!gameEvents) {
      return [];
    }

    return gameEvents.filter(event => event.timestamp >= sinceTimestamp);
  }

  /**
   * Get all recent events for a game (last N events)
   */
  getRecentEvents(gameId: string, count: number = 10): BufferedEvent[] {
    const gameEvents = this.events.get(gameId);
    if (!gameEvents) {
      return [];
    }

    return gameEvents.slice(-count);
  }

  /**
   * Clear all events for a game
   */
  clearGame(gameId: string): void {
    this.events.delete(gameId);
  }

  /**
   * Remove old events from buffer
   */
  private cleanupOldEvents(gameId: string): void {
    const gameEvents = this.events.get(gameId);
    if (!gameEvents) {
      return;
    }

    const now = Date.now();
    const cutoff = now - this.eventTimeout;

    // Remove events older than timeout
    const filtered = gameEvents.filter(event => event.timestamp > cutoff);
    
    if (filtered.length !== gameEvents.length) {
      this.events.set(gameId, filtered);
    }
  }

  /**
   * Periodic cleanup of all old events
   */
  cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.eventTimeout;

    for (const [gameId, events] of this.events.entries()) {
      const filtered = events.filter(event => event.timestamp > cutoff);
      
      if (filtered.length === 0) {
        this.events.delete(gameId);
      } else if (filtered.length !== events.length) {
        this.events.set(gameId, filtered);
      }
    }
  }

  /**
   * Get buffer statistics
   */
  getStats(): { gameCount: number; totalEvents: number; games: string[] } {
    let totalEvents = 0;
    const games: string[] = [];

    for (const [gameId, events] of this.events.entries()) {
      totalEvents += events.length;
      games.push(gameId);
    }

    return {
      gameCount: this.events.size,
      totalEvents,
      games
    };
  }
}

// Global event buffer instance
export const eventBuffer = new EventBuffer();

// Periodic cleanup - run every 30 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    eventBuffer.cleanup();
  }, 30000);
}

