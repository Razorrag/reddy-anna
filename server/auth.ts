// 🔐 UNIFIED SUPABASE AUTHENTICATION SYSTEM
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage-supabase';
import { validateMobileNumber, validateEmail, validateUserData, sanitizeInput, validatePassword as validatePasswordFormat } from './validation';

export interface AuthResult {
  success: boolean;
  user?: any;
  admin?: any;
  token?: string;
  error?: string;
  errors?: string[];
}

export const generateToken = (payload: any): string => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'default_secret', { 
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: process.env.JWT_ISSUER || 'AndarBaharApp',
    audience: process.env.JWT_AUDIENCE || 'users'
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'default_secret', {
      issuer: process.env.JWT_ISSUER || 'AndarBaharApp',
      audience: process.env.JWT_AUDIENCE || 'users'
    } as jwt.VerifyOptions);
  } catch (error) {
    return null;
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const validatePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

export const generateReferralCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 🎯 REGISTER USER WITH SUPABASE
export const registerUser = async (userData: {
  name: string;
  email: string;
  mobile: string;
  password: string;
  referralCode?: string;
}): Promise<AuthResult> => {
  try {
    // Sanitize input data
    const sanitizedData = sanitizeInput(userData);

    // Validate inputs
    const validation = validateUserData(sanitizedData);
    if (!validation.isValid) {
      return { success: false, error: 'Validation failed', errors: validation.errors };
    }

    // Check if user already exists (using Supabase)
    const existingUser = await storage.getUserByUsername(sanitizedData.email);
    if (existingUser) {
      return { success: false, error: 'User already exists with this email' };
    }

    // Hash password
    const hashedPassword = await hashPassword(sanitizedData.password);
    
    // Create new user using Supabase storage
    const newUser = await storage.createUser({
      username: sanitizedData.email,
      password: hashedPassword
    });

    // Generate JWT token
    const token = generateToken({
      id: newUser.id,
      username: newUser.username,
      role: 'player'
    });

    // Format response (remove sensitive data)
    const userResponse = {
      id: newUser.id,
      username: newUser.username,
      balance: newUser.balance
    };

    return { success: true, user: userResponse, token };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Registration failed' };
  }
};

// 🔑 LOGIN USER WITH SUPABASE
export const loginUser = async (email: string, password: string): Promise<AuthResult> => {
  try {
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email).toLowerCase();

    if (!sanitizedEmail || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    // Find user by email using Supabase storage
    const user = await storage.getUserByUsername(sanitizedEmail);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Verify password - handle both password and password_hash fields
    const passwordToCheck = (user as any).password_hash || (user as any).password;
    const isValid = await validatePassword(password, passwordToCheck);
    if (!isValid) {
      return { success: false, error: 'Invalid password' };
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: 'player'
    });

    // Format response (remove sensitive data)
    const userResponse = {
      id: user.id,
      username: user.username,
      balance: user.balance,
      role: 'player' // <-- ADD THIS LINE
    };

    return { success: true, user: userResponse, token };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Login failed' };
  }
};

// 👑 LOGIN ADMIN WITH SUPABASE
export const loginAdmin = async (email: string, password: string): Promise<AuthResult> => {
  try {
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email).toLowerCase();

    console.log('Admin login attempt:', { sanitizedEmail, passwordProvided: !!password });

    if (!sanitizedEmail || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    // Find admin by email using Supabase storage
    const admin = await storage.getUserByUsername(sanitizedEmail);
    if (!admin) {
      console.log('Admin not found for email:', sanitizedEmail);
      return { success: false, error: 'Admin not found' };
    }

    console.log('Admin found:', { 
      id: admin.id, 
      username: admin.username,
      role: (admin as any).role,
      hasPasswordHash: !!(admin as any).password_hash,
      hasPassword: !!(admin as any).password
    });

    // Verify password - handle both password and password_hash fields
    const passwordToCheck = (admin as any).password_hash || (admin as any).password;
    console.log('Password to check exists:', !!passwordToCheck);
    
    const isValid = await validatePassword(password, passwordToCheck);
    console.log('Password validation result:', isValid);
    
    if (!isValid) {
      return { success: false, error: 'Invalid password' };
    }

    // Get the actual role from the database
    const adminRole = (admin as any).role || 'admin';

    // Generate JWT token
    const token = generateToken({
      id: admin.id,
      username: admin.username,
      role: adminRole
    });

    // Format response (remove sensitive data)
    const adminResponse = {
      id: admin.id,
      username: admin.username,
      balance: admin.balance,
      role: adminRole // <-- ADD THIS LINE
    };

    console.log('Admin login successful for:', admin.username);
    return { success: true, admin: adminResponse, token };
  } catch (error) {
    console.error('Admin login error:', error);
    return { success: false, error: 'Admin login failed' };
  }
};

// 🔄 REFRESH TOKEN
export const refreshToken = async (token: string): Promise<AuthResult> => {
  try {
    // Verify the existing token
    const decoded = verifyToken(token);
    if (!decoded) {
      return { success: false, error: 'Invalid token' };
    }

    // Find user based on role using Supabase storage
    const userOrAdmin = await storage.getUser(decoded.id);
    if (!userOrAdmin) {
      return { success: false, error: 'User not found' };
    }

    // Generate new token
    const newToken = generateToken({
      id: userOrAdmin.id,
      username: userOrAdmin.username,
      role: decoded.role
    });

    return { success: true, token: newToken };
  } catch (error) {
    console.error('Token refresh error:', error);
    return { success: false, error: 'Token refresh failed' };
  }
};

// 🔐 AUTHENTICATION MIDDLEWARE
export const authenticateToken = (token: string): { valid: boolean; user?: any; error?: string } => {
  try {
    const decoded = verifyToken(token);
    if (!decoded) {
      return { valid: false, error: 'Invalid token' };
    }

    return { valid: true, user: decoded };
  } catch (error) {
    return { valid: false, error: 'Token validation failed' };
  }
};

// 🛡️ REQUIRE AUTH MIDDLEWARE
export const requireAuth = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No token provided.'
    });
  }

  const authResult = authenticateToken(token);
  if (!authResult.valid) {
    return res.status(401).json({
      success: false,
      error: authResult.error
    });
  }

  req.user = authResult.user;
  next();
};

// 👑 REQUIRE ROLE MIDDLEWARE
export const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
    }

    const authResult = authenticateToken(token);
    if (!authResult.valid) {
      return res.status(401).json({
        success: false,
        error: authResult.error
      });
    }

    if (!roles.includes(authResult.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions.'
      });
    }

    req.user = authResult.user;
    next();
  };
};

// 🔍 GET USER BY ID
export const getUserById = async (userId: string) => {
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return null;
    }

    // Remove sensitive data
    const { password, ...userWithoutPassword } = user;
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
    const { password, ...userWithoutPassword } = updatedUser;
    return { success: true, user: userWithoutPassword };
  } catch (error) {
    console.error('Update user error:', error);
    return { success: false, error: 'Profile update failed' };
  }
};

// 🚪 LOGOUT USER
export const logoutUser = async (token: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // In a real implementation, you might want to:
    // 1. Add the token to a blacklist
    // 2. Remove the session from database
    // 3. Clear any cached user data
    
    // For now, we'll just verify the token is valid
    const decoded = verifyToken(token);
    if (!decoded) {
      return { success: false, error: 'Invalid token' };
    }

    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: 'Logout failed' };
  }
};

// 📊 VALIDATE SESSION
export const validateSession = async (token: string): Promise<{ valid: boolean; user?: any; error?: string }> => {
  try {
    const authResult = authenticateToken(token);
    if (!authResult.valid) {
      return { valid: false, error: authResult.error };
    }

    // Check if user still exists in database
    const user = await getUserById(authResult.user.id);
    if (!user) {
      return { valid: false, error: 'User not found' };
    }

    return { valid: true, user };
  } catch (error) {
    console.error('Session validation error:', error);
    return { valid: false, error: 'Session validation failed' };
  }
};

// 🔧 PASSWORD RESET (Placeholder for future implementation)
export const forgotPassword = async (email: string): Promise<AuthResult> => {
  // TODO: Implement password reset functionality
  // 1. Generate reset token
  // 2. Send email with reset link
  // 3. Store reset token in database
  return { success: false, error: 'Password reset not implemented yet' };
};

export const resetPassword = async (token: string, newPassword: string): Promise<AuthResult> => {
  // TODO: Implement password reset functionality
  // 1. Verify reset token
  // 2. Update password in database
  // 3. Invalidate reset token
  return { success: false, error: 'Password reset not implemented yet' };
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
    const isValid = await validatePassword(currentPassword, user.password);
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password in database
    await storage.updateUser(userId, { password: hashedNewPassword });

    return { success: true };
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, error: 'Password change failed' };
  }
};
