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
      // ✅ FIX: Process deposit based on method
      const result = await processDeposit(request);
      if (result.success) {
        status = 'success';
        // ✅ FIX: Use atomic operation for deposit
        await storage.addBalanceAtomic(request.userId, request.amount);
        
        // ✅ FIX: Apply deposit bonus automatically (only once - removed from processDeposit)
        try {
          await applyDepositBonus(request.userId, request.amount);
          console.log(`✅ Deposit bonus applied for user ${request.userId} on deposit of ₹${request.amount}`);
        } catch (bonusError) {
          console.error('⚠️ Failed to apply deposit bonus:', bonusError);
          // Don't fail the deposit if bonus fails
        }
      } else {
        status = 'failed';
        error = result.error;
      }
    } else if (request.type === 'withdraw') {
      // ✅ FIX: Process withdrawal using atomic operation
      const result = await processWithdraw(request, user);
      if (result.success) {
        // ✅ FIX: Use atomic operation to deduct amount - checks balance and deducts atomically
        try {
          await storage.deductBalanceAtomic(request.userId, request.amount);
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
        
        // ✅ FIX: Removed duplicate bonus application - bonus is applied in processPayment()
        
        // Store original deposit amount for conditional bonus check
        await storage.updateUserOriginalDeposit(userId, amount);
        
        // ✅ FIX: Referral bonus is now applied when admin APPROVES deposit, not when user submits
        // Removed checkAndApplyReferralBonus call from here - it's called in approvePaymentRequestAtomic()
        
        return { success: true };
        
      case 'bank':
        // Validate bank details
        if (!validateBankDetails(method.details)) {
          return { success: false, error: 'Invalid bank details' };
        }
        
        // Process bank transfer
        console.log(`Processing bank deposit of ${amount} to account ${method.details.accountNumber}`);
        
        // Store original deposit amount for conditional bonus check
        await storage.updateUserOriginalDeposit(userId, amount);
        
        // ✅ FIX: Referral bonus is now applied when admin APPROVES deposit, not when user submits
        // Removed checkAndApplyReferralBonus call from here - it's called in approvePaymentRequestAtomic()
        
        return { success: true };
        
      case 'wallet':
        // Process wallet payment
        if (!method.details.walletType || !method.details.walletNumber) {
          return { success: false, error: 'Invalid wallet details' };
        }
        console.log(`Processing wallet deposit of ${amount} to ${method.details.walletType}`);
        
        // ✅ FIX: Removed duplicate bonus application - bonus is applied in processPayment()
        
        // Store original deposit amount for conditional bonus check
        await storage.updateUserOriginalDeposit(userId, amount);
        
        // ✅ FIX: Referral bonus is now applied when admin APPROVES deposit, not when user submits
        // Removed checkAndApplyReferralBonus call from here - it's called in approvePaymentRequestAtomic()
        
        return { success: true };
        
      case 'card':
        // Process card payment
        if (!method.details.cardNumber || !method.details.expiryDate || !method.details.cvv) {
          return { success: false, error: 'Invalid card details' };
        }
        // In a real implementation, this would integrate with a card payment processor
        console.log(`Processing card deposit of ${amount}`);
        
        // ✅ FIX: Removed duplicate bonus application - bonus is applied in processPayment()
        
        // Store original deposit amount for conditional bonus check
        await storage.updateUserOriginalDeposit(userId, amount);
        
        // ✅ FIX: Referral bonus is now applied when admin APPROVES deposit, not when user submits
        // Removed checkAndApplyReferralBonus call from here - it's called in approvePaymentRequestAtomic()
        
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
    console.log('applyDepositBonus legacy path called; ignored because new per-deposit bonus system handles bonuses on admin approval.', {
      userId,
      depositAmount
    });
    // All deposit bonuses are now created in approvePaymentRequestAtomic and
    // credited automatically via threshold-based logic in storage-supabase.ts
    return false;
  } catch (error) {
    console.error('Error in legacy applyDepositBonus (no-op):', error);
    return false;
  }
};

export const applyReferralBonus = async (referrerId: string, depositAmount: number): Promise<boolean> => {
  try {
    console.log('applyReferralBonus legacy path called; ignored because referral bonuses are now created from credited deposit bonuses.', {
      referrerId,
      depositAmount
    });
    // Referral bonuses are now created in handleReferralForBonus in storage-supabase.ts
    return false;
  } catch (error) {
    console.error('Error in legacy applyReferralBonus (no-op):', error);
    return false;
  }
};

export const checkConditionalBonus = async (userId: string): Promise<boolean> => {
  try {
    console.log('checkConditionalBonus legacy path called; no-op under new bonus system.', { userId });
    return false;
  } catch (error) {
    console.error('Error in legacy checkConditionalBonus (no-op):', error);
    return false;
  }
};

// Check if bonus has reached threshold and auto-credit it
export const checkAndAutoCreditBonus = async (userId: string): Promise<boolean> => {
  try {
    console.log('checkAndAutoCreditBonus legacy path called; auto-credit is now handled by checkBonusThresholds on balance changes.', { userId });
    return false;
  } catch (error) {
    console.error('Error in legacy checkAndAutoCreditBonus (no-op):', error);
    return false;
  }
};

// Auto-credit bonus to main balance (legacy helper now unused)
const autoCreditBonus = async (userId: string, bonusInfo: { depositBonus: number; referralBonus: number; totalBonus: number }): Promise<boolean> => {
  try {
    console.log('autoCreditBonus legacy helper called; ignored under new bonus system.', {
      userId,
      bonusInfo
    });
    return false;
  } catch (error) {
    console.error('Error in legacy autoCreditBonus (no-op):', error);
    return false;
  }
};

export const applyAvailableBonus = async (userId: string): Promise<boolean> => {
  try {
    console.log('applyAvailableBonus legacy manual-claim path called; bonuses are now auto-credited and cannot be manually claimed.', { userId });
    // Manual claiming is disabled; any UI calling this should be updated to rely on
    // automatic crediting via the new bonus engine.
    return false;
  } catch (error) {
    console.error('Error in legacy applyAvailableBonus (no-op):', error);
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
