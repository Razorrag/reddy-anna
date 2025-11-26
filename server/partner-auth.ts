// 🤝 PARTNER AUTHENTICATION SYSTEM
// Completely separate from player authentication
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { supabaseServer } from './lib/supabaseServer';
import { Partner, PartnerStatus } from '@shared/schema';

// =====================================================
// TYPES
// =====================================================

export interface PartnerAuthResult {
  success: boolean;
  partner?: Partial<Partner>;
  token?: string;
  refreshToken?: string;
  error?: string;
  errors?: string[];
}

export interface PartnerTokenPayload {
  id: string;
  phone: string;
  role: 'partner';
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

// Extend Express Request for partner auth
declare global {
  namespace Express {
    interface Request {
      partner?: {
        id: string;
        phone: string;
        full_name: string;
        status: PartnerStatus;
      };
    }
  }
}

// =====================================================
// PASSWORD UTILITIES
// =====================================================

export const hashPartnerPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const validatePartnerPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

// =====================================================
// TOKEN GENERATION (Separate from player tokens)
// =====================================================

export const generatePartnerAccessToken = (partner: { id: string; phone: string }): string => {
  const secret = process.env.JWT_SECRET as string;
  const expiresIn = '2h';
  
  return jwt.sign(
    {
      id: partner.id,
      phone: partner.phone,
      role: 'partner',
      type: 'access'
    } as PartnerTokenPayload,
    secret,
    { expiresIn }
  );
};

export const generatePartnerRefreshToken = (partner: { id: string; phone: string }): string => {
  const secret = process.env.JWT_SECRET as string;
  const expiresIn = '7d';
  
  return jwt.sign(
    {
      id: partner.id,
      phone: partner.phone,
      role: 'partner',
      type: 'refresh'
    } as PartnerTokenPayload,
    secret,
    { expiresIn }
  );
};

export const generatePartnerTokens = (partner: { id: string; phone: string }) => {
  return {
    accessToken: generatePartnerAccessToken(partner),
    refreshToken: generatePartnerRefreshToken(partner)
  };
};

export const verifyPartnerToken = (token: string): PartnerTokenPayload => {
  const secret = process.env.JWT_SECRET as string;
  try {
    const decoded = jwt.verify(token, secret) as PartnerTokenPayload;
    
    // Ensure this is a partner token
    if (decoded.role !== 'partner') {
      throw new Error('Invalid token type. Expected partner token.');
    }
    
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Partner token has expired. Please login again.');
    }
    throw new Error('Invalid partner token');
  }
};

// =====================================================
// PARTNER REGISTRATION
// =====================================================

export const registerPartner = async (data: {
  name: string;
  phone: string;
  password: string;
  confirmPassword: string;
  email?: string;
  whatsappNumber?: string;
}): Promise<PartnerAuthResult> => {
  try {
    // Validate inputs
    if (!data.name || data.name.trim().length < 2) {
      return { success: false, error: 'Name must be at least 2 characters' };
    }
    
    if (!data.phone || data.phone.length < 8) {
      return { success: false, error: 'Please enter a valid phone number' };
    }
    
    if (data.password !== data.confirmPassword) {
      return { success: false, error: 'Passwords do not match' };
    }
    
    // Password validation: 8+ chars with uppercase, lowercase, and number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(data.password)) {
      return { success: false, error: 'Password must be at least 8 characters with uppercase, lowercase, and number' };
    }
    
    // Normalize phone number
    const normalizedPhone = data.phone.replace(/\D/g, '');
    
    // Check if partner already exists
    const { data: existingPartner } = await supabaseServer
      .from('partners')
      .select('id')
      .eq('phone', normalizedPhone)
      .single();
    
    if (existingPartner) {
      return { success: false, error: 'A partner account already exists with this phone number' };
    }
    
    // Check if this phone is registered as a player (prevent dual accounts)
    const { data: existingUser } = await supabaseServer
      .from('users')
      .select('id')
      .eq('phone', normalizedPhone)
      .single();
    
    if (existingUser) {
      return { success: false, error: 'This phone number is already registered as a player. Partners must use a different phone number.' };
    }
    
    // Hash password
    const hashedPassword = await hashPartnerPassword(data.password);
    
    // Get default settings
    const { data: settings } = await supabaseServer
      .from('admin_partner_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['require_admin_approval', 'default_share_percentage']);
    
    const settingsMap = new Map(settings?.map(s => [s.setting_key, s.setting_value]) || []);
    const requireApproval = settingsMap.get('require_admin_approval') !== 'false';
    const defaultSharePercentage = parseFloat(settingsMap.get('default_share_percentage') || '50');
    
    // Create partner - build insert data conditionally
    const insertData: any = {
      phone: normalizedPhone,
      password_hash: hashedPassword,
      full_name: data.name.trim(),
      status: requireApproval ? 'pending' : 'active',
      share_percentage: defaultSharePercentage,
    };
    
    // Only add optional fields if they exist in the table
    if (data.email?.trim()) {
      insertData.email = data.email.trim();
    }
    
    if (data.whatsappNumber?.replace(/\D/g, '')) {
      insertData.whatsapp_number = data.whatsappNumber.replace(/\D/g, '');
    }
    
    const { data: newPartner, error: createError } = await supabaseServer
      .from('partners')
      .insert(insertData)
      .select()
      .single();
    
    if (createError || !newPartner) {
      console.error('Partner creation error:', createError);
      return { success: false, error: 'Failed to create partner account' };
    }
    
    // If approval required, don't generate tokens yet
    if (requireApproval) {
      return {
        success: true,
        partner: {
          id: newPartner.id,
          phone: newPartner.phone,
          full_name: newPartner.full_name,
          status: 'pending' as PartnerStatus,
        },
        error: 'Your partner account has been created and is pending admin approval. You will be notified once approved.'
      };
    }
    
    // Generate tokens for auto-approved partners
    const tokens = generatePartnerTokens({ id: newPartner.id, phone: newPartner.phone });
    
    return {
      success: true,
      partner: {
        id: newPartner.id,
        phone: newPartner.phone,
        full_name: newPartner.full_name,
        status: 'active' as PartnerStatus,
      },
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  } catch (error: any) {
    console.error('Partner registration error:', error);
    return { success: false, error: error.message || 'Registration failed' };
  }
};

// =====================================================
// PARTNER LOGIN
// =====================================================

export const loginPartner = async (data: {
  phone: string;
  password: string;
}): Promise<PartnerAuthResult> => {
  try {
    // Normalize phone number
    const normalizedPhone = data.phone.replace(/\D/g, '');
    
    // Find partner
    const { data: partner, error: findError } = await supabaseServer
      .from('partners')
      .select('*')
      .eq('phone', normalizedPhone)
      .single();
    
    if (findError || !partner) {
      return { success: false, error: 'Invalid phone number or password' };
    }
    
    // Verify password
    const isValidPassword = await validatePartnerPassword(data.password, partner.password_hash);
    if (!isValidPassword) {
      return { success: false, error: 'Invalid phone number or password' };
    }
    
    // Check partner status
    if (partner.status === 'pending') {
      return { success: false, error: 'Your partner account is pending admin approval. Please wait for approval.' };
    }
    
    if (partner.status === 'suspended') {
      return { success: false, error: 'Your partner account has been suspended. Please contact admin.' };
    }
    
    if (partner.status === 'banned') {
      return { success: false, error: 'Your partner account has been banned. Access denied.' };
    }
    
    // Update last login
    await supabaseServer
      .from('partners')
      .update({ last_login: new Date().toISOString() })
      .eq('id', partner.id);
    
    // Generate tokens
    const tokens = generatePartnerTokens({ id: partner.id, phone: partner.phone });
    
    return {
      success: true,
      partner: {
        id: partner.id,
        phone: partner.phone,
        full_name: partner.full_name,
        status: partner.status as PartnerStatus,
      },
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  } catch (error: any) {
    console.error('Partner login error:', error);
    return { success: false, error: error.message || 'Login failed' };
  }
};

// =====================================================
// MIDDLEWARE: Require Partner Authentication
// =====================================================

export const requirePartnerAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Partner authentication required'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = verifyPartnerToken(token);
    
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type'
      });
    }
    
    // Get partner from database
    const { data: partner, error } = await supabaseServer
      .from('partners')
      .select('id, phone, full_name, status')
      .eq('id', decoded.id)
      .single();
    
    if (error || !partner) {
      return res.status(401).json({
        success: false,
        error: 'Partner not found'
      });
    }
    
    // Check if partner is active
    if (partner.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: `Partner account is ${partner.status}. Access denied.`
      });
    }
    
    // Attach partner to request
    req.partner = {
      id: partner.id,
      phone: partner.phone,
      full_name: partner.full_name,
      status: partner.status as PartnerStatus,
    };
    
    next();
  } catch (error: any) {
    console.error('Partner auth middleware error:', error);
    return res.status(401).json({
      success: false,
      error: error.message || 'Authentication failed'
    });
  }
};

// =====================================================
// REFRESH TOKEN
// =====================================================

export const refreshPartnerToken = async (refreshToken: string): Promise<PartnerAuthResult> => {
  try {
    const decoded = verifyPartnerToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      return { success: false, error: 'Invalid refresh token' };
    }
    
    // Get partner
    const { data: partner, error } = await supabaseServer
      .from('partners')
      .select('id, phone, status')
      .eq('id', decoded.id)
      .single();
    
    if (error || !partner) {
      return { success: false, error: 'Partner not found' };
    }
    
    if (partner.status !== 'active') {
      return { success: false, error: 'Partner account is not active' };
    }
    
    // Generate new tokens
    const tokens = generatePartnerTokens({ id: partner.id, phone: partner.phone });
    
    return {
      success: true,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Token refresh failed' };
  }
};

// =====================================================
// GET PARTNER PROFILE
// =====================================================

export const getPartnerProfile = async (partnerId: string) => {
  const { data: partner, error} = await supabaseServer
    .from('partners')
    .select('id, phone, full_name, email, whatsapp_number, status, created_at, last_login')
    .eq('id', partnerId)
    .single();
  
  if (error || !partner) {
    return null;
  }
  
  return partner;
};
