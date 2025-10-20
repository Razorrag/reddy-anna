// Enhanced Authentication System
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, Admin } from './data';
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

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email: sanitizedData.email }, { mobile: sanitizedData.mobile }] 
    });
    if (existingUser) {
      return { success: false, error: 'User already exists with this email or mobile' };
    }

    // Handle referral code if provided
    let referredBy = null;
    if (sanitizedData.referralCode) {
      const referrer = await User.findOne({ referralCode: sanitizedData.referralCode });
      if (referrer) {
        referredBy = referrer.id;
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(sanitizedData.password);

    // Create new user
    const newUser = new User({
      id: uuidv4(),
      name: sanitizedData.name,
      email: sanitizedData.email,
      mobile: sanitizedData.mobile,
      password: hashedPassword,
      balance: 100, // Starting balance
      referralCode: generateReferralCode(),
      referredBy: referredBy,
      joinDate: new Date(),
      lastLogin: new Date(),
      status: 'active',
      profile: {
        address: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        dateOfBirth: null,
        gender: '',
        profilePicture: ''
      }
    });

    await newUser.save();

    // Update referrer's referred users list if referral was used
    if (referredBy) {
      const referrer = await User.findById(referredBy);
      if (referrer) {
        referrer.referredUsers.push(newUser.id);
        await referrer.save();
      }
    }

    // Generate JWT token
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: 'user'
    });

    // Remove password from response
    const userResponse = newUser.toJSON();
    delete userResponse.password;

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

    // Find user by email
    const user = await User.findOne({ email: sanitizedEmail });
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check if user is active
    if (user.status !== 'active') {
      return { success: false, error: 'Account is not active' };
    }

    // Verify password
    const isValid = await validatePassword(password, user.password);
    if (!isValid) {
      return { success: false, error: 'Invalid password' };
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: 'user'
    });

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

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

    // Find admin by email
    const admin = await Admin.findOne({ email: sanitizedEmail });
    if (!admin) {
      return { success: false, error: 'Admin not found' };
    }

    // Check if admin is active
    if (admin.status !== 'active') {
      return { success: false, error: 'Admin account is not active' };
    }

    // Verify password
    const isValid = await validatePassword(password, admin.password);
    if (!isValid) {
      return { success: false, error: 'Invalid password' };
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const token = generateToken({
      id: admin.id,
      email: admin.email,
      role: admin.role
    });

    // Remove password from response
    const adminResponse = admin.toJSON();
    delete adminResponse.password;

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

    // Find user/admin based on role
    let userOrAdmin;
    if (decoded.role === 'user') {
      userOrAdmin = await User.findById(decoded.id);
    } else if (decoded.role === 'admin' || decoded.role === 'superadmin') {
      userOrAdmin = await Admin.findById(decoded.id);
    }

    if (!userOrAdmin) {
      return { success: false, error: 'User not found' };
    }

    // Check if account is still active
    if (userOrAdmin.status !== 'active') {
      return { success: false, error: 'Account is not active' };
    }

    // Generate new token
    const newToken = generateToken({
      id: userOrAdmin.id,
      email: userOrAdmin.email,
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
  try {
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Verify current password
    const isValid = await validatePassword(currentPassword, user.password);
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Validate new password
    if (!validatePasswordFormat(newPassword)) {
      return { 
        success: false, 
        error: 'New password must be at least 8 characters with uppercase, lowercase, and number' 
      };
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    user.password = hashedNewPassword;
    user.updatedAt = new Date();
    await user.save();

    return { success: true };
  } catch (error) {
    console.error('Password change error:', error);
    return { success: false, error: 'Password change failed' };
  }
};

export const forgotPassword = async (email: string): Promise<AuthResult> => {
  try {
    // Sanitize email
    const sanitizedEmail = sanitizeInput(email).toLowerCase();

    // Find user
    const user = await User.findOne({ email: sanitizedEmail });
    if (!user) {
      // Don't reveal if user exists for security
      return { success: true, error: 'If an account exists with this email, a password reset link has been sent' };
    }

    // Generate reset token (in a real implementation, this would be sent via email)
    const resetToken = generateToken({
      id: user.id,
      email: user.email,
      type: 'password_reset'
    });

    // In a real implementation, send email with reset link
    console.log(`Password reset token for ${user.email}: ${resetToken}`);

    return { 
      success: true, 
      error: 'If an account exists with this email, a password reset link has been sent' 
    };
  } catch (error) {
    console.error('Forgot password error:', error);
    return { success: false, error: 'Password reset request failed' };
  }
};

export const resetPassword = async (token: string, newPassword: string): Promise<AuthResult> => {
  try {
    // Verify reset token
    const decoded = verifyToken(token);
    if (!decoded || decoded.type !== 'password_reset') {
      return { success: false, error: 'Invalid or expired reset token' };
    }

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Validate new password
    if (!validatePasswordFormat(newPassword)) {
      return { 
        success: false, 
        error: 'Password must be at least 8 characters with uppercase, lowercase, and number' 
      };
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    user.password = hashedNewPassword;
    user.updatedAt = new Date();
    await user.save();

    return { success: true };
  } catch (error) {
    console.error('Reset password error:', error);
    return { success: false, error: 'Password reset failed' };
  }
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
