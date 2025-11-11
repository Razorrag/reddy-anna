// Load environment variables from .env file
import 'dotenv/config';

import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { createServer as createHttpsServer } from "https";
import { WebSocketServer } from "ws";
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";



// Validate all required environment variables
const requiredEnvVars = [
  'JWT_SECRET',  // JWT is now required (removed sessions)
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY'
];

// Optional but recommended variables
const optionalEnvVars = [
  'JWT_EXPIRES_IN',
  'PORT',
  'CORS_ORIGIN',
  'DEFAULT_BALANCE'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
const missingOptionalVars = optionalEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please set these variables in your .env file');
  console.error('Server cannot start without these critical configuration values.');
  process.exit(1);
}

if (missingOptionalVars.length > 0) {
  console.warn('⚠️  Missing optional environment variables:', missingOptionalVars.join(', '));
  console.warn('   Using default values. Set these in .env for production.');
}

// Debug environment variables
console.log('✅ NODE_ENV:', process.env.NODE_ENV);
console.log('✅ JWT Authentication enabled');
console.log('✅ All required environment variables are set');

const app = express();

// Trust proxy - required for rate limiting behind reverse proxy/load balancer
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ PRODUCTION-READY: Dynamic CORS configuration via environment variables
const getAllowedOrigins = (): string[] => {
  const envOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
  const defaultOrigins = [
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000',
    'http://localhost:5000'
  ];
  const combined = process.env.NODE_ENV === 'production'
    ? (envOrigins.length > 0 ? envOrigins : [])
    : [...defaultOrigins, ...envOrigins];
  // De-duplicate while preserving order
  return Array.from(new Set(combined));
};

const allowedOrigins = getAllowedOrigins();

log(`✅ CORS allowed origins: ${allowedOrigins.join(', ')}`);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    
    // In production, check against configured origins
    if (process.env.NODE_ENV === 'production') {
      // Allow configured domains and their subdomains
      const isAllowed = allowedOrigins.some(allowed => {
        return origin === allowed || origin.endsWith(`.${allowed.replace(/^https?:\/\//, '')}`);
      });
      
      if (isAllowed) {
        return callback(null, true);
      }
      
      // Log blocked origin for debugging
      console.warn(`[CORS] Blocked origin in production: ${origin}`);
      console.warn(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
      return callback(new Error('Not allowed by CORS'));
    }
    
    // Development: more permissive
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    console.log(`[CORS] Origin not in allowed list: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies/session
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

log('✅ CORS configured');

// Security headers middleware
app.use((req, res, next) => {
  // Only set COOP and Origin-Agent-Cluster on HTTPS
  const isSecure = req.protocol === 'https';
  
  if (isSecure) {
    // Cross-Origin-Opener-Policy: Isolate browsing context
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    
    // Origin-Agent-Cluster: Request origin-keyed agent cluster
    res.setHeader('Origin-Agent-Cluster', '?1');
  }
  
  // Security headers that work on HTTP and HTTPS
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CSP for production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: blob: https:; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "connect-src 'self' ws: wss: http: https:; " +
      "media-src 'self' blob:; " +
      "frame-src 'self' https://player.restream.io https://www.youtube.com https://youtube.com;"
    );
  }
  
  next();
});

log('✅ Security headers configured');

// 🔐 JWT-ONLY AUTHENTICATION - Sessions removed for stateless auth
// All authentication now handled via JWT tokens in Authorization header
// This provides:
// - Stateless authentication (scalable across multiple servers)
// - Consistent auth for HTTP and WebSocket
// - No server-side session storage needed
// - Better performance and security
log('✅ JWT-only authentication configured (sessions disabled)');

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  const nodeEnv = process.env.NODE_ENV?.trim();
  if (nodeEnv === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  const host = '0.0.0.0'; // Listen on all interfaces, not just 127.0.0.1
  
  // HTTPS Support for Screen Sharing (REQUIRED on VPS)
  // Screen sharing requires HTTPS - browser blocks HTTP on non-localhost
  const httpsEnabled = process.env.HTTPS_ENABLED === 'true';
  const sslKeyPath = process.env.SSL_KEY_PATH || './server.key';
  const sslCertPath = process.env.SSL_CERT_PATH || './server.crt';
  
  if (httpsEnabled) {
    try {
      // Check if SSL certificates exist
      if (!fs.existsSync(sslKeyPath) || !fs.existsSync(sslCertPath)) {
        log('⚠️  HTTPS enabled but certificates not found!');
        log(`   Key path: ${sslKeyPath}`);
        log(`   Cert path: ${sslCertPath}`);
        log('   Generating self-signed certificate for testing...');
        log('   For production, use Let\'s Encrypt or proper SSL certificate.');
        
        // Generate self-signed certificate if missing
        const { execSync } = await import('child_process');
        try {
          execSync(`openssl req -x509 -newkey rsa:2048 -nodes -keyout ${sslKeyPath} -out ${sslCertPath} -days 365 -subj "/CN=${process.env.DOMAIN || host}"`, {
            stdio: 'inherit'
          });
          log('✅ Self-signed certificate generated!');
        } catch (error) {
          log('❌ Failed to generate certificate. Please generate manually or disable HTTPS.');
          log('   To disable HTTPS, remove HTTPS_ENABLED=true from .env');
          throw error;
        }
      }
      
      const httpsOptions = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath)
      };
      
      const httpsServer = createHttpsServer(httpsOptions, app);
      
      // Get WebSocket server from routes (already created in registerRoutes)
      const wssFromRoutes = app.get('wss');
      
      // Setup WebSocket server on HTTPS (share same instance or create new)
      const wssHttps = new WebSocketServer({ server: httpsServer, path: '/ws' });
      
      // Update app to use HTTPS WebSocket server as primary
      app.set('wss', wssHttps);
      app.set('wssHttps', wssHttps);
      
      // Keep HTTP WebSocket server reference if needed
      if (wssFromRoutes) {
        app.set('wssHttp', wssFromRoutes);
      }
      
      const httpsPort = parseInt(process.env.HTTPS_PORT || '443', 10);
      
      httpsServer.listen(httpsPort, host, () => {
        log(`✅ HTTPS server serving on https://${host}:${httpsPort}`);
        log(`✅ WebSocket server running on wss://${host}:${httpsPort}/ws`);
        log(`🔧 Admin panel: Game Control available`);
        log(`⚠️  Screen sharing REQUIRES HTTPS - use https://your-vps-ip:${httpsPort}`);
      });
      
      // Optional: Redirect HTTP to HTTPS
      if (process.env.HTTP_TO_HTTPS_REDIRECT === 'true') {
        server.listen(port, host, () => {
          log(`✅ HTTP server serving on http://${host}:${port} (redirects to HTTPS)`);
          
          // Redirect all HTTP requests to HTTPS
          app.use((req, res, next) => {
            if (req.protocol === 'http' && req.get('host') !== 'localhost' && !req.get('host')?.includes('127.0.0.1')) {
              const httpsUrl = `https://${req.get('host')?.replace(/:\d+$/, '')}:${httpsPort}${req.url}`;
              return res.redirect(301, httpsUrl);
            }
            next();
          });
        });
      } else {
        // Keep HTTP server for non-localhost access without redirect
        server.listen(port, host, () => {
          log(`⚠️  HTTP server serving on http://${host}:${port}`);
          log(`⚠️  WARNING: Screen sharing will NOT work on HTTP! Use HTTPS: https://your-vps-ip:${httpsPort}`);
        });
      }
    } catch (error) {
      log('❌ HTTPS setup failed:', error);
      log('   Falling back to HTTP only - screen sharing will NOT work on VPS!');
      log('   Screen sharing requires HTTPS on non-localhost addresses.');
      
      server.listen(port, host, () => {
        log(`serving on http://${host}:${port}`);
        log(`WebSocket server running on the same port as HTTP server`);
        log(`🔧 Admin panel: Game Control available`);
      });
    }
  } else {
    // HTTP only mode (works on localhost, won't work for screen sharing on VPS)
    server.listen(port, host, () => {
      log(`serving on http://${host}:${port}`);
      log(`WebSocket server running on the same port as HTTP server`);
      log(`🔧 Admin panel: Game Control available`);
      
      if (process.env.NODE_ENV === 'production' && host !== 'localhost' && host !== '127.0.0.1') {
        log(`⚠️  WARNING: Screen sharing requires HTTPS on VPS!`);
        log(`   Set HTTPS_ENABLED=true in .env to enable HTTPS`);
      }
    });
  }
})();
