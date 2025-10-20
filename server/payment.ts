// Payment Processing System
import { v4 as uuidv4 } from 'uuid';
import { Transaction, User } from './data';
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
        // Add amount to user balance
        user.balance += request.amount;
        await user.save();
      } else {
        transaction.status = 'failed';
        transaction.error = result.error;
      }
    } else if (request.type === 'withdraw') {
      // Process withdrawal based on method
      const result = await processWithdraw(transaction, request.method, user);
      if (result.success) {
        transaction.status = 'success';
        // Deduct amount from user balance
        user.balance -= request.amount;
        await user.save();
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
      error: transaction.error,
      message: transaction.status === 'success' 
        ? `${request.type === 'deposit' ? 'Deposit' : 'Withdrawal'} processed successfully`
        : undefined
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
        console.log(`Processing UPI deposit of ${transaction.amount} to ${method.details.upiId}`);
        return { success: true };
        
      case 'bank':
        // Validate bank details
        if (!validateBankDetails(method.details)) {
          return { success: false, error: 'Invalid bank details' };
        }
        
        // Process bank transfer
        console.log(`Processing bank deposit of ${transaction.amount} to account ${method.details.accountNumber}`);
        return { success: true };
        
      case 'wallet':
        // Process wallet payment
        if (!method.details.walletType || !method.details.walletNumber) {
          return { success: false, error: 'Invalid wallet details' };
        }
        console.log(`Processing wallet deposit of ${transaction.amount} to ${method.details.walletType}`);
        return { success: true };
        
      case 'card':
        // Process card payment
        if (!method.details.cardNumber || !method.details.expiryDate || !method.details.cvv) {
          return { success: false, error: 'Invalid card details' };
        }
        // In a real implementation, this would integrate with a card payment processor
        console.log(`Processing card deposit of ${transaction.amount}`);
        return { success: true };
        
      default:
        return { success: false, error: 'Unsupported payment method' };
    }
  } catch (error) {
    console.error('Deposit processing error:', error);
    return { success: false, error: 'Deposit processing failed' };
  }
};

export const processWithdraw = async (transaction: any, method: PaymentMethod, user: any): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check user balance
    if (user.balance < transaction.amount) {
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
        console.log(`Processing UPI withdrawal of ${transaction.amount} to ${method.details.upiId}`);
        return { success: true };
        
      case 'bank':
        // Validate bank details
        if (!validateBankDetails(method.details)) {
          return { success: false, error: 'Invalid bank details' };
        }
        
        // Process bank withdrawal
        console.log(`Processing bank withdrawal of ${transaction.amount} to account ${method.details.accountNumber}`);
        return { success: true };
        
      case 'wallet':
        // Process wallet withdrawal
        if (!method.details.walletType || !method.details.walletNumber) {
          return { success: false, error: 'Invalid wallet details' };
        }
        console.log(`Processing wallet withdrawal of ${transaction.amount} to ${method.details.walletType}`);
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
  try {
    const query: any = { userId };
    
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.fromDate || filters.toDate) {
      query.createdAt = {};
      if (filters.fromDate) query.createdAt.$gte = filters.fromDate;
      if (filters.toDate) query.createdAt.$lte = filters.toDate;
    }
    
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);
    
    return transactions;
  } catch (error) {
    console.error('Transaction history error:', error);
    return [];
  }
};

export const getTransactionById = async (transactionId: string): Promise<any> => {
  try {
    const transaction = await Transaction.findById(transactionId);
    return transaction;
  } catch (error) {
    console.error('Transaction retrieval error:', error);
    return null;
  }
};

export const updateTransactionStatus = async (
  transactionId: string, 
  status: 'pending' | 'processing' | 'success' | 'failed',
  error?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return { success: false, error: 'Transaction not found' };
    }

    transaction.status = status;
    transaction.updatedAt = new Date();
    if (error) transaction.error = error;

    await transaction.save();

    // If transaction failed and was a deposit, refund the amount
    if (status === 'failed' && transaction.type === 'deposit') {
      const user = await User.findById(transaction.userId);
      if (user) {
        user.balance = Math.max(0, user.balance - transaction.amount);
        await user.save();
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Transaction status update error:', error);
    return { success: false, error: 'Failed to update transaction status' };
  }
};

export const getUserBalance = async (userId: string): Promise<{ success: boolean; balance?: number; error?: string }> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, balance: user.balance };
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

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Add bonus to user balance
    user.balance += bonusAmount;
    await user.save();

    // Create a transaction record for the bonus
    const bonusTransaction = new Transaction({
      id: uuidv4(),
      userId: userId,
      amount: bonusAmount,
      type: 'deposit',
      method: 'bonus',
      status: 'success',
      createdAt: new Date(),
      updatedAt: new Date(),
      referenceId: `BONUS_${Date.now()}`,
      paymentDetails: { reason }
    });

    await bonusTransaction.save();

    console.log(`Bonus of ${bonusAmount} added to user ${userId} for: ${reason}`);
    return { success: true };
  } catch (error) {
    console.error('Bonus addition error:', error);
    return { success: false, error: 'Failed to add bonus' };
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
