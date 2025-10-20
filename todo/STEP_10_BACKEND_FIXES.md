# Step 10: Implement Proper Backend Fixes According to Changes

## Goal
Implement proper backend fixes that align with all frontend changes, ensuring consistency and functionality across the entire application.

## Current State
- Frontend has been updated with new components and game logic
- WebSocket broadcasting has been implemented for game events
- Server routes have been modified to broadcast messages
- Need to ensure backend properly handles authentication, data management, and game operations
- Need to implement content management, transaction processing, and user management features

## Target State
- Complete backend authentication system with enhanced security
- Content management system for site content and settings
- Transaction processing system with multiple payment methods
- User management system with comprehensive CRUD operations
- Game state management with proper synchronization
- Payment gateway integrations
- Admin panel with comprehensive features
- Proper data validation and security measures

## Files to Modify/Create
- `server/auth.ts` (authentication system)
- `server/payment.ts` (payment processing)
- `server/user-management.ts` (user management)
- `server/content-management.ts` (content management)
- `server/data.ts` (data models)
- `server/validation.ts` (validation system)
- `server/security.ts` (security measures)
- `server/routes.ts` (updated with all new functionality)

## Detailed Changes

### 1. Create Enhanced Authentication System

```ts
// server/auth.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, Admin } from './data';
import { validateMobileNumber } from './validation';

export interface AuthResult {
  success: boolean;
  user?: User;
  admin?: Admin;
  token?: string;
  error?: string;
}

export const generateToken = (payload: any): string => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'default_secret', { expiresIn: '24h' });
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
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

export const registerUser = async (userData: {
  name: string;
  email: string;
  mobile: string;
  password: string;
  referralCode?: string;
}): Promise<AuthResult> => {
  try {
    // Validate inputs
    if (!userData.name || !userData.email || !userData.mobile || !userData.password) {
      return { success: false, error: 'All fields are required' };
    }

    // Validate mobile number
    if (!validateMobileNumber(userData.mobile)) {
      return { success: false, error: 'Invalid mobile number format' };
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email: userData.email }, { mobile: userData.mobile }] });
    if (existingUser) {
      return { success: false, error: 'User already exists with this email or mobile' };
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Create new user
    const newUser = new User({
      id: uuidv4(),
      name: userData.name,
      email: userData.email,
      mobile: userData.mobile,
      password: hashedPassword,
      balance: 100, // Starting balance
      referralCode: userData.referralCode || generateReferralCode(),
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

    // Generate JWT token
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: 'user'
    });

    return { success: true, user: newUser, token };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Registration failed' };
  }
};

export const loginUser = async (email: string, password: string): Promise<AuthResult> => {
  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return { success: false, error: 'User not found' };
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

    return { success: true, user, token };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Login failed' };
  }
};

export const loginAdmin = async (email: string, password: string): Promise<AuthResult> => {
  try {
    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
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
      email: admin.email,
      role: 'admin'
    });

    return { success: true, admin, token };
  } catch (error) {
    console.error('Admin login error:', error);
    return { success: false, error: 'Admin login failed' };
  }
};

export const generateReferralCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
```

### 2. Create Payment Processing System

```ts
// server/payment.ts
import { v4 as uuidv4 } from 'uuid';
import { Transaction, User } from './data';
import { validateUPI, validateBankDetails } from './validation';

export interface PaymentMethod {
  type: 'upi' | 'bank' | 'wallet' | 'card';
  details: any;
}

export interface PaymentRequest {
  userId: string;
  amount: number;
  method: PaymentMethod;
  type: 'deposit' | 'withdraw';
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  error?: string;
}

export const processPayment = async (request: PaymentRequest): Promise<PaymentResponse> => {
  try {
    // Validate amount
    if (request.amount <= 0) {
      return { success: false, status: 'failed', error: 'Invalid amount' };
    }

    // Validate user
    const user = await User.findById(request.userId);
    if (!user) {
      return { success: false, status: 'failed', error: 'User not found' };
    }

    // Create transaction record
    const transaction = new Transaction({
      id: uuidv4(),
      userId: request.userId,
      amount: request.amount,
      type: request.type,
      method: request.method.type,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Process based on payment type
    if (request.type === 'deposit') {
      // Process deposit based on method
      const result = await processDeposit(transaction, request.method);
      if (result.success) {
        transaction.status = 'success';
      } else {
        transaction.status = 'failed';
        transaction.error = result.error;
      }
    } else if (request.type === 'withdraw') {
      // Process withdrawal based on method
      const result = await processWithdraw(transaction, request.method);
      if (result.success) {
        transaction.status = 'success';
      } else {
        transaction.status = 'failed';
        transaction.error = result.error;
      }
    }

    await transaction.save();

    return {
      success: transaction.status === 'success',
      transactionId: transaction.id,
      status: transaction.status as 'pending' | 'processing' | 'success' | 'failed',
      error: transaction.error
    };
  } catch (error) {
    console.error('Payment processing error:', error);
    return { success: false, status: 'failed', error: 'Payment processing failed' };
  }
};

export const processDeposit = async (transaction: any, method: PaymentMethod): Promise<{ success: boolean; error?: string }> => {
  try {
    switch (method.type) {
      case 'upi':
        // Validate UPI details
        if (!validateUPI(method.details.upiId)) {
          return { success: false, error: 'Invalid UPI ID' };
        }
        
        // Simulate UPI payment processing
        // In a real implementation, this would integrate with a UPI payment gateway
        return { success: true };
        
      case 'bank':
        // Validate bank details
        if (!validateBankDetails(method.details)) {
          return { success: false, error: 'Invalid bank details' };
        }
        
        // Process bank transfer
        return { success: true };
        
      case 'wallet':
        // Process wallet payment
        return { success: true };
        
      case 'card':
        // Process card payment
        // In a real implementation, this would integrate with a card payment processor
        return { success: true };
        
      default:
        return { success: false, error: 'Unsupported payment method' };
    }
  } catch (error) {
    console.error('Deposit processing error:', error);
    return { success: false, error: 'Deposit processing failed' };
  }
};

export const processWithdraw = async (transaction: any, method: PaymentMethod): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check user balance
    const user = await User.findById(transaction.userId);
    if (!user || user.balance < transaction.amount) {
      return { success: false, error: 'Insufficient balance' };
    }

    switch (method.type) {
      case 'upi':
        // Validate UPI details
        if (!validateUPI(method.details.upiId)) {
          return { success: false, error: 'Invalid UPI ID' };
        }
        
        // Simulate UPI withdrawal
        // In a real implementation, this would integrate with a UPI withdrawal service
        // Deduct from user balance
        user.balance -= transaction.amount;
        await user.save();
        
        return { success: true };
        
      case 'bank':
        // Validate bank details
        if (!validateBankDetails(method.details)) {
          return { success: false, error: 'Invalid bank details' };
        }
        
        // Process bank withdrawal
        user.balance -= transaction.amount;
        await user.save();
        
        return { success: true };
        
      case 'wallet':
        // Process wallet withdrawal
        user.balance -= transaction.amount;
        await user.save();
        
        return { success: true };
        
      default:
        return { success: false, error: 'Unsupported withdrawal method' };
    }
  } catch (error) {
    console.error('Withdrawal processing error:', error);
    return { success: false, error: 'Withdrawal processing failed' };
  }
};

export const getTransactionHistory = async (userId: string, filters: {
  type?: 'deposit' | 'withdraw';
  status?: 'pending' | 'processing' | 'success' | 'failed';
  fromDate?: Date;
  toDate?: Date;
} = {}): Promise<any[]> => {
  try {
    const query: any = { userId };
    
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.fromDate || filters.toDate) {
      query.createdAt = {};
      if (filters.fromDate) query.createdAt.$gte = filters.fromDate;
      if (filters.toDate) query.createdAt.$lte = filters.toDate;
    }
    
    const transactions = await Transaction.find(query).sort({ createdAt: -1 });
    return transactions;
  } catch (error) {
    console.error('Transaction history error:', error);
    return [];
  }
};
```

### 3. Create Content Management System

```ts
// server/content-management.ts
import { SiteContent } from './data';

export interface ContentUpdate {
  whatsappNumber?: string;
  siteTitle?: string;
  siteSubtitle?: string;
  heroTitle?: string;
  heroDescription?: string;
  aboutContent?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  gameRules?: string;
  terms?: string;
  privacyPolicy?: string;
}

export interface ContentResponse {
  success: boolean;
  content?: any;
  error?: string;
}

export const updateSiteContent = async (updates: ContentUpdate, adminId: string): Promise<ContentResponse> => {
  try {
    // Find or create site content document
    let content = await SiteContent.findOne();
    if (!content) {
      content = new SiteContent();
    }

    // Update content fields
    if (updates.whatsappNumber) content.whatsappNumber = updates.whatsappNumber;
    if (updates.siteTitle) content.siteTitle = updates.siteTitle;
    if (updates.siteSubtitle) content.siteSubtitle = updates.siteSubtitle;
    if (updates.heroTitle) content.heroTitle = updates.heroTitle;
    if (updates.heroDescription) content.heroDescription = updates.heroDescription;
    if (updates.aboutContent) content.aboutContent = updates.aboutContent;
    if (updates.contactInfo) content.contactInfo = { ...content.contactInfo, ...updates.contactInfo };
    if (updates.gameRules) content.gameRules = updates.gameRules;
    if (updates.terms) content.terms = updates.terms;
    if (updates.privacyPolicy) content.privacyPolicy = updates.privacyPolicy;

    content.updatedBy = adminId;
    content.updatedAt = new Date();

    await content.save();

    return { success: true, content };
  } catch (error) {
    console.error('Content update error:', error);
    return { success: false, error: 'Content update failed' };
  }
};

export const getSiteContent = async (): Promise<ContentResponse> => {
  try {
    let content = await SiteContent.findOne();
    if (!content) {
      // Return default content if none exists
      content = new SiteContent();
      await content.save();
    }

    return { success: true, content };
  } catch (error) {
    console.error('Content retrieval error:', error);
    return { success: false, error: 'Content retrieval failed' };
  }
};

export const updateSystemSettings = async (settings: {
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  depositBonus?: number;
  referralCommission?: number;
  backupFrequency?: string; // 'daily', 'weekly', 'monthly'
  whatsappBusinessAPI?: string;
}, adminId: string): Promise<ContentResponse> => {
  try {
    let content = await SiteContent.findOne();
    if (!content) {
      content = new SiteContent();
    }

    if (settings.maintenanceMode !== undefined) content.maintenanceMode = settings.maintenanceMode;
    if (settings.maintenanceMessage) content.maintenanceMessage = settings.maintenanceMessage;
    if (settings.depositBonus !== undefined) content.depositBonus = settings.depositBonus;
    if (settings.referralCommission !== undefined) content.referralCommission = settings.referralCommission;
    if (settings.backupFrequency) content.backupFrequency = settings.backupFrequency;
    if (settings.whatsappBusinessAPI) content.whatsappBusinessAPI = settings.whatsappBusinessAPI;

    content.updatedBy = adminId;
    content.updatedAt = new Date();

    await content.save();

    return { success: true, content };
  } catch (error) {
    console.error('Settings update error:', error);
    return { success: false, error: 'Settings update failed' };
  }
};

export const getSystemSettings = async (): Promise<ContentResponse> => {
  try {
    const content = await SiteContent.findOne();
    
    if (!content) {
      return { success: true, content: {
        maintenanceMode: false,
        maintenanceMessage: '',
        depositBonus: 0,
        referralCommission: 0,
        backupFrequency: 'daily',
        whatsappBusinessAPI: '',
        whatsappNumber: '+91 8686886632'
      } };
    }

    return { success: true, content: {
      maintenanceMode: content.maintenanceMode || false,
      maintenanceMessage: content.maintenanceMessage || '',
      depositBonus: content.depositBonus || 0,
      referralCommission: content.referralCommission || 0,
      backupFrequency: content.backupFrequency || 'daily',
      whatsappBusinessAPI: content.whatsappBusinessAPI || '',
      whatsappNumber: content.whatsappNumber || '+91 8686886632'
    } };
  } catch (error) {
    console.error('Settings retrieval error:', error);
    return { success: false, error: 'Settings retrieval failed' };
  }
};
```

### 4. Create User Management System

```ts
// server/user-management.ts
import { User, GameHistory } from './data';
import { validateMobileNumber, validateEmail } from './validation';

export interface UserProfileUpdate {
  name?: string;
  email?: string;
  mobile?: string;
  profile?: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    dateOfBirth?: Date;
    gender?: string;
  };
}

export interface UserManagementResponse {
  success: boolean;
  user?: any;
  users?: any[];
  error?: string;
}

export const updateUserProfile = async (userId: string, updates: UserProfileUpdate): Promise<UserManagementResponse> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Validate email if provided
    if (updates.email && !validateEmail(updates.email)) {
      return { success: false, error: 'Invalid email format' };
    }

    // Validate mobile if provided
    if (updates.mobile && !validateMobileNumber(updates.mobile)) {
      return { success: false, error: 'Invalid mobile number format' };
    }

    // Update user profile fields
    if (updates.name) user.name = updates.name;
    if (updates.email) user.email = updates.email;
    if (updates.mobile) user.mobile = updates.mobile;
    if (updates.profile) user.profile = { ...user.profile, ...updates.profile };

    user.updatedAt = new Date();
    await user.save();

    return { success: true, user };
  } catch (error) {
    console.error('Profile update error:', error);
    return { success: false, error: 'Profile update failed' };
  }
};

export const getUserDetails = async (userId: string): Promise<UserManagementResponse> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, user };
  } catch (error) {
    console.error('User details error:', error);
    return { success: false, error: 'User details retrieval failed' };
  }
};

export const getUserGameHistory = async (userId: string, filters: {
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
} = {}): Promise<UserManagementResponse> => {
  try {
    const query: any = { userId };
    
    if (filters.fromDate || filters.toDate) {
      query.createdAt = {};
      if (filters.fromDate) query.createdAt.$gte = filters.fromDate;
      if (filters.toDate) query.createdAt.$lte = filters.toDate;
    }
    
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    
    const gameHistory = await GameHistory.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);
    
    return { success: true, users: gameHistory };
  } catch (error) {
    console.error('Game history error:', error);
    return { success: false, error: 'Game history retrieval failed' };
  }
};

export const getAllUsers = async (filters: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<UserManagementResponse> => {
  try {
    const query: any = {};
    
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { mobile: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);
    
    return { success: true, users };
  } catch (error) {
    console.error('Users retrieval error:', error);
    return { success: false, error: 'Users retrieval failed' };
  }
};

export const updateUserStatus = async (userId: string, status: 'active' | 'suspended' | 'banned', adminId: string, reason?: string): Promise<UserManagementResponse> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    user.status = status;
    user.updatedBy = adminId;
    if (reason) user.statusReason = reason;
    user.updatedAt = new Date();

    await user.save();

    return { success: true, user };
  } catch (error) {
    console.error('User status update error:', error);
    return { success: false, error: 'User status update failed' };
  }
};

export const updateUserBalance = async (userId: string, amount: number, adminId: string, reason: string): Promise<UserManagementResponse> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Update balance (can be positive for add or negative for subtract)
    user.balance = Math.max(0, user.balance + amount);
    user.updatedBy = adminId;
    user.updatedAt = new Date();

    await user.save();

    // Create a transaction record for the adjustment
    // This would be implemented in a real system

    return { success: true, user };
  } catch (error) {
    console.error('User balance update error:', error);
    return { success: false, error: 'User balance update failed' };
  }
};
```

### 5. Create Data Models

```ts
// server/data.ts (TypeScript definitions)
import mongoose from 'mongoose';

// User Schema
export interface User extends mongoose.Document {
  id: string;
  name: string;
  email: string;
  mobile: string;
  password: string;
  balance: number;
  referralCode: string;
  referredBy?: string;
  joinDate: Date;
  lastLogin: Date;
  status: 'active' | 'suspended' | 'banned';
  statusReason?: string;
  profile: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    dateOfBirth: Date | null;
    gender: string;
    profilePicture: string;
  };
  referredUsers: string[]; // IDs of users referred by this user
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string; // Admin ID if updated by admin
}

// Transaction Schema
export interface Transaction extends mongoose.Document {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'withdraw';
  method: 'upi' | 'bank' | 'wallet' | 'card';
  status: 'pending' | 'processing' | 'success' | 'failed';
  referenceId?: string; // Gateway reference ID
  paymentDetails: any; // Method-specific details
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}

// Game History Schema
export interface GameHistory extends mongoose.Document {
  id: string;
  userId: string;
  gameId: string;
  round: number;
  betAmount: number;
  betSide: 'andar' | 'bahar';
  result: 'win' | 'loss';
  payout: number;
  openingCard: any;
  winningCard: any;
  gameTimestamp: Date;
  createdAt: Date;
}

// Site Content Schema
export interface SiteContent extends mongoose.Document {
  whatsappNumber: string;
  siteTitle: string;
  siteSubtitle: string;
  heroTitle: string;
  heroDescription: string;
  aboutContent: string;
  contactInfo: {
    phone?: string;
    email?: string;
    address?: string;
  };
  gameRules: string;
  terms: string;
  privacyPolicy: string;
  
  // System settings
  maintenanceMode: boolean;
  maintenanceMessage: string;
  depositBonus: number; // Percentage
  referralCommission: number; // Percentage
  backupFrequency: string; // 'daily', 'weekly', 'monthly'
  whatsappBusinessAPI: string;
  
  updatedBy?: string; // Admin ID
  updatedAt: Date;
  createdAt: Date;
}

// Admin Schema
export interface Admin extends mongoose.Document {
  id: string;
  name: string;
  email: string;
  mobile: string;
  password: string;
  role: 'admin' | 'superadmin';
  permissions: string[];
  lastLogin: Date;
  status: 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}
```

### 6. Create Validation System

```ts
// server/validation.ts
import validator from 'validator';

export const validateMobileNumber = (mobile: string): boolean => {
  // Indian mobile number validation: should be 10 digits, starting with 6-9
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(mobile);
};

export const validateEmail = (email: string): boolean => {
  return validator.isEmail(email);
};

export const validateUPI = (upiId: string): boolean => {
  // Basic UPI validation: should contain @ and have valid format
  const upiRegex = /^[a-zA-Z0-9.-]+@[a-zA-Z0-9.-]+$/;
  return upiRegex.test(upiId);
};

export const validateBankDetails = (details: any): boolean => {
  // Validate bank details object
  if (!details.accountNumber || !details.ifscCode || !details.accountHolderName) {
    return false;
  }
  
  // Validate IFSC code format (4 letters, 7 alphanumeric characters)
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifscRegex.test(details.ifscCode.toUpperCase())) {
    return false;
  }
  
  // Validate account number (typically 9-18 digits)
  const accountRegex = /^\d{9,18}$/;
  if (!accountRegex.test(details.accountNumber)) {
    return false;
  }
  
  // Validate account holder name (should not be empty and contain only letters, spaces, dots)
  const nameRegex = /^[a-zA-Z\s.]+$/;
  if (!nameRegex.test(details.accountHolderName.trim())) {
    return false;
  }
  
  return true;
};

export const validatePassword = (password: string): boolean => {
  // Password should be at least 8 characters with at least one uppercase, lowercase, and number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const validateAmount = (amount: number): boolean => {
  // Amount should be positive and not exceed max limit
  return amount > 0 && amount <= 1000000; // Max 10 lakhs
};

export const validateUserData = (userData: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!userData.name || userData.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  
  if (!userData.email || !validateEmail(userData.email)) {
    errors.push('Valid email is required');
  }
  
  if (!userData.mobile || !validateMobileNumber(userData.mobile)) {
    errors.push('Valid 10-digit Indian mobile number is required');
  }
  
  if (!userData.password || !validatePassword(userData.password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase, and number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

### 7. Create Security Measures

```ts
// server/security.ts
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import cors from 'cors';

// Rate limiting configuration
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for authentication
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Helmet security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.telegram.org"], // Add any external APIs
    },
  },
  referrerPolicy: { policy: 'no-referrer' },
});

// Input sanitization middleware
export const sanitizeInput = mongoSanitize();

// XSS protection
export const xssProtection = xss();

// HPP (HTTP Parameter Pollution) protection
export const parameterPollutionProtection = hpp();

// CORS configuration
export const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200,
  exposedHeaders: ['X-Total-Count'] // If you need to expose custom headers
};

// JWT token security
export const jwtOptions = {
  secret: process.env.JWT_SECRET || 'default_secret',
  options: {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: process.env.JWT_ISSUER || 'AndarBaharApp',
    audience: process.env.JWT_AUDIENCE || 'users',
  }
};

// Password security
export const passwordSecurity = {
  saltRounds: 12,
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: false,
};

// Session security
export const sessionSecurity = {
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Only send cookie over HTTPS in production
    httpOnly: true, // Prevent XSS
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' as const, // CSRF protection
  },
  proxy: true, // Trust first proxy (for deployment behind reverse proxy)
  name: 'sessionId', // Custom session cookie name
  resave: false,
  saveUninitialized: false,
};
```

### 8. Update Server Routes with New Functionality

```ts
// In server/routes.ts, integrate all the new functionality
import express from 'express';
import { 
  registerUser, 
  loginUser, 
  loginAdmin,
  generateToken,
  verifyToken
} from './auth';
import { processPayment, getTransactionHistory } from './payment';
import { 
  updateSiteContent, 
  getSiteContent, 
  updateSystemSettings, 
  getSystemSettings 
} from './content-management';
import { 
  updateUserProfile, 
  getUserDetails, 
  getUserGameHistory, 
  getAllUsers, 
  updateUserStatus, 
  updateUserBalance 
} from './user-management';
import { 
  authLimiter, 
  generalLimiter, 
  securityHeaders, 
  sanitizeInput, 
  xssProtection,
  parameterPollutionProtection
} from './security';
import { validateUserData } from './validation';

const router = express.Router();

// Apply security middleware
router.use(securityHeaders);
router.use(sanitizeInput);
router.use(xssProtection);
router.use(parameterPollutionProtection);

// Authentication routes
router.post('/auth/register', authLimiter, async (req, res) => {
  try {
    const validation = validateUserData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      });
    }
    
    const result = await registerUser(req.body);
    if (result.success) {
      res.status(201).json({
        success: true,
        user: result.user,
        token: result.token
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

router.post('/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    const result = await loginUser(email, password);
    if (result.success) {
      res.json({
        success: true,
        user: result.user,
        token: result.token
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

// Admin routes
router.post('/auth/admin/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    const result = await loginAdmin(email, password);
    if (result.success) {
      res.json({
        success: true,
        admin: result.admin,
        token: result.token
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error
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

// Protected routes (require authentication)
router.use('/api/*', async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No token provided.'
    });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token.'
    });
  }
  
  // Attach user info to request
  req.user = decoded;
  next();
});

// Payment routes
router.post('/payment/process', generalLimiter, async (req, res) => {
  try {
    const { userId, amount, method, type } = req.body;
    
    if (!userId || !amount || !method || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment parameters'
      });
    }
    
    const result = await processPayment({ userId, amount, method, type });
    res.json(result);
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment processing failed'
    });
  }
});

router.get('/payment/history/:userId', generalLimiter, async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, status, fromDate, toDate } = req.query;
    
    // Verify user has permission to access this history
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const filters: any = {};
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (fromDate) filters.fromDate = new Date(fromDate as string);
    if (toDate) filters.toDate = new Date(toDate as string);
    
    const result = await getTransactionHistory(userId, filters);
    res.json(result);
  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({
      success: false,
      error: 'Transaction history retrieval failed'
    });
  }
});

// Content management routes (admin only)
router.put('/admin/content', generalLimiter, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  
  try {
    const result = await updateSiteContent(req.body, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Content update error:', error);
    res.status(500).json({
      success: false,
      error: 'Content update failed'
    });
  }
});

router.get('/content', generalLimiter, async (req, res) => {
  try {
    const result = await getSiteContent();
    res.json(result);
  } catch (error) {
    console.error('Content retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Content retrieval failed'
    });
  }
});

// User management routes (admin only)
router.get('/admin/users', generalLimiter, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  
  try {
    const { status, search, limit, offset } = req.query;
    const filters: any = {};
    
    if (status) filters.status = status;
    if (search) filters.search = search as string;
    if (limit) filters.limit = parseInt(limit as string);
    if (offset) filters.offset = parseInt(offset as string);
    
    const result = await getAllUsers(filters);
    res.json(result);
  } catch (error) {
    console.error('Users retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Users retrieval failed'
    });
  }
});

router.patch('/admin/users/:userId/status', generalLimiter, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;
    
    const result = await updateUserStatus(userId, status, req.user.id, reason);
    res.json(result);
  } catch (error) {
    console.error('User status update error:', error);
    res.status(500).json({
      success: false,
      error: 'User status update failed'
    });
  }
});

export default router;
```

## Verification Steps
1. Implement complete authentication system with registration and login
2. Create payment processing system with multiple payment methods
3. Build content management system for site settings and content
4. Develop user management system with comprehensive CRUD operations
5. Add proper data validation for all inputs
6. Implement security measures including rate limiting and input sanitization
7. Create proper data models for all entities
8. Update server routes with all new functionality
9. Test all API endpoints for proper functionality
10. Verify proper error handling and validation throughout