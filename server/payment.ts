// Payment Processing System
import { v4 as uuidv4 } from 'uuid';
import { IStorage, storage } from './storage-supabase';
import { validateUPI, validateBankDetails, validateAmount } from './validation';

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
  message?: string;
}

export const processPayment = async (request: PaymentRequest): Promise<PaymentResponse> => {
  try {
    // Validate amount
    if (!validateAmount(request.amount)) {
      return { success: false, status: 'failed', error: 'Invalid amount' };
    }

    // Validate user
    const user = await storage.getUser(request.userId);
    if (!user) {
      return { success: false, status: 'failed', error: 'User not found' };
    }

    // Process based on payment type
    let status = 'pending';
    let error: string | undefined;
    
    if (request.type === 'deposit') {
      // Process deposit based on method
      const result = await processDeposit(request);
      if (result.success) {
        status = 'success';
        // Add amount to user balance
        await storage.updateUserBalance(request.userId, request.amount);
      } else {
        status = 'failed';
        error = result.error;
      }
    } else if (request.type === 'withdraw') {
      // Process withdrawal based on method - this will use atomic operations to check balance and deduct
      const result = await processWithdraw(request, user);
      if (result.success) {
        // Use atomic operation to deduct amount from user balance - this checks balance and deducts in one operation
        try {
          await storage.updateUserBalance(request.userId, -request.amount);
        } catch (balanceError: any) {
          if (balanceError.message?.includes('Insufficient balance')) {
            return { success: false, status: 'failed', error: 'Insufficient balance' };
          }
          throw balanceError;
        }
        status = 'success';
      } else {
        status = 'failed';
        error = result.error;
      }
    }

    return {
      success: status === 'success',
      transactionId: uuidv4(), // Return a transaction ID
      status: status as 'pending' | 'processing' | 'success' | 'failed',
      error: error,
      message: status === 'success' 
        ? `${request.type === 'deposit' ? 'Deposit' : 'Withdrawal'} processed successfully`
        : undefined
    };
  } catch (error) {
    console.error('Payment processing error:', error);
    return { success: false, status: 'failed', error: 'Payment processing failed' };
  }
};

export const processDeposit = async (request: PaymentRequest): Promise<{ success: boolean; error?: string }> => {
  try {
    const method = request.method;
    const amount = request.amount;
    const userId = request.userId;
    
    switch (method.type) {
      case 'upi':
        // Validate UPI details
        if (!validateUPI(method.details.upiId)) {
          return { success: false, error: 'Invalid UPI ID' };
        }
        
        // Simulate UPI payment processing
        // In a real implementation, this would integrate with a UPI payment gateway
        console.log(`Processing UPI deposit of ${amount} to ${method.details.upiId}`);
        
        // Apply deposit bonus
        await applyDepositBonus(userId, amount);
        
        // Store original deposit amount for conditional bonus check
        await storage.updateUserOriginalDeposit(userId, amount);
        
        // Check if user was referred and apply referral bonus
        await storage.checkAndApplyReferralBonus(userId, amount);
        
        return { success: true };
        
      case 'bank':
        // Validate bank details
        if (!validateBankDetails(method.details)) {
          return { success: false, error: 'Invalid bank details' };
        }
        
        // Process bank transfer
        console.log(`Processing bank deposit of ${amount} to account ${method.details.accountNumber}`);
        
        // Apply deposit bonus
        await applyDepositBonus(userId, amount);
        
        // Store original deposit amount for conditional bonus check
        await storage.updateUserOriginalDeposit(userId, amount);
        
        // Check if user was referred and apply referral bonus
        await storage.checkAndApplyReferralBonus(userId, amount);
        
        return { success: true };
        
      case 'wallet':
        // Process wallet payment
        if (!method.details.walletType || !method.details.walletNumber) {
          return { success: false, error: 'Invalid wallet details' };
        }
        console.log(`Processing wallet deposit of ${amount} to ${method.details.walletType}`);
        
        // Apply deposit bonus
        await applyDepositBonus(userId, amount);
        
        // Store original deposit amount for conditional bonus check
        await storage.updateUserOriginalDeposit(userId, amount);
        
        // Check if user was referred and apply referral bonus
        await storage.checkAndApplyReferralBonus(userId, amount);
        
        return { success: true };
        
      case 'card':
        // Process card payment
        if (!method.details.cardNumber || !method.details.expiryDate || !method.details.cvv) {
          return { success: false, error: 'Invalid card details' };
        }
        // In a real implementation, this would integrate with a card payment processor
        console.log(`Processing card deposit of ${amount}`);
        
        // Apply deposit bonus
        await applyDepositBonus(userId, amount);
        
        // Store original deposit amount for conditional bonus check
        await storage.updateUserOriginalDeposit(userId, amount);
        
        // Check if user was referred and apply referral bonus
        await storage.checkAndApplyReferralBonus(userId, amount);
        
        return { success: true };
        
      default:
        return { success: false, error: 'Unsupported payment method' };
    }
  } catch (error) {
    console.error('Deposit processing error:', error);
    return { success: false, error: 'Deposit processing failed' };
  }
};

export const processWithdraw = async (request: PaymentRequest, user: any): Promise<{ success: boolean; error?: string }> => {
  try {
    const method = request.method;
    const amount = request.amount;

    switch (method.type) {
      case 'upi':
        // Validate UPI details
        if (!validateUPI(method.details.upiId)) {
          return { success: false, error: 'Invalid UPI ID' };
        }
        
        // Simulate UPI withdrawal
        // In a real implementation, this would integrate with a UPI withdrawal service
        console.log(`Processing UPI withdrawal of ${amount} to ${method.details.upiId}`);
        return { success: true };
        
      case 'bank':
        // Validate bank details
        if (!validateBankDetails(method.details)) {
          return { success: false, error: 'Invalid bank details' };
        }
        
        // Process bank withdrawal
        console.log(`Processing bank withdrawal of ${amount} to account ${method.details.accountNumber}`);
        return { success: true };
        
      case 'wallet':
        // Process wallet withdrawal
        if (!method.details.walletType || !method.details.walletNumber) {
          return { success: false, error: 'Invalid wallet details' };
        }
        console.log(`Processing wallet withdrawal of ${amount} to ${method.details.walletType}`);
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
  limit?: number;
  offset?: number;
} = {}): Promise<any[]> => {
  // For now, transaction history is not stored in our simplified Supabase schema
  // Return an empty array since we don't have transaction tracking in this version
  console.warn('Transaction history not implemented in current Supabase schema');
  return [];
};

export const getTransactionById = async (transactionId: string): Promise<any> => {
  // For now, transaction history is not stored in our simplified Supabase schema
  console.warn('Transaction retrieval not implemented in current Supabase schema');
  return null;
};

export const updateTransactionStatus = async (
  transactionId: string, 
  status: 'pending' | 'processing' | 'success' | 'failed',
  error?: string
): Promise<{ success: boolean; error?: string }> => {
  // For now, transaction history is not stored in our simplified Supabase schema
  console.warn('Transaction status updates not implemented in current Supabase schema');
  return { success: false, error: 'Transaction status updates not supported' };
};

export const getUserBalance = async (userId: string): Promise<{ success: boolean; balance?: number; error?: string }> => {
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, balance: parseFloat(user.balance) };
  } catch (error) {
    console.error('Balance retrieval error:', error);
    return { success: false, error: 'Failed to retrieve balance' };
  }
};

export const addBonus = async (userId: string, bonusAmount: number, reason: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!validateAmount(bonusAmount) || bonusAmount <= 0) {
      return { success: false, error: 'Invalid bonus amount' };
    }

    // Add bonus to user balance using storage
    await storage.updateUserBalance(userId, bonusAmount);

    console.log(`Bonus of ${bonusAmount} added to user ${userId} for: ${reason}`);
    return { success: true };
  } catch (error) {
    console.error('Bonus addition error:', error);
    return { success: false, error: 'Failed to add bonus' };
  }
};

// New bonus-related functions
export const applyDepositBonus = async (userId: string, depositAmount: number): Promise<boolean> => {
  try {
    // Get deposit bonus percentage from settings
    const depositBonusPercent = await storage.getGameSetting('default_deposit_bonus_percent') || '5';
    const bonusPercentage = parseFloat(depositBonusPercent);
    
    // Calculate bonus amount
    const bonusAmount = (depositAmount * bonusPercentage) / 100;
    
    if (bonusAmount <= 0) {
      return false;
    }
    
    // Add bonus to user's bonus field (not main balance yet)
    await storage.addUserBonus(userId, bonusAmount, 'deposit_bonus', depositAmount);
    
    // Add to user transactions
    const user = await storage.getUser(userId);
    if (user) {
      await storage.addTransaction({
        userId,
        transactionType: 'bonus',
        amount: bonusAmount,
        balanceBefore: parseFloat(user.balance),
        balanceAfter: parseFloat(user.balance), // Bonus not added to main balance yet
        referenceId: `bonus_deposit_${Date.now()}`,
        description: `Deposit bonus (${bonusPercentage}% of ₹${depositAmount})`
      });
    }
    
    console.log(`Deposit bonus of ₹${bonusAmount} added for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error applying deposit bonus:', error);
    return false;
  }
};

export const applyReferralBonus = async (referrerId: string, depositAmount: number): Promise<boolean> => {
  try {
    // Get referral bonus percentage from settings
    const referralBonusPercent = await storage.getGameSetting('referral_bonus_percent') || '1';
    const bonusPercentage = parseFloat(referralBonusPercent);
    
    // Calculate bonus amount
    const bonusAmount = (depositAmount * bonusPercentage) / 100;
    
    if (bonusAmount <= 0) {
      return false;
    }
    
    // Add referral bonus to referrer's bonus field
    await storage.addUserBonus(referrerId, bonusAmount, 'referral_bonus', depositAmount);
    
    // Add to user transactions
    const referrer = await storage.getUser(referrerId);
    if (referrer) {
      await storage.addTransaction({
        userId: referrerId,
        transactionType: 'bonus',
        amount: bonusAmount,
        balanceBefore: parseFloat(referrer.balance),
        balanceAfter: parseFloat(referrer.balance), // Bonus not added to main balance yet
        referenceId: `referral_bonus_${Date.now()}`,
        description: `Referral bonus for user deposit of ₹${depositAmount}`
      });
    }
    
    console.log(`Referral bonus of ₹${bonusAmount} added for referrer ${referrerId}`);
    return true;
  } catch (error) {
    console.error('Error applying referral bonus:', error);
    return false;
  }
};

export const checkConditionalBonus = async (userId: string): Promise<boolean> => {
  try {
    return await storage.applyConditionalBonus(userId);
  } catch (error) {
    console.error('Error checking conditional bonus:', error);
    return false;
  }
};

export const applyAvailableBonus = async (userId: string): Promise<boolean> => {
  try {
    // This function will move available bonus to main balance
    const bonusInfo = await storage.getUserBonusInfo(userId);
    
    if (bonusInfo.totalBonus > 0) {
      const user = await storage.getUser(userId);
      if (!user) {
        return false;
      }
      
      const balanceBefore = parseFloat(user.balance);
      const newBalance = balanceBefore + bonusInfo.totalBonus;
      
      // Add to main balance
      await storage.updateUserBalance(userId, bonusInfo.totalBonus);
      
      // Reset bonus amounts
      await storage.resetUserBonus(userId);
      
      // Log the application
      await storage.addTransaction({
        userId,
        transactionType: 'bonus_applied',
        amount: bonusInfo.totalBonus,
        balanceBefore,
        balanceAfter: newBalance,
        referenceId: `bonus_applied_${Date.now()}`,
        description: `Bonus applied to main balance (₹${bonusInfo.depositBonus} deposit + ₹${bonusInfo.referralBonus} referral)`
      });
      
      console.log(`Bonus of ₹${bonusInfo.totalBonus} applied to main balance for user ${userId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error applying available bonus:', error);
    return false;
  }
};

export const getPaymentMethods = (): PaymentMethod[] => {
  return [
    {
      type: 'upi',
      details: {
        upiId: '',
        supportedApps: ['Paytm', 'PhonePe', 'Google Pay', 'Amazon Pay']
      }
    },
    {
      type: 'bank',
      details: {
        accountNumber: '',
        ifscCode: '',
        accountHolderName: '',
        bankName: ''
      }
    },
    {
      type: 'wallet',
      details: {
        walletType: '',
        walletNumber: '',
        supportedWallets: ['Paytm Wallet', 'PhonePe Wallet', 'Amazon Pay Balance']
      }
    },
    {
      type: 'card',
      details: {
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardHolderName: ''
      }
    }
  ];
};

export const validatePaymentRequest = (request: PaymentRequest): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!request.userId) {
    errors.push('User ID is required');
  }

  if (!validateAmount(request.amount)) {
    errors.push('Invalid amount');
  }

  if (!request.method || !request.method.type) {
    errors.push('Payment method is required');
  }

  if (!request.type || !['deposit', 'withdraw'].includes(request.type)) {
    errors.push('Invalid transaction type');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
