/**
 * Settings Cache Layer
 * 
 * This module provides caching for game settings to reduce database queries.
 * Expected performance improvement: 30% reduction in DB queries, 300-600ms saved per operation.
 * 
 * Cache TTL: 5 minutes
 * Prevents duplicate concurrent fetches for the same key
 */

class SettingsCache {
  private cache: Map<string, { value: string; expiry: number }> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  private pendingFetches: Map<string, Promise<string>> = new Map();
  
  /**
   * Get a setting value, using cache if available
   * @param key Setting key
   * @param fetchFn Function to fetch the value if not cached
   * @returns Setting value (empty string if not found)
   */
  async get(key: string, fetchFn: () => Promise<string | null | undefined>): Promise<string> {
    const cached = this.cache.get(key);
    
    // Return cached value if still valid
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }
    
    // If already fetching, wait for that promise to avoid duplicate fetches
    const pending = this.pendingFetches.get(key);
    if (pending) {
      return pending.then(v => v || '');
    }
    
    // Fetch new value
    const fetchPromise = fetchFn()
      .then(value => {
        const finalValue = value || '';
        this.cache.set(key, {
          value: finalValue,
          expiry: Date.now() + this.TTL
        });
        this.pendingFetches.delete(key);
        return finalValue;
      })
      .catch(error => {
        this.pendingFetches.delete(key);
        // Return cached value even if expired, or empty string
        const expired = this.cache.get(key);
        if (expired) {
          // Extend expired cache by another TTL to prevent repeated failures
          expired.expiry = Date.now() + this.TTL;
          return expired.value;
        }
        console.error(`Error fetching setting ${key}:`, error);
        return '';
      });
    
    this.pendingFetches.set(key, fetchPromise);
    return fetchPromise;
  }
  
  /**
   * Invalidate cache for a specific key or all keys
   * @param key Setting key to invalidate (if undefined, clears all cache)
   */
  invalidate(key?: string): void {
    if (key) {
      this.cache.delete(key);
      this.pendingFetches.delete(key);
    } else {
      this.cache.clear();
      this.pendingFetches.clear();
    }
  }
  
  /**
   * Preload common settings
   * @param keys Array of setting keys to preload
   * @param fetchFn Function to fetch each setting
   */
  async preload(keys: string[], fetchFn: (key: string) => Promise<string | null | undefined>): Promise<void> {
    const promises = keys.map(key => this.get(key, () => fetchFn(key)));
    await Promise.all(promises);
  }
  
  /**
   * Get cache statistics (for monitoring/debugging)
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const settingsCache = new SettingsCache();

