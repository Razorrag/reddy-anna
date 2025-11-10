/**
 * WhatsApp Number Helper
 * 
 * Centralized utility for getting admin WhatsApp number.
 * Prevents hard-coded fallbacks scattered across codebase.
 * 
 * Priority:
 * 1. Backend-configured number (from bonus settings or whatsapp settings)
 * 2. Environment variable (VITE_ADMIN_WHATSAPP)
 * 3. Default fallback (for development only)
 */

const DEFAULT_WHATSAPP = '918686886632'; // Development fallback only

/**
 * Get admin WhatsApp number from environment
 * @returns WhatsApp number with country code (e.g., '918686886632')
 */
export function getAdminWhatsAppNumber(): string {
  // Priority 1: Environment variable (set by admin or deployment)
  const envWhatsApp = import.meta.env.VITE_ADMIN_WHATSAPP;
  if (envWhatsApp && envWhatsApp.trim()) {
    return envWhatsApp.trim();
  }

  // Priority 2: Default fallback (development only)
  console.warn('⚠️ Using default WhatsApp number. Set VITE_ADMIN_WHATSAPP in .env');
  return DEFAULT_WHATSAPP;
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
 * This can be extended to fetch from backend settings if needed
 * @returns WhatsApp number
 */
export function getPaymentWhatsAppNumber(): string {
  return getAdminWhatsAppNumber();
}

/**
 * Get admin WhatsApp number for support
 * This can be extended to use a different number for support vs payments
 * @returns WhatsApp number
 */
export function getSupportWhatsAppNumber(): string {
  return getAdminWhatsAppNumber();
}
