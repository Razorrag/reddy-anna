// Content Management System
import { storage } from './storage-supabase';

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

export interface SystemSettings {
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  depositBonus?: number;
  referralCommission?: number;
  backupFrequency?: string; // 'daily', 'weekly', 'monthly'
  whatsappBusinessAPI?: string;
  minDepositAmount?: number;
  maxDepositAmount?: number;
  minWithdrawAmount?: number;
  maxWithdrawAmount?: number;
  autoWithdrawal?: boolean;
  kycRequired?: boolean;
  customerSupportEmail?: string;
  customerSupportPhone?: string;
}

export interface ContentResponse {
  success: boolean;
  content?: any;
  error?: string;
}

export const updateSiteContent = async (updates: ContentUpdate, adminId: string): Promise<ContentResponse> => {
  try {
    // For our simplified Supabase schema, we'll use the game_settings table
    // This is a simplified approach since we don't have a dedicated site content table
    
    // Update individual settings
    if (updates.whatsappNumber !== undefined) {
      await storage.updateGameSetting('whatsapp_number', updates.whatsappNumber);
    }
    if (updates.siteTitle !== undefined) {
      await storage.updateGameSetting('site_title', updates.siteTitle);
    }
    if (updates.siteSubtitle !== undefined) {
      await storage.updateGameSetting('site_subtitle', updates.siteSubtitle);
    }
    if (updates.contactInfo?.email !== undefined) {
      await storage.updateGameSetting('contact_email', updates.contactInfo.email);
    }

    // Return success
    return { success: true, content: updates };
  } catch (error) {
    console.error('Content update error:', error);
    return { success: false, error: 'Content update failed' };
  }
};

export const getSiteContent = async (): Promise<ContentResponse> => {
  try {
    // For our simplified Supabase schema, get settings from game_settings table
    const whatsappNumber = await storage.getGameSetting('whatsapp_number') || '+91 8686886632';
    const siteTitle = await storage.getGameSetting('site_title') || 'Reddy Anna - Andar Bahar Game';
    const siteSubtitle = await storage.getGameSetting('site_subtitle') || 'Play and Win Real Money';
    const contactEmail = await storage.getGameSetting('contact_email') || 'support@reddyanna.com';
    
    const content = {
      whatsappNumber,
      siteTitle,
      siteSubtitle,
      heroTitle: 'Welcome to Reddy Anna',
      heroDescription: 'Experience the thrill of Andar Bahar with real money games',
      aboutContent: 'Reddy Anna is a premier online gaming platform offering exciting Andar Bahar games with real money rewards.',
      contactInfo: {
        phone: whatsappNumber,
        email: contactEmail,
        address: 'Mumbai, India'
      },
      gameRules: 'Standard Andar Bahar rules apply. Minimum age 18+. Play responsibly.',
      terms: 'By using this platform, you agree to our terms and conditions.',
      privacyPolicy: 'We are committed to protecting your privacy and personal information.',
      maintenanceMode: false,
      maintenanceMessage: '',
      depositBonus: 10,
      referralCommission: 5,
      backupFrequency: 'daily',
      whatsappBusinessAPI: ''
    };

    return { success: true, content };
  } catch (error) {
    console.error('Content retrieval error:', error);
    return { success: false, error: 'Content retrieval failed' };
  }
};

export const updateSystemSettings = async (settings: SystemSettings, adminId: string): Promise<ContentResponse> => {
  try {
    // Update system settings in game_settings table
    if (settings.maintenanceMode !== undefined) {
      await storage.updateGameSetting('maintenance_mode', settings.maintenanceMode.toString());
    }
    if (settings.maintenanceMessage !== undefined) {
      await storage.updateGameSetting('maintenance_message', settings.maintenanceMessage);
    }
    if (settings.depositBonus !== undefined) {
      await storage.updateGameSetting('deposit_bonus', settings.depositBonus.toString());
    }
    if (settings.referralCommission !== undefined) {
      await storage.updateGameSetting('referral_commission', settings.referralCommission.toString());
    }
    if (settings.minDepositAmount !== undefined) {
      await storage.updateGameSetting('min_deposit_amount', settings.minDepositAmount.toString());
    }
    if (settings.maxDepositAmount !== undefined) {
      await storage.updateGameSetting('max_deposit_amount', settings.maxDepositAmount.toString());
    }
    if (settings.minWithdrawAmount !== undefined) {
      await storage.updateGameSetting('min_withdraw_amount', settings.minWithdrawAmount.toString());
    }
    if (settings.maxWithdrawAmount !== undefined) {
      await storage.updateGameSetting('max_withdraw_amount', settings.maxWithdrawAmount.toString());
    }

    return { success: true, content: settings };
  } catch (error) {
    console.error('Settings update error:', error);
    return { success: false, error: 'Settings update failed' };
  }
};

export const getSystemSettings = async (): Promise<ContentResponse> => {
  try {
    // Get system settings from the game_settings table
    const maintenanceMode = await storage.getGameSetting('maintenance_mode');
    const maintenanceMessage = await storage.getGameSetting('maintenance_message');
    const depositBonus = await storage.getGameSetting('deposit_bonus');
    const referralCommission = await storage.getGameSetting('referral_commission');
    const minDepositAmount = await storage.getGameSetting('min_deposit_amount');
    const maxDepositAmount = await storage.getGameSetting('max_deposit_amount');
    const minWithdrawAmount = await storage.getGameSetting('min_withdraw_amount');
    const maxWithdrawAmount = await storage.getGameSetting('max_withdraw_amount');
    
    return { success: true, content: {
      maintenanceMode: maintenanceMode === 'true',
      maintenanceMessage: maintenanceMessage || '',
      depositBonus: parseInt(depositBonus || '10', 10),
      referralCommission: parseInt(referralCommission || '5', 10),
      backupFrequency: 'daily',
      whatsappBusinessAPI: '',
      whatsappNumber: '+91 8686886632',
      minDepositAmount: parseInt(minDepositAmount || '100', 10),
      maxDepositAmount: parseInt(maxDepositAmount || '100000', 10),
      minWithdrawAmount: parseInt(minWithdrawAmount || '500', 10),
      maxWithdrawAmount: parseInt(maxWithdrawAmount || '50000', 10),
      autoWithdrawal: false,
      kycRequired: true,
      customerSupportEmail: 'support@reddyanna.com',
      customerSupportPhone: '+91 8686886632'
    } };
  } catch (error) {
    console.error('Settings retrieval error:', error);
    return { success: false, error: 'Settings retrieval failed' };
  }
};

export const toggleMaintenanceMode = async (enabled: boolean, message?: string, adminId?: string): Promise<ContentResponse> => {
  try {
    await storage.updateGameSetting('maintenance_mode', enabled.toString());
    if (message) {
      await storage.updateGameSetting('maintenance_message', message);
    }

    return { success: true, content: {
      maintenanceMode: enabled,
      maintenanceMessage: message || ''
    } };
  } catch (error) {
    console.error('Maintenance mode toggle error:', error);
    return { success: false, error: 'Failed to toggle maintenance mode' };
  }
};

export const updateBonusSettings = async (
  depositBonus: number,
  referralCommission: number,
  adminId: string
): Promise<ContentResponse> => {
  try {
    // Validate bonus percentages
    if (depositBonus < 0 || depositBonus > 100) {
      return { success: false, error: 'Deposit bonus must be between 0 and 100' };
    }
    if (referralCommission < 0 || referralCommission > 100) {
      return { success: false, error: 'Referral commission must be between 0 and 100' };
    }

    await storage.updateGameSetting('deposit_bonus', depositBonus.toString());
    await storage.updateGameSetting('referral_commission', referralCommission.toString());

    return { success: true, content: {
      depositBonus,
      referralCommission
    } };
  } catch (error) {
    console.error('Bonus settings update error:', error);
    return { success: false, error: 'Failed to update bonus settings' };
  }
};

export const updatePaymentLimits = async (
  limits: {
    minDeposit?: number;
    maxDeposit?: number;
    minWithdraw?: number;
    maxWithdraw?: number;
  },
  adminId: string
): Promise<ContentResponse> => {
  try {
    // Validate limits
    if (limits.minDeposit && limits.minDeposit <= 0) {
      return { success: false, error: 'Minimum deposit must be greater than 0' };
    }
    if (limits.maxDeposit && limits.maxDeposit <= 0) {
      return { success: false, error: 'Maximum deposit must be greater than 0' };
    }
    if (limits.minWithdraw && limits.minWithdraw <= 0) {
      return { success: false, error: 'Minimum withdrawal must be greater than 0' };
    }
    if (limits.maxWithdraw && limits.maxWithdraw <= 0) {
      return { success: false, error: 'Maximum withdrawal must be greater than 0' };
    }

    // Check logical consistency
    if (limits.minDeposit && limits.maxDeposit && limits.minDeposit >= limits.maxDeposit) {
      return { success: false, error: 'Minimum deposit must be less than maximum deposit' };
    }
    if (limits.minWithdraw && limits.maxWithdraw && limits.minWithdraw >= limits.maxWithdraw) {
      return { success: false, error: 'Minimum withdrawal must be less than maximum withdrawal' };
    }

    // Update limits in game settings
    if (limits.minDeposit !== undefined) {
      await storage.updateGameSetting('min_deposit_amount', limits.minDeposit.toString());
    }
    if (limits.maxDeposit !== undefined) {
      await storage.updateGameSetting('max_deposit_amount', limits.maxDeposit.toString());
    }
    if (limits.minWithdraw !== undefined) {
      await storage.updateGameSetting('min_withdraw_amount', limits.minWithdraw.toString());
    }
    if (limits.maxWithdraw !== undefined) {
      await storage.updateGameSetting('max_withdraw_amount', limits.maxWithdraw.toString());
    }

    return { success: true, content: {
      minDepositAmount: limits.minDeposit,
      maxDepositAmount: limits.maxDeposit,
      minWithdrawAmount: limits.minWithdraw,
      maxWithdrawAmount: limits.maxWithdraw
    } };
  } catch (error) {
    console.error('Payment limits update error:', error);
    return { success: false, error: 'Failed to update payment limits' };
  }
};

export const getContentHistory = async (limit: number = 50): Promise<ContentResponse> => {
  // For now, history tracking is not implemented in our simplified Supabase schema
  return { success: true, content: [] };
};

export const validateContentUpdate = (updates: ContentUpdate): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (updates.whatsappNumber !== undefined) {
    // Basic phone validation
    const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(updates.whatsappNumber)) {
      errors.push('Invalid WhatsApp number format');
    }
  }

  if (updates.siteTitle !== undefined && updates.siteTitle.length < 3) {
    errors.push('Site title must be at least 3 characters');
  }

  if (updates.siteSubtitle !== undefined && updates.siteSubtitle.length < 5) {
    errors.push('Site subtitle must be at least 5 characters');
  }

  if (updates.contactInfo?.email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(updates.contactInfo.email)) {
      errors.push('Invalid contact email format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateSystemSettings = (settings: SystemSettings): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (settings.depositBonus !== undefined && (settings.depositBonus < 0 || settings.depositBonus > 100)) {
    errors.push('Deposit bonus must be between 0 and 100');
  }

  if (settings.referralCommission !== undefined && (settings.referralCommission < 0 || settings.referralCommission > 100)) {
    errors.push('Referral commission must be between 0 and 100');
  }

  if (settings.minDepositAmount !== undefined && settings.minDepositAmount <= 0) {
    errors.push('Minimum deposit amount must be greater than 0');
  }

  if (settings.maxDepositAmount !== undefined && settings.maxDepositAmount <= 0) {
    errors.push('Maximum deposit amount must be greater than 0');
  }

  if (settings.minWithdrawAmount !== undefined && settings.minWithdrawAmount <= 0) {
    errors.push('Minimum withdrawal amount must be greater than 0');
  }

  if (settings.maxWithdrawAmount !== undefined && settings.maxWithdrawAmount <= 0) {
    errors.push('Maximum withdrawal amount must be greater than 0');
  }

  if (settings.backupFrequency !== undefined && !['daily', 'weekly', 'monthly'].includes(settings.backupFrequency)) {
    errors.push('Backup frequency must be daily, weekly, or monthly');
  }

  if (settings.customerSupportEmail !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(settings.customerSupportEmail)) {
      errors.push('Invalid customer support email format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
