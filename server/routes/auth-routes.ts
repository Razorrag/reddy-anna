// Authentication Routes Module
import type { Express } from "express";
import { registerUser, loginUser, loginAdmin, forgotPassword, resetPassword } from '../auth';
import {
  authLimiter,
  generalLimiter,
  apiLimiter,
  securityMiddleware,
  validateAdminAccess,
  validateInput,
  auditLogger
} from '../security';

// Import unified authentication middleware from auth.ts
import { requireAuth } from '../auth';

export async function registerAuthRoutes(app: Express): Promise<void> {
  // Apply security middleware to auth routes
  app.use("/api/auth/*", securityMiddleware);

  // 📱 PASSWORD RESET ENDPOINTS
  app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({
          success: false,
          error: 'Phone number is required'
        });
      }

      const result = await forgotPassword(phone);
      
      // Always return success for security (don't reveal if user exists)
      res.json({
        success: true,
        message: 'If an account with that phone number exists, a password reset link has been sent.'
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        error: 'Password reset failed. Please try again later.'
      });
    }
  });

  app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Reset token and new password are required'
        });
      }

      const result = await resetPassword(token, newPassword);
      
      if (result.success) {
        res.json({
          success: true,
          message: 'Password has been reset successfully. You can now login with your new password.'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        error: 'Password reset failed. Please try again later.'
      });
    }
  });

  // Authentication Routes (Public)
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      console.log('📝 Registration request received:', { 
        name: req.body.name, 
        phone: req.body.phone, 
        hasPassword: !!req.body.password,
        hasConfirmPassword: !!req.body.confirmPassword
      });
      
      const { validateUserRegistrationData } = await import('../auth');
      const validation = validateUserRegistrationData(req.body);
      if (!validation.isValid) {
        console.log('❌ Registration validation failed:', validation.errors);
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
      }
      
      const result = await registerUser(req.body);
      if (result.success) {
        auditLogger('user_registration', result.user?.id, { ip: req.ip });
        console.log('✅ Registration successful, returning token');
        res.status(201).json({
          success: true,
          user: result.user,
          token: result.user?.token // Ensure token is returned
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { phone, password } = req.body;
      
      if (!phone || !password) {
        return res.status(400).json({
          success: false,
          error: 'Phone number and password are required'
        });
      }
      
      const result = await loginUser(phone, password);
      if (result.success && result.user) {
        auditLogger('user_login', result.user.id, { ip: req.ip });
        console.log('✅ Login successful, returning token');
        res.json({
          success: true,
          user: result.user,
          token: result.user.token // Ensure token is returned
        });
      } else {
        res.status(401).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  app.post("/api/auth/admin-login", authLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username and password are required'
        });
      }
      
      const result = await loginAdmin(username, password);
      if (result.success && result.admin) {
        auditLogger('admin_login', result.admin.id, { ip: req.ip });
        console.log('✅ Admin login successful, returning token');
        res.json({
          success: true,
          admin: result.admin,
          token: result.admin.token, // Include token for WebSocket authentication
          refreshToken: result.admin.refreshToken
        });
      } else {
        res.status(401).json({
          success: false,
          error: result.error || 'Invalid credentials'
        });
      }
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Token refresh endpoint (doesn't need authentication but needs rate limiting)
  app.post("/api/auth/refresh", authLimiter, async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token is required'
        });
      }

      // Verify refresh token
      const { verifyToken } = await import('../auth');
      let decoded;
      try {
        decoded = verifyToken(refreshToken);
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: 'Invalid refresh token'
        });
      }

      // Ensure this is a refresh token, not an access token
      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token type for refresh'
        });
      }

      // In a real implementation, you would check if the refresh token exists in your database
      // For now, we'll just generate new tokens based on the user's information
      const { generateTokens } = await import('../auth');
      
      // Get user information (in a real implementation, you'd fetch from database)
      const { storage } = await import('../storage-supabase');
      let user;
      if (decoded.phone) {
        user = await storage.getUserByPhone(decoded.phone);
      } else if (decoded.username) {
        const admin = await storage.getAdminByUsername(decoded.username);
        user = { id: admin.id, phone: admin.username, role: admin.role }; // Normalize for token generation
      }
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }

      // Generate new access and refresh tokens
      const newTokens = generateTokens({
        id: user.id,
        phone: user.phone,
        role: user.role || 'player'
      });

      res.json({
        success: true,
        token: newTokens.accessToken, // Keep same field name for compatibility
        refreshToken: newTokens.refreshToken
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        error: 'Token refresh failed'
      });
    }
  });

  // Logout endpoint (JWT-only - client clears token from localStorage)
  app.post("/api/auth/logout", (req, res) => {
    // With JWT, logout is handled client-side by removing token from localStorage
    // Server doesn't need to do anything (stateless)
    console.log('✅ Logout request received (client will clear token)');
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
}