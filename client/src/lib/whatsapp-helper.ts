/**
 * WhatsApp Number Helper
 *
 * Centralized utility for getting admin WhatsApp number.
 * Prevents hard-coded fallbacks scattered across codebase.
 *
 * Priority:
 * 1. Backend-configured number (from database via API)
 * 2. Environment variable (VITE_ADMIN_WHATSAPP)
 * 3. Empty string (admin MUST configure WhatsApp number)
 */

// ✅ FIX: Removed hardcoded fallback - admin must configure WhatsApp number
// const DEFAULT_WHATSAPP = '918686886632'; // REMOVED

// Cache for WhatsApp number to avoid repeated API calls
let cachedWhatsAppNumber: string | null = null;
let fetchPromise: Promise<string> | null = null;

/**
 * Clear the cached WhatsApp number
 * Call this when admin updates the WhatsApp number in settings
 */
export function clearWhatsAppNumberCache(): void {
  cachedWhatsAppNumber = null;
  fetchPromise = null;
}

/**
 * Fetch admin WhatsApp number from backend API
 * @returns WhatsApp number with country code (e.g., '918686886632')
 */
async function fetchAdminWhatsAppNumber(): Promise<string> {
  try {
    const response = await fetch('/api/whatsapp-number');
    const data = await response.json();
    
    if (data.success && data.whatsappNumber && data.whatsappNumber.trim()) {
      const number = data.whatsappNumber.trim().replace(/\D/g, '');
      if (number.length >= 10) {
        cachedWhatsAppNumber = number;
        console.log('✅ WhatsApp number loaded from backend:', number);
        return number;
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to fetch WhatsApp number from backend:', error);
  }
  
  // Fallback to environment variable
  const envWhatsApp = import.meta.env.VITE_ADMIN_WHATSAPP;
  if (envWhatsApp && envWhatsApp.trim()) {
    const number = envWhatsApp.trim().replace(/\D/g, '');
    if (number.length >= 10) {
      console.log('✅ WhatsApp number loaded from environment variable:', number);
      return number;
    }
  }
  
  // ✅ FIX: No hardcoded fallback - return empty string and warn admin
  console.error('❌ CRITICAL: WhatsApp number not configured! Admin must set it in WhatsApp Settings.');
  console.error('💡 Go to Admin Panel → WhatsApp Settings to configure the number.');
  return '';
}

/**
 * Get admin WhatsApp number (async version)
 * Fetches from backend first, then falls back to env variable, then default
 * @returns Promise<string> WhatsApp number with country code
 */
export async function getAdminWhatsAppNumberAsync(): Promise<string> {
  // Return cached value if available
  if (cachedWhatsAppNumber) {
    return cachedWhatsAppNumber;
  }
  
  // If already fetching, return the same promise
  if (fetchPromise) {
    return fetchPromise;
  }
  
  // Start new fetch
  fetchPromise = fetchAdminWhatsAppNumber();
  const result = await fetchPromise;
  fetchPromise = null;
  return result;
}

/**
 * Get admin WhatsApp number (synchronous version with cache)
 * Uses cached value if available, otherwise returns empty string
 * For immediate use, prefer getAdminWhatsAppNumberAsync() for fresh data
 * @returns WhatsApp number with country code or empty string if not configured
 */
export function getAdminWhatsAppNumber(): string {
  // Return cached value if available
  if (cachedWhatsAppNumber) {
    return cachedWhatsAppNumber;
  }
  
  // Try environment variable as immediate fallback
  const envWhatsApp = import.meta.env.VITE_ADMIN_WHATSAPP;
  if (envWhatsApp && envWhatsApp.trim()) {
    const number = envWhatsApp.trim().replace(/\D/g, '');
    if (number.length >= 10) {
      cachedWhatsAppNumber = number;
      return number;
    }
  }
  
  // Trigger async fetch in background (don't await)
  getAdminWhatsAppNumberAsync().catch(() => {
    // Silently handle errors, fallback already returned
  });
  
  // ✅ FIX: Return empty string instead of hardcoded number
  console.warn('⚠️ WhatsApp number not yet loaded. Configure in Admin Settings.');
  return '';
}

/**
 * Format WhatsApp number for display
 * @param number WhatsApp number with country code
 * @returns Formatted number (e.g., '+91 86868 86632')
 */
export function formatWhatsAppNumber(number: string): string {
  // Remove any non-digit characters
  const digits = number.replace(/\D/g, '');
  
  // Format as +CC XXXXX XXXXX
  if (digits.length >= 10) {
    const countryCode = digits.slice(0, -10);
    const part1 = digits.slice(-10, -5);
    const part2 = digits.slice(-5);
    return `+${countryCode} ${part1} ${part2}`;
  }
  
  return number;
}

/**
 * Create WhatsApp chat URL
 * @param number WhatsApp number with country code
 * @param message Optional pre-filled message
 * @returns WhatsApp web/app URL
 */
export function createWhatsAppUrl(number: string, message?: string): string {
  const cleanNumber = number.replace(/\D/g, '');
  const encodedMessage = message ? encodeURIComponent(message) : '';
  
  if (encodedMessage) {
    return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
  }
  
  return `https://wa.me/${cleanNumber}`;
}

/**
 * Get admin WhatsApp number for payment requests
 * @returns Promise<string> WhatsApp number
 */
export async function getPaymentWhatsAppNumberAsync(): Promise<string> {
  return getAdminWhatsAppNumberAsync();
}

/**
 * Get admin WhatsApp number for payment requests (sync version)
 * @returns WhatsApp number
 */
export function getPaymentWhatsAppNumber(): string {
  return getAdminWhatsAppNumber();
}

/**
 * Get admin WhatsApp number for support
 * This can be extended to use a different number for support vs payments
 * @returns Promise<string> WhatsApp number
 */
export async function getSupportWhatsAppNumberAsync(): Promise<string> {
  return getAdminWhatsAppNumberAsync();
}

/**
 * Get admin WhatsApp number for support (sync version)
 * @returns WhatsApp number
 */
export function getSupportWhatsAppNumber(): string {
  return getAdminWhatsAppNumber();
}
