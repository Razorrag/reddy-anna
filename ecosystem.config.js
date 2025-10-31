/**
 * PM2 Ecosystem Configuration for VPS Deployment
 * 
 * This file configures PM2 process manager for the Andar Bahar application
 * on VPS server. PM2 ensures the app restarts automatically and runs in
 * production mode.
 * 
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [{
    name: 'andar-bahar',
    script: './dist/index.js',
    instances: 1, // Single instance for WebSocket compatibility
    exec_mode: 'fork', // Use fork mode for single instance (better for WebSocket)
    
    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      // Add HTTPS configuration if using HTTPS
      HTTPS_ENABLED: process.env.HTTPS_ENABLED || 'false',
      HTTPS_PORT: process.env.HTTPS_PORT || '443',
      SSL_KEY_PATH: process.env.SSL_KEY_PATH || './server.key',
      SSL_CERT_PATH: process.env.SSL_CERT_PATH || './server.crt',
      HTTP_TO_HTTPS_REDIRECT: process.env.HTTP_TO_HTTPS_REDIRECT || 'false'
    },
    
    // Logging configuration
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true, // Prepend timestamp to logs
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Process management
    max_restarts: 10, // Maximum number of restarts
    min_uptime: '10s', // Minimum uptime to consider process stable
    max_memory_restart: '1G', // Restart if memory exceeds 1GB
    restart_delay: 4000, // Wait 4 seconds before restart
    exp_backoff_restart_delay: 100, // Exponential backoff for restarts
    
    // Watch mode (disabled in production)
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'dist'],
    
    // Process health monitoring
    autorestart: true,
    listen_timeout: 10000, // 10 seconds for graceful shutdown
    
    // Advanced options
    kill_timeout: 5000, // 5 seconds to kill process
    wait_ready: false, // Don't wait for ready signal
    
    // Source map support (if needed)
    source_map_support: true,
    
    // Instance management
    instance_var: 'INSTANCE_ID'
  }]
};

