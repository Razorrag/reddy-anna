// Load environment variables from .env file
import 'dotenv/config';

import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import session from 'express-session';
import MemoryStore from 'memorystore';
import cors from 'cors';
import path from 'path';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { nms, getStreamStatus } from "./rtmp-server";

// Validate all required environment variables
const requiredEnvVars = [
  'SESSION_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'JWT_SECRET', // Critical for signing tokens
  'JWT_EXPIRES_IN',
  'PORT',
  'CORS_ORIGIN'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please set these variables in your .env file');
  console.error('Server cannot start without these critical configuration values.');
  process.exit(1);
}

// Debug environment variables
console.log('✅ NODE_ENV:', process.env.NODE_ENV);
console.log('✅ Using local memory storage for development');
console.log('✅ All required environment variables are set');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration - Support multiple origins for development and production
const allowedOrigins = [
  process.env.CORS_ORIGIN || 'http://localhost:3000',
  'https://reddy-anna-7n83.onrender.com',
  'https://reddy-anna.onrender.com',
  'http://localhost:5173', // Vite dev server
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    
    // In production, allow all Render.com subdomains
    if (process.env.NODE_ENV === 'production') {
      if (origin.includes('render.com') || origin.includes('onrender.com')) {
        return callback(null, true);
      }
    }
    
    // Check against allowed origins list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      console.log('Allowed origins:', allowedOrigins);
      // In production, be more permissive - allow it anyway
      if (process.env.NODE_ENV === 'production') {
        console.log('Production mode: Allowing origin anyway');
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true, // Allow cookies/session
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

log('✅ CORS configured');

// Security headers middleware
app.use((req, res, next) => {
  // Only set COOP on HTTPS or localhost
  const isSecure = req.protocol === 'https' || req.hostname === 'localhost' || req.hostname === '127.0.0.1';
  
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
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' ws: wss:; " +
      "media-src 'self' blob:; " +
      "frame-src 'self';"
    );
  }
  
  next();
});

log('✅ Security headers configured');

// Session middleware configuration
const MemoryStoreSession = MemoryStore(session);

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production-IMPORTANT',
  resave: false,
  saveUninitialized: false,
  store: new MemoryStoreSession({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

log('✅ Session middleware configured');

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
  
  // Start RTMP server
  nms.run();

  // Serve HLS stream files through main port with proper headers
  app.use('/stream', express.static(path.join(process.cwd(), 'media'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.m3u8')) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Range');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length');
      } else if (filePath.endsWith('.ts')) {
        res.setHeader('Content-Type', 'video/mp2t');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Range');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length');
      }
    }
  }));

  // Proxy HLS streams from port 8000 to main port 5000
  app.use('/stream-live', async (req, res) => {
    try {
      const targetUrl = `http://localhost:8000${req.originalUrl.replace('/stream-live', '/stream')}`;
      console.log(`Proxying HLS request: ${req.originalUrl} -> ${targetUrl}`);
      
      const response = await fetch(targetUrl);
      
      if (!response.ok) {
        console.error(`HLS proxy error: ${response.status} ${response.statusText}`);
        return res.status(response.status).send('Stream not available');
      }
      
      // Copy headers
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      
      // Add CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length');
      
      // Copy body
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
      
    } catch (error) {
      console.error('HLS proxy error:', error);
      res.status(502).send('Stream proxy error');
    }
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Stream status endpoint - returns actual RTMP server status
  app.get('/api/game/stream-status', (req, res) => {
    const status = getStreamStatus();
    res.json({
      success: true,
      streamStatus: status.isLive ? 'live' : 'offline',
      streamPath: status.streamPath,
      hlsUrl: status.isLive ? '/stream/live/stream.m3u8' : null,
      viewers: 0 // TODO: Implement viewer counting
    });
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
    log(`RTMP server running on port 1935`);
    log(`HTTP server for HLS running on port 8000`);
    log(`WebSocket server running on the same port as HTTP server`);
  });
})();
