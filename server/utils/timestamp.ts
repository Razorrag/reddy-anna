/**
 * Centralized timestamp utility for consistent timestamp handling
 * This ensures all timestamps across the application use the same format and source
 */

/**
 * Get server-side timestamp as number (milliseconds since epoch)
 */
export function getServerTimestamp(): number {
  return Date.now();
}

/**
 * Get server-side timestamp as ISO string
 */
export function getServerISOTime(): string {
  return new Date().toISOString();
}

/**
 * Get server-side Date object
 */
export function getServerDate(): Date {
  return new Date();
}





















