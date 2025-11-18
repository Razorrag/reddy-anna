// Validation System for Backend
import validator from 'validator';

// Normalize phone number to digits-only format for storage
export const normalizePhone = (phone: string): string => {
  return phone.replace(/[^0-9]/g, ''); // Strip everything except digits
};

export const validateMobileNumber = (mobile: string): boolean => {
  // E.164 international format: 8-15 digits, cannot start with 0, optional +
  // Supports: India (+91), Bangladesh (+880), Malaysia (+60), UAE (+971), etc.
  const mobileRegex = /^\+?[1-9]\d{7,14}$/;
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
  
  if (!userData.phone || !validateMobileNumber(userData.phone)) {
    errors.push('Valid phone number required (8-15 digits, international format supported)');
  }
  
  if (!userData.password || !validatePassword(userData.password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase, and number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// New validation function for user registration with phone and password confirmation
export const validateUserRegistrationData = (userData: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!userData.name || userData.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  
  if (!userData.phone || !validateMobileNumber(userData.phone)) {
    errors.push('Valid phone number required (8-15 digits, international format supported)');
  }
  
  if (!userData.password || !validatePassword(userData.password)) {
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

// New validation function for user login with phone
export const validateLoginData = (loginData: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!loginData.phone || !validateMobileNumber(loginData.phone)) {
    errors.push('Valid phone number required (8-15 digits, international format supported)');
  }
  
  if (!loginData.password) {
    errors.push('Password is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// New validation function for admin login with username
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

export const validateTransactionData = (transactionData: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!transactionData.userId || typeof transactionData.userId !== 'string') {
    errors.push('Valid user ID is required');
  }
  
  if (!transactionData.amount || !validateAmount(transactionData.amount)) {
    errors.push('Valid amount is required (between 1 and 1,000,000)');
  }
  
  if (!transactionData.type || !['deposit', 'withdraw'].includes(transactionData.type)) {
    errors.push('Transaction type must be either deposit or withdraw');
  }
  
  if (!transactionData.method || !['upi', 'bank', 'wallet', 'card'].includes(transactionData.method)) {
    errors.push('Payment method must be upi, bank, wallet, or card');
  }
  
  // Validate payment details based on method
  if (transactionData.method === 'upi' && !validateUPI(transactionData.paymentDetails?.upiId)) {
    errors.push('Valid UPI ID is required for UPI payments');
  }
  
  if (transactionData.method === 'bank' && !validateBankDetails(transactionData.paymentDetails)) {
    errors.push('Valid bank details are required for bank transfers');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateGameBetData = (betData: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!betData.userId || typeof betData.userId !== 'string') {
    errors.push('Valid user ID is required');
  }
  
  if (!betData.amount || !validateAmount(betData.amount)) {
    errors.push('Valid bet amount is required (between 1 and 1,000,000)');
  }
  
  if (!betData.side || !['andar', 'bahar'].includes(betData.side)) {
    errors.push('Bet side must be either andar or bahar');
  }
  
  if (!betData.gameId || typeof betData.gameId !== 'string') {
    errors.push('Valid game ID is required');
  }
  
  if (!betData.round || typeof betData.round !== 'number' || betData.round < 1) {
    errors.push('Valid round number is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateContentUpdate = (contentData: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validate whatsapp number if provided (international format supported)
  if (contentData.whatsappNumber) {
    const normalized = normalizePhone(contentData.whatsappNumber);
    if (!validateMobileNumber(normalized)) {
      errors.push('Valid WhatsApp number required (8-15 digits, international format supported)');
    }
  }
  
  // Validate email if provided in contact info
  if (contentData.contactInfo?.email && !validateEmail(contentData.contactInfo.email)) {
    errors.push('Valid contact email is required');
  }
  
  // Validate deposit bonus if provided
  if (contentData.depositBonus !== undefined && (contentData.depositBonus < 0 || contentData.depositBonus > 100)) {
    errors.push('Deposit bonus must be between 0 and 100 percent');
  }
  
  // Validate referral commission if provided
  if (contentData.referralCommission !== undefined && (contentData.referralCommission < 0 || contentData.referralCommission > 100)) {
    errors.push('Referral commission must be between 0 and 100 percent');
  }
  
  // Validate backup frequency if provided
  if (contentData.backupFrequency && !['daily', 'weekly', 'monthly'].includes(contentData.backupFrequency)) {
    errors.push('Backup frequency must be daily, weekly, or monthly');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateUserProfileUpdate = (profileData: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validate name if provided
  if (profileData.name && profileData.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  
  // Validate email if provided
  if (profileData.email && !validateEmail(profileData.email)) {
    errors.push('Valid email is required');
  }
  
  // Validate mobile if provided
  if (profileData.mobile && !validateMobileNumber(profileData.mobile)) {
    errors.push('Valid phone number required (8-15 digits, international format supported)');
  }
  
  // Validate pincode if provided
  if (profileData.profile?.pincode && !/^\d{6}$/.test(profileData.profile.pincode)) {
    errors.push('Pincode must be 6 digits');
  }
  
  // Validate date of birth if provided
  if (profileData.profile?.dateOfBirth) {
    const dob = new Date(profileData.profile.dateOfBirth);
    const today = new Date();
    const age = Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    
    if (isNaN(dob.getTime())) {
      errors.push('Invalid date of birth format');
    } else if (age < 18) {
      errors.push('You must be at least 18 years old');
    } else if (age > 100) {
      errors.push('Invalid date of birth');
    }
  }
  
  // Validate gender if provided
  if (profileData.profile?.gender && !['male', 'female', 'other'].includes(profileData.profile.gender.toLowerCase())) {
    errors.push('Gender must be male, female, or other');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return validator.escape(input.trim());
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      if (input.hasOwnProperty(key)) {
        sanitized[key] = sanitizeInput(input[key]);
      }
    }
    return sanitized;
  }
  
  return input;
};

export const validateId = (id: string): boolean => {
  // Validate MongoDB ObjectId or UUID format
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  
  return objectIdRegex.test(id) || uuidRegex.test(id);
};

export const validatePaginationParams = (params: any): { isValid: boolean; errors: string[]; sanitized: any } => {
  const errors: string[] = [];
  const sanitized: any = {};
  
  // Validate limit
  if (params.limit !== undefined) {
    const limit = parseInt(params.limit);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push('Limit must be between 1 and 100');
    } else {
      sanitized.limit = limit;
    }
  } else {
    sanitized.limit = 20; // Default limit
  }
  
  // Validate offset
  if (params.offset !== undefined) {
    const offset = parseInt(params.offset);
    if (isNaN(offset) || offset < 0) {
      errors.push('Offset must be a non-negative number');
    } else {
      sanitized.offset = offset;
    }
  } else {
    sanitized.offset = 0; // Default offset
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
};

export const validateDateRange = (fromDate?: string, toDate?: string): { isValid: boolean; errors: string[]; sanitized?: { fromDate?: Date; toDate?: Date } } => {
  const errors: string[] = [];
  const sanitized: any = {};
  
  if (fromDate) {
    const from = new Date(fromDate);
    if (isNaN(from.getTime())) {
      errors.push('Invalid from date format');
    } else {
      sanitized.fromDate = from;
    }
  }
  
  if (toDate) {
    const to = new Date(toDate);
    if (isNaN(to.getTime())) {
      errors.push('Invalid to date format');
    } else {
      sanitized.toDate = to;
    }
  }
  
  // Check if date range is valid
  if (sanitized.fromDate && sanitized.toDate && sanitized.fromDate > sanitized.toDate) {
    errors.push('From date cannot be after to date');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: Object.keys(sanitized).length > 0 ? sanitized : undefined
  };
};
