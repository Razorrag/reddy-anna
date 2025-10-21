// Load environment variables from .env file
import 'dotenv/config';

import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import session from 'express-session';
import MemoryStore from 'memorystore';
import cors from 'cors';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { nms } from "./rtmp-server";

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

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true, // Allow cookies/session
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

log('✅ CORS configured');

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

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Stream status endpoints
  app.get('/api/game/stream-status', (req, res) => {
    // Return current stream status
    res.json({
      success: true,
      streamStatus: 'live', // or 'offline' based on actual stream status
      viewers: 1234
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
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
  
  server.listen(port, host, () => {
    log(`serving on http://${host}:${port}`);
    log(`RTMP server running on port 1935`);
    log(`HTTP server for HLS running on port 8000`);
    log(`WebSocket server running on the same port as HTTP server`);
  });
})();
