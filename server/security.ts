// Security Measures System
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';


// Rate limiting configurations
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Increased limit for testing - Limit each IP to 50 requests per windowMs for authentication
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for trusted IPs in production
    const trustedIPs = process.env.TRUSTED_IPS?.split(',') || [];
    return req.ip ? trustedIPs.includes(req.ip) : false;
  },

});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Increased limit for general requests (game updates, etc.)
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for WebSocket connections and game-related endpoints
  skip: (req) => {
    const skipPaths = ['/ws', '/api/game/current', '/api/user/balance'];
    return skipPaths.some(path => req.path.startsWith(path));
  },

});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Increased limit for API requests
  message: {
    success: false,
    error: 'Too many API requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for WebSocket connections and game-related endpoints
  skip: (req) => {
    const skipPaths = ['/ws', '/api/game/current', '/api/user/balance'];
    return skipPaths.some(path => req.path.startsWith(path));
  },
});

// Game-specific rate limiter (more lenient for real-time gaming)
export const gameLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // Allow 1000 game requests per minute
  message: {
    success: false,
    error: 'Too many game requests, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 payment requests per hour
  message: {
    success: false,
    error: 'Too many payment attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helmet security headers configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: false, // EXPLICITLY DISABLE CSP
  hsts: false, // EXPLICITLY DISABLE HSTS
  referrerPolicy: { policy: 'no-referrer' },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  permittedCrossDomainPolicies: false,
  hidePoweredBy: true,
  ieNoOpen: true,
});


// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://raju-gari-kossu.com',
      'https://raju-gari-kossu-7n83.onrender.com',
      'https://raju-gari-kossu.onrender.com',
      'http://91.108.110.72:5000',
      'http://89.42.231.35:5000',
      'http://89.42.231.35:8000'
    ];

    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);

    // In production, do NOT allow unspecified origins

    // Check against allowed origins list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('[CORS] Blocked origin:', origin);
      console.log('[CORS] Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'Content-Range', 'X-Content-Range'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ]
};

// Input sanitization middleware
export const sanitizeInput = mongoSanitize({
  replaceWith: '_',
});

// XSS protection
export const xssProtection = xss();

// HPP (HTTP Parameter Pollution) protection
export const parameterPollutionProtection = hpp({
  whitelist: ['sort', 'fields', 'page', 'limit'],
});

// Security middleware stack
export const securityMiddleware = [
  securityHeaders,
  cors(corsOptions),
  sanitizeInput,
  xssProtection,
  parameterPollutionProtection,
  generalLimiter,
];

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - ${req.ip}`;

    if (res.statusCode >= 400) {
      console.error(`[ERROR] ${log}`);
    } else {
      console.log(`[INFO] ${log}`);
    }
  });

  next();
};

// IP blocking middleware
export const ipBlocker = (blockedIPs: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress;

    if (blockedIPs.includes(clientIP as string)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    next();
  };
};

// Suspicious activity detection
export const suspiciousActivityDetector = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection attempts
    /javascript:/i,  // JavaScript protocol
    /data:text\/html/i,  // Data URI HTML
  ];

  const url = req.originalUrl;
  const userAgent = req.get('User-Agent') || '';

  // Check for suspicious patterns in URL
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      console.warn(`[SUSPICIOUS] Suspicious pattern detected in URL: ${url} from IP: ${req.ip}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid request'
      });
    }
  }

  // Check for suspicious user agents
  const suspiciousUserAgents = [
    /bot/i,
    /crawler/i,
    /scanner/i,
    /curl/i,
    /wget/i,
  ];

  for (const pattern of suspiciousUserAgents) {
    if (pattern.test(userAgent) && !userAgent.includes('Googlebot')) {
      console.warn(`[SUSPICIOUS] Suspicious user agent: ${userAgent} from IP: ${req.ip}`);
      // Don't block, just log
      break;
    }
  }

  next();
};

// JWT token security configuration
export const jwtOptions = {
  secret: process.env.JWT_SECRET as string,
  options: {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: process.env.JWT_ISSUER || 'AndarBaharApp',
    audience: process.env.JWT_AUDIENCE || 'users',
    algorithm: 'HS256' as const,
  }
};

// Password security configuration
export const passwordSecurity = {
  saltRounds: 12,
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: false,
  maxAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
};

// Session security configuration
export const sessionSecurity = {
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' as const,
  },
  proxy: true,
  name: 'sessionId',
  resave: false,
  saveUninitialized: false,
  rolling: true,
};

// API key validation middleware
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];

  if (!apiKey || !validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  next();
};

// Admin access validation middleware
// 🔐 SECURITY: NO BYPASSES - Admin access requires proper authentication
export const validateAdminAccess = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  console.log('🔍 validateAdminAccess check:', {
    hasUser: !!user,
    userId: user?.id,
    role: user?.role
  });

  // 🔐 SECURITY: Check if user exists (NO DEV MODE BYPASS)
  if (!user) {
    console.log('❌ Admin access denied: No authenticated user');
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please login as admin.'
    });
  }

  // 🔐 SECURITY: Verify admin role (NO EXCEPTIONS)
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    console.log(`❌ Admin access denied: User ${user.id} has role '${user.role}' (requires 'admin' or 'super_admin')`);
    return res.status(403).json({
      success: false,
      error: 'Admin access required. Your role does not have permission.'
    });
  }

  console.log(`✅ Admin access granted: ${user.id} (${user.role})`);
  next();
};

// File upload security
export const fileUploadSecurity = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  scanForMalware: true, // In production, integrate with antivirus
};

// Input validation helper
export const validateInput = (input: any, rules: any) => {
  const errors: string[] = [];

  for (const field in rules) {
    const rule = rules[field];
    const value = input[field];

    if (rule.required && (!value || value.toString().trim() === '')) {
      errors.push(`${field} is required`);
      continue;
    }

    if (value && rule.type && typeof value !== rule.type) {
      errors.push(`${field} must be of type ${rule.type}`);
    }

    if (value && rule.minLength && value.length < rule.minLength) {
      errors.push(`${field} must be at least ${rule.minLength} characters`);
    }

    if (value && rule.maxLength && value.length > rule.maxLength) {
      errors.push(`${field} must not exceed ${rule.maxLength} characters`);
    }

    if (value && rule.pattern && !rule.pattern.test(value)) {
      errors.push(`${field} format is invalid`);
    }

    if (value && rule.enum && !rule.enum.includes(value)) {
      errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Security headers helper
export const addSecurityHeaders = (res: Response) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
};

// Error handling for security errors
export const handleSecurityError = (error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[SECURITY ERROR] ${error.message}`, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't expose sensitive error details
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
};

// Rate limit exceeded handler
export const rateLimitExceeded = (req: Request, res: Response) => {
  console.warn(`[RATE LIMIT] Rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}`);

  res.status(429).json({
    success: false,
    error: 'Too many requests, please try again later.',
    retryAfter: Math.round((req as any).rateLimit.resetTime - Date.now() / 1000)
  });
};

// Security audit logger
export const auditLogger = (action: string, userId?: string, details?: any) => {
  const auditLog = {
    timestamp: new Date().toISOString(),
    action,
    userId,
    details,
    ip: details?.ip,
    userAgent: details?.userAgent
  };

  console.log(`[AUDIT] ${JSON.stringify(auditLog)}`);

  // In production, send to secure logging service
  if (process.env.AUDIT_WEBHOOK) {
    // Send to webhook or logging service
  }
};

// Database security helpers
export const sanitizeQuery = (query: any) => {
  const sanitized: any = {};

  for (const key in query) {
    if (key.startsWith('$') || key.includes('.')) {
      continue; // Skip MongoDB operators
    }
    sanitized[key] = query[key];
  }

  return sanitized;
};

// Encryption helpers (for sensitive data)
export const encryptSensitiveData = (data: string): string => {
  // In production, use proper encryption like AES-256
  // This is just a placeholder
  return Buffer.from(data).toString('base64');
};

export const decryptSensitiveData = (encryptedData: string): string => {
  // In production, use proper decryption
  // This is just a placeholder
  return Buffer.from(encryptedData, 'base64').toString('utf-8');
};

// Security configuration validation
export const validateSecurityConfig = () => {
  const requiredEnvVars = [
    'JWT_SECRET',
    'ALLOWED_ORIGINS'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error(`[SECURITY] Missing required environment variables: ${missingVars.join(', ')}`);
    return false;
  }

  // No default secrets allowed

  return true;
};
