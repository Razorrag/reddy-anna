import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE CONFIGURATION ERROR:');
  console.error('Missing required environment variables:');
  if (!supabaseUrl) console.error('  - SUPABASE_URL is not set');
  if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_KEY is not set');
  console.error('\n📝 Please check your .env file and ensure these variables are set.');
  console.error('See .env.example for reference.\n');
  throw new Error('Missing Supabase configuration. Check environment variables.');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  console.error('❌ INVALID SUPABASE_URL:', supabaseUrl);
  console.error('Expected format: https://YOUR_PROJECT_ID.supabase.co\n');
  throw new Error('Invalid SUPABASE_URL format');
}

console.log('✅ Supabase client initialized:', supabaseUrl);

// Create client with custom fetch options for better error handling
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: async (url, options) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        console.error('🔴 Supabase fetch error:', {
          url,
          error: error.message,
          code: error.code,
          cause: error.cause?.message,
        });
        throw error;
      }
    },
  },
});

// Test connection on startup
(async () => {
  try {
    const { error } = await supabaseServer.from('game_sessions').select('game_id').limit(1);
    if (error) {
      console.warn('⚠️ Supabase connection test failed:', error.message);
      console.warn('Game will use fallback mode for database operations');
    } else {
      console.log('✅ Supabase connection verified');
    }
  } catch (error: any) {
    console.error('⚠️ Cannot reach Supabase:', error.message);
    console.warn('⚠️ Game will continue with in-memory storage only');
    console.warn('⚠️ Check your network connection and firewall settings');
  }
})();