// Configuration for different environments
const CONFIG = {
  // Development environment (localhost)
  development: {
    API_BASE_URL: 'http://localhost:4000'
  },
  
  // Production environment (Netlify)
  production: {
    API_BASE_URL: window.BACKEND_URL || 'https://your-actual-backend-url.onrender.com'  // Will be set by environment
  }
};

// Determine current environment
const environment = window.location.hostname === 'localhost' ? 'development' : 'production';

// Export the appropriate configuration
window.API_CONFIG = CONFIG[environment];

// Set global API_BASE_URL for backward compatibility
window.API_BASE_URL = window.API_CONFIG.API_BASE_URL;