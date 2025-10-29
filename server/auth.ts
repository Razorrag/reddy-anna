// 🔐 JWT-BASED AUTHENTICATION SYSTEM WITH REFRESH TOKENS
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { storage } from './storage-supabase';
import { validateMobileNumber, sanitizeInput, validatePassword as validatePasswordFormat } from './validation';
import { User } from '@shared/schema';
import { supabaseServer } from './lib/supabaseServer';

export interface AuthResult {
  success: boolean;
  user?: any;
  admin?: any;
  error?: string;
  errors?: string[];
}

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const validatePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

// Generate JWT access token with shorter expiration
export const generateAccessToken = (userData: { id: string; phone?: string; username?: string; role: string }): string => {
  const secret = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h'; // 1 hour default
  
  return jwt.sign(
    {
      id: userData.id,
      phone: userData.phone,
      username: userData.username,
      role: userData.role,
      type: 'access'
    },
    secret,
    { expiresIn: expiresIn } as jwt.SignOptions
  );
};

// Generate JWT refresh token with longer expiration
export const generateRefreshToken = (userData: { id: string; phone?: string; username?: string; role: string }): string => {
  const secret = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // 7 days default
  
  const refreshToken = jwt.sign(
    {
      id: userData.id,
      phone: userData.phone,
      username: userData.username,
      role: userData.role,
      type: 'refresh'
    },
    secret,
    { expiresIn: expiresIn } as jwt.SignOptions
  );
  
  // In a real application, you'd store the refresh token in a database
  // For now, we'll just return it to be stored by the client
  return refreshToken;
};

// Verify JWT token
export const verifyToken = (token: string): any => {
  const secret = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
  try {
    return jwt.verify(token, secret) as any;
  } catch (error: any) {
    console.error('Token verification error:', error?.message || error);
    
    // Provide more specific error messages based on the type of JWT error
    if (error.name === 'JsonWebTokenError') {
      if (error.message.includes('invalid signature')) {
        console.error('❌ JWT Signature mismatch - token may have been created with different secret');
        throw new Error('Invalid token signature. Please login again.');
      } else if (error.message.includes('invalid token')) {
        throw new Error('Invalid token format');
      } else {
        throw new Error('Token verification failed');
      }
    } else if (error.name === 'TokenExpiredError') {
      console.error('❌ Token has expired');
      throw new Error('Token has expired. Please login again.');
    } else {
      console.error('❌ Unexpected token error:', error.message);
      throw new Error('Invalid or expired token');
    }
  }
};

// Verify refresh token specifically
export const verifyRefreshToken = (token: string): any => {
  const secret = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
  try {
    const decoded = jwt.verify(token, secret) as any;
    
    // Ensure this is a refresh token
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type. Expected refresh token.');
    }
    
    return decoded;
  } catch (error: any) {
    console.error('Refresh token verification error:', error?.message || error);
    
    // Provide more specific error messages based on the type of JWT error
    if (error.name === 'JsonWebTokenError') {
      if (error.message.includes('invalid signature')) {
        console.error('❌ Refresh token signature mismatch - token may have been created with different secret');
        throw new Error('Invalid refresh token signature. Please login again.');
      } else if (error.message.includes('invalid token')) {
        throw new Error('Invalid refresh token format');
      } else {
        throw new Error('Refresh token verification failed');
      }
    } else if (error.name === 'TokenExpiredError') {
      console.error('❌ Refresh token has expired');
      throw new Error('Refresh token has expired. Please login again.');
    } else {
      console.error('❌ Unexpected refresh token error:', error.message);
      throw new Error('Invalid or expired refresh token');
    }
  }
};

// Generate authentication tokens (both access and refresh)
export const generateTokens = (userData: { id: string; phone?: string; username?: string; role: string }) => {
  return {
    accessToken: generateAccessToken(userData),
    refreshToken: generateRefreshToken(userData)
  };
};

// 🎯 REGISTER USER WITH PHONE NUMBER
export const registerUser = async (userData: {
  name: string;
  phone: string; // Changed from email to phone
  password: string;
  confirmPassword: string; // New field for validation
  referralCode?: string; // Optional referral code
}): Promise<AuthResult> => {
  try {
    // Sanitize input data
    const sanitizedData = sanitizeInput(userData);

    // Validate inputs
    const validation = validateUserRegistrationData(sanitizedData);
    if (!validation.isValid) {
      return { success: false, error: 'Validation failed', errors: validation.errors };
    }

    // Check if user already exists (using phone number)
    const existingUser = await storage.getUserByPhone(sanitizedData.phone);
    if (existingUser) {
      return { success: false, error: 'User already exists with this phone number' };
    }

    // Check if referral code is valid (if provided)
    let referrerUser = null;
    if (sanitizedData.referralCode) {
      // Use the existing storage method to find referrer by referral code
      // First, we need to import supabaseServer, but since it's in a different file, 
      // we'll use the storage method which should be available
      try {
        // Try to find user by referral_code_generated field using raw query
        // since it's not in the standard interface
        const { data: referrerData, error: referrerError } = await supabaseServer
          .from('users')
          .select('id, phone, full_name')
          .eq('referral_code_generated', sanitizedData.referralCode)
          .single();

        if (referrerError || !referrerData) {
          return { success: false, error: 'Invalid referral code' };
        }
        
        referrerUser = referrerData;
      } catch (error) {
        console.error('Error finding referrer by referral code:', error);
        return { success: false, error: 'Invalid referral code' };
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(sanitizedData.password);
    
    // Create new user with phone as both ID and phone number
    const defaultBalance = parseFloat(process.env.DEFAULT_BALANCE || "0.00");
    
    try {
      const newUser = await storage.createUser({
        phone: sanitizedData.phone,
        password_hash: hashedPassword,
        full_name: sanitizedData.name,
        balance: defaultBalance.toString(),
        referral_code: sanitizedData.referralCode || null,
        role: 'player',
        status: 'active',
        total_winnings: "0",
        total_losses: "0",
        games_played: 0,
        games_won: 0,
        phone_verified: false,
        original_deposit_amount: defaultBalance.toString(),
        deposit_bonus_available: "0",
        referral_bonus_available: "0",
        total_bonus_earned: "0",
        last_login: new Date()
      });

      // If a referral code was used, create the referral relationship
      if (referrerUser) {
        try {
          // Use the existing method in storage to track referral
          await storage.checkAndApplyReferralBonus(newUser.id, defaultBalance); // This handles referral tracking internally
        } catch (referralError) {
          console.error('Error tracking referral:', referralError);
          // Don't fail the registration for referral tracking issues
        }
      }

      // Generate authentication tokens
      const { accessToken, refreshToken } = generateTokens({
        id: newUser.id,
        phone: newUser.phone,
        role: newUser.role || 'player'
      });

      // Format response (remove sensitive data)
      const userResponse = {
        id: newUser.id,
        phone: newUser.phone,
        balance: parseFloat(newUser.balance),
        role: newUser.role || 'player',
        token: accessToken, // Keep same field name for compatibility
        refreshToken
      };

      return { success: true, user: userResponse };
    } catch (storageError) {
      console.error('Storage error during registration:', storageError);
      // Check if it's a duplicate key error
      if (storageError instanceof Error && storageError.message.includes('duplicate')) {
        return { success: false, error: 'User already exists with this phone number' };
      }
      return { success: false, error: 'Database error during registration' };
    }
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Registration failed' };
  }
};

// 🔑 LOGIN USER WITH PHONE NUMBER
export const loginUser = async (phone: string, password: string): Promise<AuthResult> => {
  try {
    // Sanitize inputs
    const sanitizedPhone = sanitizeInput(phone).replace(/[^0-9]/g, ''); // Keep only digits

    if (!sanitizedPhone || !password) {
      console.log('Login validation failed: missing phone or password');
      return { success: false, error: 'Phone number and password are required' };
    }

    console.log('Login attempt for phone:', sanitizedPhone); // Debug log

    // Find user by phone number instead of email/username
    const user = await storage.getUserByPhone(sanitizedPhone);
    
    console.log('User lookup result:', user ? 'User found' : 'User not found');
    if (!user) {
      console.log('Failed login attempt for phone:', sanitizedPhone);
      return { success: false, error: 'User not found' };
    }

    console.log('User found, attempting password validation for user ID:', user.id);

    // Verify password
    if (!user.password_hash) {
      console.log('No password found for user:', user.id);
      return { success: false, error: 'Invalid credentials' };
    }
    
    const isValid = await validatePassword(password, user.password_hash);
    if (!isValid) {
      console.log('Invalid password for user:', user.id);
      return { success: false, error: 'Invalid password' };
    }

    console.log('Successful login for user:', user.id);
    
    // Update last login
    try {
      await storage.updateUser(user.id, {
        last_login: new Date()
      });
    } catch (updateError) {
      console.error('Error updating last login:', updateError);
      // Don't fail the login just because we couldn't update last login
    }

    // Generate authentication tokens
    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      phone: user.phone,
      role: user.role || 'player'
    });

    // Format response (remove sensitive data)
    const userResponse = {
      id: user.id, // Phone number as ID
      phone: user.phone,
      balance: parseFloat(user.balance || '0'),
      role: user.role || 'player',
      token: accessToken, // Keep same field name for compatibility
      refreshToken
    };

    return { success: true, user: userResponse };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Login failed' };
  }
};

// 👑 LOGIN ADMIN WITH USERNAME AND PASSWORD
export const loginAdmin = async (username: string, password: string): Promise<AuthResult> => {
  try {
    const sanitizedUsername = sanitizeInput(username).toLowerCase();

    console.log('Admin login attempt:', { sanitizedUsername, passwordProvided: !!password });

    if (!sanitizedUsername || !password) {
      return { success: false, error: 'Username and password are required' };
    }

    // Find admin by username in admin_credentials table
    let admin = await storage.getAdminByUsername(sanitizedUsername);
    
    // If not found in storage, try to create a default admin (development only)
    if (!admin && process.env.NODE_ENV === 'development') {
      console.log('No admin found, attempting to set up default admin...');
      try {
        const { ensureAdminExists } = await import('../scripts/setup-admin');
        await ensureAdminExists();
        
        // Try again after setup
        admin = await storage.getAdminByUsername(sanitizedUsername);
      } catch (setupError) {
        console.error('Error during admin setup:', setupError);
      }
    }
    
    if (!admin) {
      console.log('Admin not found for username:', sanitizedUsername);
      return { success: false, error: 'Admin not found' };
    }

    console.log('Admin found:', { 
      id: admin.id, 
      username: admin.username,
      role: admin.role,
      hasPasswordHash: !!admin.password_hash
    });

    // Verify admin password
    if (!admin.password_hash) {
      console.log('No password hash found for admin:', admin.id);
      return { success: false, error: 'Invalid credentials' };
    }
    
    const isValid = await validatePassword(password, admin.password_hash);
    console.log('Admin password validation result:', isValid);
    
    if (!isValid) {
      return { success: false, error: 'Invalid password' };
    }

    // Generate authentication tokens
    const { accessToken, refreshToken } = generateTokens({
      id: admin.id,
      username: admin.username,
      role: admin.role || 'admin'
    });

    // Format response (remove sensitive data)
    const adminResponse = {
      id: admin.id,
      username: admin.username,
      role: admin.role || 'admin',
      token: accessToken, // Keep same field name for compatibility
      refreshToken
    };

    console.log('Admin login successful for:', admin.username);
    return { success: true, admin: adminResponse };
  } catch (error) {
    console.error('Admin login error:', error);
    return { success: false, error: 'Admin login failed' };
  }
};

// 🔍 GET USER BY ID
export const getUserById = async (userId: string) => {
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return null;
    }

    // Remove sensitive data
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
};

// 📝 UPDATE USER PROFILE
export const updateUserProfile = async (userId: string, updates: any) => {
  try {
    const updatedUser = await storage.updateUser(userId, updates);
    if (!updatedUser) {
      return { success: false, error: 'User not found' };
    }

    // Remove sensitive data
    const { password_hash, ...userWithoutPassword } = updatedUser;
    return { success: true, user: userWithoutPassword };
  } catch (error) {
    console.error('Update user error:', error);
    return { success: false, error: 'Profile update failed' };
  }
};

// 🔧 PASSWORD RESET UTILITY FUNCTIONS
/**
 * Generate a secure password reset token
 * @param userId - User ID to generate token for
 * @returns Object containing token and hashed token for storage
 */
const generatePasswordResetToken = (userId: string): { token: string; tokenHash: string; expiresAt: Date } => {
  // Generate a cryptographically secure random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Hash the token for secure storage (similar to password hashing)
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  // Set expiration time (15 minutes from now)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  
  return { token, tokenHash, expiresAt };
};

/**
 * Store password reset token in database
 * @param userId - User ID to store token for
 * @param tokenHash - Hashed token to store
 * @param expiresAt - Token expiration time
 * @returns Success status
 */
const storePasswordResetToken = async (userId: string, tokenHash: string, expiresAt: Date): Promise<boolean> => {
  try {
    const { data, error } = await supabaseServer
      .from('password_reset_tokens')
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (error) {
      console.error('Error storing password reset token:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in storePasswordResetToken:', error);
    return false;
  }
};

/**
 * Find and validate password reset token
 * @param token - Plain token to validate
 * @returns Object with user ID if valid, null otherwise
 */
const validatePasswordResetToken = async (token: string): Promise<{ userId: string; tokenId: string } | null> => {
  try {
    // Hash the token to match against stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const { data, error } = await supabaseServer
      .from('password_reset_tokens')
      .select('id, user_id, used, expires_at')
      .eq('token_hash', tokenHash)
      .single();

    if (error || !data) {
      console.error('Password reset token not found:', error);
      return null;
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    if (now > expiresAt) {
      console.error('Password reset token has expired');
      return null;
    }

    // Check if token has already been used
    if (data.used) {
      console.error('Password reset token has already been used');
      return null;
    }

    return { userId: data.user_id, tokenId: data.id };
  } catch (error) {
    console.error('Error validating password reset token:', error);
    return null;
  }
};

/**
 * Mark password reset token as used
 * @param tokenId - ID of the token to mark as used
 * @returns Success status
 */
const markTokenAsUsed = async (tokenId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabaseServer
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', tokenId);

    if (error) {
      console.error('Error marking token as used:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markTokenAsUsed:', error);
    return false;
  }
};

/**
 * Send password reset SMS (Placeholder for SMS service integration)
 * @param phone - User's phone number
 * @param resetToken - Reset token to include in SMS
 * @returns Success status
 */
const sendPasswordResetSMS = async (phone: string, resetToken: string): Promise<boolean> => {
  try {
    // TODO: Integrate with actual SMS service (Twilio, MSG91, etc.)
    // For now, log the reset token for development
    console.log(`Password reset token for ${phone}: ${resetToken}`);
    console.log(`Reset URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`);
    
    // In production, this would send an SMS with the reset link
    return true;
  } catch (error) {
    console.error('Error sending password reset SMS:', error);
    return false;
  }
};

// 🔧 PASSWORD RESET IMPLEMENTATION
export const forgotPassword = async (phone: string): Promise<AuthResult> => {
  try {
    // Sanitize and validate phone number
    const sanitizedPhone = sanitizeInput(phone).replace(/[^0-9]/g, '');
    
    if (!sanitizedPhone || !validateMobileNumber(sanitizedPhone)) {
      return { success: false, error: 'Valid 10-digit Indian mobile number is required' };
    }

    console.log('Password reset requested for phone:', sanitizedPhone);

    // Find user by phone number
    const user = await storage.getUserByPhone(sanitizedPhone);
    
    if (!user) {
      // Don't reveal whether user exists for security
      console.log('Password reset attempted for non-existent user:', sanitizedPhone);
      return { success: true, error: 'If an account with that phone number exists, a password reset link has been sent.' };
    }

    // Generate secure reset token
    const { token, tokenHash, expiresAt } = generatePasswordResetToken(user.id);
    
    // Store token in database
    const tokenStored = await storePasswordResetToken(user.id, tokenHash, expiresAt);
    
    if (!tokenStored) {
      return { success: false, error: 'Failed to generate password reset token. Please try again.' };
    }

    // Send reset token via SMS
    const smsSent = await sendPasswordResetSMS(user.phone, token);
    
    if (!smsSent) {
      console.error('Failed to send password reset SMS for user:', user.id);
      // Don't fail the operation if SMS fails, but log the error
    }

    console.log('Password reset token sent successfully for user:', user.id);
    return {
      success: true,
      error: 'If an account with that phone number exists, a password reset link has been sent.'
    };
  } catch (error) {
    console.error('Password reset error:', error);
    return { success: false, error: 'Password reset failed. Please try again later.' };
  }
};

export const resetPassword = async (token: string, newPassword: string): Promise<AuthResult> => {
  try {
    // Validate token format
    if (!token || typeof token !== 'string' || token.length !== 64) {
      return { success: false, error: 'Invalid reset token format' };
    }

    // Validate new password
    if (!newPassword || !validatePasswordFormat(newPassword)) {
      return {
        success: false,
        error: 'Password must be at least 8 characters with uppercase, lowercase, and number'
      };
    }

    console.log('Password reset attempt with token:', token.substring(0, 8) + '...');

    // Validate the reset token
    const tokenData = await validatePasswordResetToken(token);
    
    if (!tokenData) {
      return { success: false, error: 'Invalid or expired reset token' };
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update user's password
    try {
      const updatedUser = await storage.updateUser(tokenData.userId, {
        password_hash: hashedPassword,
        // Update last_login to invalidate any existing sessions
        last_login: new Date()
      });

      if (!updatedUser) {
        return { success: false, error: 'User not found' };
      }

      // Mark the reset token as used
      const tokenMarked = await markTokenAsUsed(tokenData.tokenId);
      
      if (!tokenMarked) {
        console.error('Failed to mark reset token as used for user:', tokenData.userId);
        // Don't fail the password reset if this fails, but log the error
      }

      console.log('Password reset successful for user:', tokenData.userId);
      return { success: true };
    } catch (updateError) {
      console.error('Error updating user password:', updateError);
      return { success: false, error: 'Failed to update password. Please try again.' };
    }
  } catch (error) {
    console.error('Password reset error:', error);
    return { success: false, error: 'Password reset failed. Please try again later.' };
  }
};

export const changePassword = async (
  userId: string, 
  currentPassword: string, 
  newPassword: string
): Promise<AuthResult> => {
  try {
    // Get user from database
    const user = await storage.getUser(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Verify current password
    const isValid = await validatePassword(currentPassword, user.password_hash);
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password in database
    await storage.updateUser(userId, { password_hash: hashedNewPassword });

    return { success: true };
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, error: 'Password change failed' };
  }
};

// 🛡️ REQUIRE AUTH MIDDLEWARE - JWT ONLY
export const requireAuth = (req: any, res: any, next: any) => {
  // Check for token in Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;
  
  // JWT token authentication (ONLY method)
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please login to continue.',
      code: 'NO_TOKEN'
    });
  }
  
  try {
    const decoded = verifyToken(token);
    
    // Ensure this is an access token, not a refresh token
    if (decoded.type !== 'access') {
      console.error('❌ Invalid token type:', decoded.type);
      return res.status(401).json({
        success: false,
        error: 'Invalid token type. Please use an access token.',
        code: 'INVALID_TOKEN_TYPE'
      });
    }
    
    req.user = {
      id: decoded.id,
      phone: decoded.phone,
      username: decoded.username,
      role: decoded.role
    };
    return next();
  } catch (error) {
    console.error('❌ Token validation error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token. Please login again.',
      code: 'TOKEN_INVALID'
    });
  }
};

// 👑 REQUIRE ROLE MIDDLEWARE
export const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    // First check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false, 
        error: 'Authentication required' 
      });
    }
    
    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false, 
        error: 'Insufficient permissions' 
      });
    }
    
    next();
  };
};

// 🔐 VALIDATION FUNCTION FOR USER REGISTRATION
export const validateUserRegistrationData = (userData: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!userData.name || userData.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  
  if (!userData.phone || !validateMobileNumber(userData.phone)) {
    errors.push('Valid 10-digit Indian mobile number is required');
  }
  
  if (!userData.password || !validatePasswordFormat(userData.password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase, and number');
  }
  
  if (!userData.confirmPassword || userData.password !== userData.confirmPassword) {
    errors.push('Passwords do not match');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// 🔐 VALIDATION FUNCTION FOR ADMIN LOGIN
export const validateAdminLoginData = (loginData: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!loginData.username || loginData.username.trim().length < 3) {
    errors.push('Username must be at least 3 characters');
  }
  
  if (!loginData.password) {
    errors.push('Password is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// 🔐 VALIDATION FUNCTION FOR USER LOGIN
export const validateUserLoginData = (loginData: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!loginData.phone || !validateMobileNumber(loginData.phone)) {
    errors.push('Valid 10-digit Indian mobile number is required');
  }
  
  if (!loginData.password) {
    errors.push('Password is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
