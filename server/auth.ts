// 🔐 SIMPLIFIED SUPABASE AUTHENTICATION SYSTEM (NO JWT)
import bcrypt from 'bcrypt';
import { storage } from './storage-supabase';
import { validateMobileNumber, sanitizeInput, validatePassword as validatePasswordFormat } from './validation';

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

// Generate simple authentication token
export const generateToken = (userData: { id: string; phone?: string; username?: string; role: string }): string => {
  const tokenData = {
    id: userData.id,
    phone: userData.phone,
    username: userData.username,
    role: userData.role,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours expiration
  };
  
  // Simple base64 encoding (in production, use JWT library)
  return Buffer.from(JSON.stringify(tokenData)).toString('base64');
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

    // Hash password
    const hashedPassword = await hashPassword(sanitizedData.password);
    
    // Create new user using phone as ID with default balance from env or 0
    const defaultBalance = process.env.DEFAULT_BALANCE || "0.00";
    const newUser = await storage.createUser({
      phone: sanitizedData.phone, // Use phone as ID and phone
      password_hash: hashedPassword,
      full_name: sanitizedData.name,
      balance: defaultBalance, // Use environment variable for default balance
      referral_code: sanitizedData.referralCode || null // Store referral code if provided
    });

    // Generate authentication token
    const token = generateToken({
      id: newUser.id,
      phone: newUser.phone,
      role: 'player'
    });

    // Format response (remove sensitive data)
    const userResponse = {
      id: newUser.id, // This will be the phone number
      phone: newUser.phone,
      balance: newUser.balance, // This should be ₹100,000
      role: 'player',
      token
    };

    return { success: true, user: userResponse };
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
    const passwordToCheck = user.password_hash;
    if (!passwordToCheck) {
      console.log('No password found for user:', user.id);
      return { success: false, error: 'Invalid credentials' };
    }
    
    const isValid = await validatePassword(password, passwordToCheck);
    if (!isValid) {
      console.log('Invalid password for user:', user.id);
      return { success: false, error: 'Invalid password' };
    }

    console.log('Successful login for user:', user.id);
    
    // Update last login
    await storage.updateUser(user.id, { last_login: new Date().toISOString() });

    // Generate authentication token
    const token = generateToken({
      id: user.id,
      phone: user.phone,
      role: user.role || 'player'
    });

    // Format response (remove sensitive data)
    const userResponse = {
      id: user.id, // Phone number as ID
      phone: user.phone,
      balance: user.balance, // This should be ₹100,000 for test users
      role: user.role || 'player',
      token
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
    const admin = await storage.getAdminByUsername(sanitizedUsername);
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
    const isValid = await validatePassword(password, admin.password_hash);
    console.log('Admin password validation result:', isValid);
    
    if (!isValid) {
      return { success: false, error: 'Invalid password' };
    }

    // Generate authentication token
    const token = generateToken({
      id: admin.id,
      username: admin.username,
      role: admin.role || 'admin'
    });

    // Format response (remove sensitive data)
    const adminResponse = {
      id: admin.id,
      username: admin.username,
      role: admin.role || 'admin',
      token
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

// 🔧 PASSWORD RESET (Placeholder for future implementation)
export const forgotPassword = async (phone: string): Promise<AuthResult> => {
  // TODO: Implement password reset functionality
  // 1. Generate reset token
  // 2. Send SMS with reset link
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

// 🛡️ REQUIRE AUTH MIDDLEWARE
export const requireAuth = (req: any, res: any, next: any) => {
  // Check for token in Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;
  
  // Check session authentication
  if (req.session && req.session.user) {
    req.user = req.session.user;
    console.log('✅ Authenticated via session:', req.user.id);
    return next();
  }
  
  // Check token authentication
  if (token) {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      
      // Check token expiration
      if (decoded.exp && Date.now() > decoded.exp) {
        return res.status(401).json({ 
          success: false, 
          error: 'Token expired' 
        });
      }
      
      req.user = {
        id: decoded.id,
        phone: decoded.phone,
        username: decoded.username,
        role: decoded.role
      };
      console.log('✅ Authenticated via token:', req.user.id);
      return next();
    } catch (error) {
      console.error('Token validation error:', error);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }
  }
  
  // Development mode fallback - only for non-production
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️ Development mode: Using default user');
    req.user = {
      id: 'dev-user',
      username: 'dev-user',
      role: 'player'
    };
    return next();
  }
  
  // No valid authentication found
  console.log('❌ Authentication required');
  return res.status(401).json({ 
    success: false, 
    error: 'Authentication required' 
  });
};

// 👑 REQUIRE ROLE MIDDLEWARE
export const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    // First check if user is authenticated
    if (!req.user) {
      console.log('❌ No user found in request');
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }
    
    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      console.log(`❌ Access denied. Required roles: ${roles.join(', ')}, User role: ${req.user.role}`);
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }
    
    console.log(`✅ Role check passed for ${req.user.id} (${req.user.role})`);
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
