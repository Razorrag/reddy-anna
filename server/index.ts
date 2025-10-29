// Load environment variables from .env file
import 'dotenv/config';

import express, { type Request, Response, NextFunction } from "express";
import cors from 'cors';
import path from 'path';
import { registerAuthRoutes } from "./routes/auth-routes";
import { registerGameRoutes } from "./routes/game-routes";
import { registerAdminRoutes } from "./routes/admin-routes";
import { registerPaymentRoutes } from "./routes/payment-routes";
import { registerUserRoutes } from "./routes/user-routes";
import { registerStreamRoutes } from "./routes/stream-routes";
import { registerWebSocketRoutes } from "./routes/websocket-routes";
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

// Environment validation completed during startup

const app = express();

// Trust proxy - required for rate limiting behind reverse proxy/load balancer
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ PRODUCTION-READY: Dynamic CORS configuration via environment variables
const getAllowedOrigins = (): string[] => {
  const envOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
  const defaultOrigins = [
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000',
    'http://localhost:5000'
  ];
  
  return process.env.NODE_ENV === 'production' 
    ? envOrigins.length > 0 ? envOrigins : []
    : [...defaultOrigins, ...envOrigins];
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
      "frame-src 'self' https://player.restream.io;"
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
  try {
    // Register modular routes
    await registerAuthRoutes(app);
    await registerGameRoutes(app);
    await registerAdminRoutes(app);
    await registerPaymentRoutes(app);
    await registerUserRoutes(app);
    await registerStreamRoutes(app);
    
    // Register WebSocket routes - this returns the HTTP server with WebSocket attached
    const server = await registerWebSocketRoutes(app);

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
    
    server.listen(port, host, () => {
      log(`serving on http://${host}:${port}`); // This should show 0.0.0.0:5000
      log(`WebSocket server running on the same port as HTTP server`);
      log(`🔧 Admin panel: Game Control available`);
      log(`✅ Server started successfully on port ${port}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use. Please stop any other server using this port.`);
      }
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
})();
