// Configuration for different environments
const CONFIG = {
  // Development environment (localhost)
  development: {
    API_BASE_URL: 'http://localhost:4000'
  },
  
  // Production environment (Netlify)
  production: {
    API_BASE_URL: 'https://reddy-anna-59l3.onrender.com'
  }
};

// Determine current environment
const environment = window.location.hostname === 'localhost' ? 'development' : 'production';

// Set global API_BASE_URL for backward compatibility
window.API_BASE_URL = CONFIG[environment].API_BASE_URL;

// Export the appropriate configuration
window.API_CONFIG = CONFIG[environment];