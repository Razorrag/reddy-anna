/**
 * BroadcastThrottler - Prevents broadcast storms with high player counts
 * Throttles broadcasts to max 1 per second to prevent server overload
 */

interface ThrottledMessage {
  type: string;
  data: any;
  timestamp: number;
}

export class BroadcastThrottler {
  private lastBroadcast: Map<string, number> = new Map();
  private pendingData: Map<string, any> = new Map();
  private throttleMs: number;
  private scheduledBroadcasts: Map<string, NodeJS.Timeout> = new Map();

  constructor(throttleMs: number = 1000) {
    this.throttleMs = throttleMs;
  }

  /**
   * Throttle broadcasts - only send once per throttleMs
   * Accumulates data and sends latest state
   */
  throttledBroadcast(
    key: string,
    messageType: string,
    data: any,
    broadcastFn: (message: any) => void
  ): void {
    const now = Date.now();
    const lastTime = this.lastBroadcast.get(key) || 0;
    const timeSinceLastBroadcast = now - lastTime;

    // Store latest data (always keep most recent)
    this.pendingData.set(key, data);

    if (timeSinceLastBroadcast >= this.throttleMs) {
      // Enough time has passed, broadcast now
      const dataToSend = this.pendingData.get(key);
      broadcastFn({
        type: messageType,
        data: dataToSend
      });
      
      this.lastBroadcast.set(key, now);
      this.pendingData.delete(key);
      
      console.log(`📡 Throttled broadcast sent: ${messageType} (${timeSinceLastBroadcast}ms since last)`);
    } else {
      // Too soon, schedule for later if not already scheduled
      const timeUntilNext = this.throttleMs - timeSinceLastBroadcast;
      
      if (!this.scheduledBroadcasts.has(key)) {
        const timeout = setTimeout(() => {
          const dataToSend = this.pendingData.get(key);
          if (dataToSend) {
            broadcastFn({
              type: messageType,
              data: dataToSend
            });
            
            this.lastBroadcast.set(key, Date.now());
            this.pendingData.delete(key);
            this.scheduledBroadcasts.delete(key);
            
            console.log(`📡 Scheduled throttled broadcast sent: ${messageType}`);
          }
        }, timeUntilNext);
        
        this.scheduledBroadcasts.set(key, timeout);
        console.log(`⏳ Throttled broadcast queued: ${messageType} (will send in ${timeUntilNext}ms)`);
      } else {
        console.log(`⏳ Throttled broadcast data updated: ${messageType} (already scheduled)`);
      }
    }
  }

  /**
   * Clear all pending broadcasts (useful for cleanup)
   */
  clear(): void {
    this.scheduledBroadcasts.forEach(timeout => clearTimeout(timeout));
    this.scheduledBroadcasts.clear();
    this.pendingData.clear();
    this.lastBroadcast.clear();
  }
}

// Global throttler instance (1 second throttle)
export const broadcastThrottler = new BroadcastThrottler(1000);
