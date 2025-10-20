// Content Management System
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
    // Find or create site content document
    let content = await SiteContent.findOne();
    if (!content) {
      content = new SiteContent();
    }

    // Update content fields
    if (updates.whatsappNumber !== undefined) content.whatsappNumber = updates.whatsappNumber;
    if (updates.siteTitle !== undefined) content.siteTitle = updates.siteTitle;
    if (updates.siteSubtitle !== undefined) content.siteSubtitle = updates.siteSubtitle;
    if (updates.heroTitle !== undefined) content.heroTitle = updates.heroTitle;
    if (updates.heroDescription !== undefined) content.heroDescription = updates.heroDescription;
    if (updates.aboutContent !== undefined) content.aboutContent = updates.aboutContent;
    if (updates.contactInfo) {
      content.contactInfo = { ...content.contactInfo, ...updates.contactInfo };
    }
    if (updates.gameRules !== undefined) content.gameRules = updates.gameRules;
    if (updates.terms !== undefined) content.terms = updates.terms;
    if (updates.privacyPolicy !== undefined) content.privacyPolicy = updates.privacyPolicy;

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
      content = new SiteContent({
        whatsappNumber: '+91 8686886632',
        siteTitle: 'Reddy Anna - Andar Bahar Game',
        siteSubtitle: 'Play and Win Real Money',
        heroTitle: 'Welcome to Reddy Anna',
        heroDescription: 'Experience the thrill of Andar Bahar with real money games',
        aboutContent: 'Reddy Anna is a premier online gaming platform offering exciting Andar Bahar games with real money rewards.',
        contactInfo: {
          phone: '+91 8686886632',
          email: 'support@reddyanna.com',
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
      });
      await content.save();
    }

    return { success: true, content };
  } catch (error) {
    console.error('Content retrieval error:', error);
    return { success: false, error: 'Content retrieval failed' };
  }
};

export const updateSystemSettings = async (settings: SystemSettings, adminId: string): Promise<ContentResponse> => {
  try {
    let content = await SiteContent.findOne();
    if (!content) {
      content = new SiteContent();
    }

    // Update system settings
    if (settings.maintenanceMode !== undefined) content.maintenanceMode = settings.maintenanceMode;
    if (settings.maintenanceMessage !== undefined) content.maintenanceMessage = settings.maintenanceMessage;
    if (settings.depositBonus !== undefined) content.depositBonus = settings.depositBonus;
    if (settings.referralCommission !== undefined) content.referralCommission = settings.referralCommission;
    if (settings.backupFrequency !== undefined) content.backupFrequency = settings.backupFrequency;
    if (settings.whatsappBusinessAPI !== undefined) content.whatsappBusinessAPI = settings.whatsappBusinessAPI;
    if (settings.minDepositAmount !== undefined) content.minDepositAmount = settings.minDepositAmount;
    if (settings.maxDepositAmount !== undefined) content.maxDepositAmount = settings.maxDepositAmount;
    if (settings.minWithdrawAmount !== undefined) content.minWithdrawAmount = settings.minWithdrawAmount;
    if (settings.maxWithdrawAmount !== undefined) content.maxWithdrawAmount = settings.maxWithdrawAmount;
    if (settings.autoWithdrawal !== undefined) content.autoWithdrawal = settings.autoWithdrawal;
    if (settings.kycRequired !== undefined) content.kycRequired = settings.kycRequired;
    if (settings.customerSupportEmail !== undefined) content.customerSupportEmail = settings.customerSupportEmail;
    if (settings.customerSupportPhone !== undefined) content.customerSupportPhone = settings.customerSupportPhone;

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
        depositBonus: 10,
        referralCommission: 5,
        backupFrequency: 'daily',
        whatsappBusinessAPI: '',
        whatsappNumber: '+91 8686886632',
        minDepositAmount: 100,
        maxDepositAmount: 100000,
        minWithdrawAmount: 500,
        maxWithdrawAmount: 50000,
        autoWithdrawal: false,
        kycRequired: true,
        customerSupportEmail: 'support@reddyanna.com',
        customerSupportPhone: '+91 8686886632'
      } };
    }

    return { success: true, content: {
      maintenanceMode: content.maintenanceMode || false,
      maintenanceMessage: content.maintenanceMessage || '',
      depositBonus: content.depositBonus || 10,
      referralCommission: content.referralCommission || 5,
      backupFrequency: content.backupFrequency || 'daily',
      whatsappBusinessAPI: content.whatsappBusinessAPI || '',
      whatsappNumber: content.whatsappNumber || '+91 8686886632',
      minDepositAmount: content.minDepositAmount || 100,
      maxDepositAmount: content.maxDepositAmount || 100000,
      minWithdrawAmount: content.minWithdrawAmount || 500,
      maxWithdrawAmount: content.maxWithdrawAmount || 50000,
      autoWithdrawal: content.autoWithdrawal || false,
      kycRequired: content.kycRequired !== undefined ? content.kycRequired : true,
      customerSupportEmail: content.customerSupportEmail || 'support@reddyanna.com',
      customerSupportPhone: content.customerSupportPhone || '+91 8686886632'
    } };
  } catch (error) {
    console.error('Settings retrieval error:', error);
    return { success: false, error: 'Settings retrieval failed' };
  }
};

export const toggleMaintenanceMode = async (enabled: boolean, message?: string, adminId?: string): Promise<ContentResponse> => {
  try {
    let content = await SiteContent.findOne();
    if (!content) {
      content = new SiteContent();
    }

    content.maintenanceMode = enabled;
    if (message) {
      content.maintenanceMessage = message;
    }
    if (adminId) {
      content.updatedBy = adminId;
    }
    content.updatedAt = new Date();

    await content.save();

    return { success: true, content: {
      maintenanceMode: content.maintenanceMode,
      maintenanceMessage: content.maintenanceMessage
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
    let content = await SiteContent.findOne();
    if (!content) {
      content = new SiteContent();
    }

    // Validate bonus percentages
    if (depositBonus < 0 || depositBonus > 100) {
      return { success: false, error: 'Deposit bonus must be between 0 and 100' };
    }
    if (referralCommission < 0 || referralCommission > 100) {
      return { success: false, error: 'Referral commission must be between 0 and 100' };
    }

    content.depositBonus = depositBonus;
    content.referralCommission = referralCommission;
    content.updatedBy = adminId;
    content.updatedAt = new Date();

    await content.save();

    return { success: true, content: {
      depositBonus: content.depositBonus,
      referralCommission: content.referralCommission
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
    let content = await SiteContent.findOne();
    if (!content) {
      content = new SiteContent();
    }

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

    // Update limits
    if (limits.minDeposit !== undefined) content.minDepositAmount = limits.minDeposit;
    if (limits.maxDeposit !== undefined) content.maxDepositAmount = limits.maxDeposit;
    if (limits.minWithdraw !== undefined) content.minWithdrawAmount = limits.minWithdraw;
    if (limits.maxWithdraw !== undefined) content.maxWithdrawAmount = limits.maxWithdraw;

    content.updatedBy = adminId;
    content.updatedAt = new Date();

    await content.save();

    return { success: true, content: {
      minDepositAmount: content.minDepositAmount,
      maxDepositAmount: content.maxDepositAmount,
      minWithdrawAmount: content.minWithdrawAmount,
      maxWithdrawAmount: content.maxWithdrawAmount
    } };
  } catch (error) {
    console.error('Payment limits update error:', error);
    return { success: false, error: 'Failed to update payment limits' };
  }
};

export const getContentHistory = async (limit: number = 50): Promise<ContentResponse> => {
  try {
    // In a real implementation, this would query a content history collection
    // For now, return current content with update history
    const content = await SiteContent.findOne();
    if (!content) {
      return { success: false, error: 'No content found' };
    }

    // Mock history data
    const history = [
      {
        id: content.id,
        updatedAt: content.updatedAt,
        updatedBy: content.updatedBy,
        changes: 'Content updated'
      }
    ];

    return { success: true, content: history };
  } catch (error) {
    console.error('Content history retrieval error:', error);
    return { success: false, error: 'Failed to retrieve content history' };
  }
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
