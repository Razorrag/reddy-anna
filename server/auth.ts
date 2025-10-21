// Enhanced Authentication System
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
      email: newUser.username,
      role: 'user'
    });

    // Format response (remove sensitive data)
    const userResponse = {
      id: newUser.id,
      username: newUser.username,
      balance: newUser.balance,
      createdAt: newUser.created_at,
      updatedAt: newUser.updated_at
    };

    return { success: true, user: userResponse, token };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Registration failed' };
  }
};

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

    // Verify password
    const isValid = await validatePassword(password, user.password);
    if (!isValid) {
      return { success: false, error: 'Invalid password' };
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.username,
      role: 'user'
    });

    // Format response (remove sensitive data)
    const userResponse = {
      id: user.id,
      username: user.username,
      balance: user.balance,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    return { success: true, user: userResponse, token };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Login failed' };
  }
};

export const loginAdmin = async (email: string, password: string): Promise<AuthResult> => {
  try {
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email).toLowerCase();

    if (!sanitizedEmail || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    // Find admin by email using Supabase storage
    // For now, we'll just look for a specific admin user, but in a real implementation,
    // you might want to have a separate admin table in Supabase
    const admin = await storage.getUserByUsername(sanitizedEmail);
    if (!admin || !admin.username.includes('admin')) {
      return { success: false, error: 'Admin not found' };
    }

    // Verify password
    const isValid = await validatePassword(password, admin.password);
    if (!isValid) {
      return { success: false, error: 'Invalid password' };
    }

    // Generate JWT token
    const token = generateToken({
      id: admin.id,
      email: admin.username,
      role: 'admin'
    });

    // Format response (remove sensitive data)
    const adminResponse = {
      id: admin.id,
      username: admin.username,
      balance: admin.balance,
      createdAt: admin.created_at,
      updatedAt: admin.updated_at
    };

    return { success: true, admin: adminResponse, token };
  } catch (error) {
    console.error('Admin login error:', error);
    return { success: false, error: 'Admin login failed' };
  }
};

export const refreshToken = async (token: string): Promise<AuthResult> => {
  try {
    // Verify the existing token
    const decoded = verifyToken(token);
    if (!decoded) {
      return { success: false, error: 'Invalid token' };
    }

    // Find user based on role using Supabase storage
    let userOrAdmin;
    if (decoded.role === 'user' || decoded.role === 'admin') {
      userOrAdmin = await storage.getUser(decoded.id);
    }

    if (!userOrAdmin) {
      return { success: false, error: 'User not found' };
    }

    // Generate new token
    const newToken = generateToken({
      id: userOrAdmin.id,
      email: userOrAdmin.username,
      role: decoded.role
    });

    return { success: true, token: newToken };
  } catch (error) {
    console.error('Token refresh error:', error);
    return { success: false, error: 'Token refresh failed' };
  }
};

export const changePassword = async (
  userId: string, 
  currentPassword: string, 
  newPassword: string
): Promise<AuthResult> => {
  throw new Error('changePassword function not implemented in Supabase version');
};

export const forgotPassword = async (email: string): Promise<AuthResult> => {
  throw new Error('forgotPassword function not implemented in Supabase version');
};

export const resetPassword = async (token: string, newPassword: string): Promise<AuthResult> => {
  throw new Error('resetPassword function not implemented in Supabase version');
};

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
