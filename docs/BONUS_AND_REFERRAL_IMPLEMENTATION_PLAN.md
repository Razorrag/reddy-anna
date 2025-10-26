# BONUS AND REFERRAL IMPLEMENTATION PLAN

## Overview
This document details the implementation plan for adding deposit bonuses and referral bonuses to the Andar Bahar game system. The implementation will add a 5% bonus on deposits and referral bonuses that are automatically applied when a user's balance drops below 30% of their original deposit.

## Current System Analysis

### Wallet/Deposit/Withdrawal System
- Current system uses WhatsApp for deposit/withdrawal requests to admin
- User deposits are processed manually by admin via admin panel
- The `processPayment` function handles deposits and withdrawals
- Balance updates happen through `storage.updateUserBalance()`

### Database Schema
- `users` table: stores user data including balance field
- `user_transactions` table: tracks deposit, withdrawal, bet, win, loss, bonus transactions
- `game_settings` table: stores configurable settings like deposit bonus percentage

### Referral System
- Existing referral code system: users have `referralCode` field
- Referral commission is configurable via `referral_commission` setting
- Currently, referral relationships are not stored in the database
- Profile page shows referral code and statistics (current placeholders)

### Game Logic
- Game rounds: Round 1, Round 2, Round 3 (Continuous Draw)
- Balance updates happen in real-time during game play
- Winners get payout based on game rules (1:1 for Andar, 1:0 for Round 1 Bahar, etc.)

## Implementation Requirements

### 1. Deposit Bonus Logic
- When a user makes a deposit, automatically add 5% bonus to their balance
- Store bonus as separate field or in user_transactions table
- Admin should be able to configure bonus percentage via admin panel
- The bonus should be applied to each individual deposit (not overall balance)

### 2. Referral Bonus Logic
- When a referred user makes their first deposit, both referrer and referee get bonus
- Referrer: configurable percentage of the new user's deposit (default 1%)
- Store referral relationships in database
- Track when referral bonuses are applied

### 3. Conditional Bonus (Auto-apply when balance drops)
- If a user's balance goes below 70% or above 130% of original deposit, automatically apply bonus
- This applies to both deposit bonus and referral bonus
- Bonus is added to user's main balance when condition is met

## Implementation Plan

### Phase 1: Update Database Schema
1. **Add columns to `users` table**:
   - `deposit_bonus_available` (DECIMAL): Track unclaimed deposit bonuses
   - `referral_bonus_available` (DECIMAL): Track unclaimed referral bonuses
   - `original_deposit_amount` (DECIMAL): Track original deposit for conditional bonus logic

2. **Add referral tracking table**:
   ```sql
   CREATE TABLE user_referrals (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     referrer_user_id VARCHAR(20) NOT NULL,
     referred_user_id VARCHAR(20) NOT NULL,
     deposit_amount DECIMAL(15,2),
     bonus_applied BOOLEAN DEFAULT false,
     bonus_amount DECIMAL(15,2),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     bonus_applied_at TIMESTAMP WITH TIME ZONE
   );
   ```

3. **Add bonus-related game settings**:
   - `default_deposit_bonus_percent` (default 5)
   - `referral_bonus_percent` (default 1)
   - `conditional_bonus_threshold` (default 30 - meaning 70/130%)

### Phase 2: Update Backend Services

#### A. Payment Service Updates (`server/payment.ts`)
1. **Modify `processDeposit` function**:
   - Calculate deposit bonus based on current settings
   - Add bonus to user's bonus field instead of main balance immediately
   - Create transaction record with type 'bonus'

2. **Add bonus management functions**:
   - `applyDepositBonus(userId, depositAmount)`: Calculate and apply deposit bonus
   - `applyReferralBonus(referrerId, depositAmount)`: Apply referral bonus to referrer
   - `checkConditionalBonus(userId)`: Check if user qualifies for conditional bonus
   - `claimUserBonus(userId)`: Apply bonus to main balance

#### B. User Management Updates (`server/user-management.ts`)
1. **Update `createUserManually`**:
   - Track referral if referral code is provided
   - Apply referral bonus to referrer when new user deposits

2. **Add referral tracking**:
   - `trackUserReferral(referralCode, newUserId, depositAmount)`: Track referral relationship
   - `getUserReferrals(userId)`: Get list of users referred by user

#### C. Authentication Updates (`server/auth.ts`)
1. **Update `registerUser`**:
   - Store referral code if provided during registration
   - Track referral relationship in new table

#### D. Game Settings Updates (`server/content-management.ts`)
1. **Update bonus settings**:
   - Add `default_deposit_bonus_percent`
   - Add `referral_bonus_percent`
   - Add `conditional_bonus_threshold`

### Phase 3: Update WebSocket Game Logic (`server/routes.ts`)
1. **Add bonus status to game sync**:
   - Include available bonus amounts in game state
   - Check for conditional bonus after game results

2. **Update game result processing**:
   - Check if user's balance meets conditional bonus criteria
   - Apply bonus if criteria met

### Phase 4: Update Frontend Components

#### A. Wallet Modal (`client/src/components/WalletModal.tsx`)
1. **Display bonus information**:
   - Show available deposit bonus amount
   - Show available referral bonus amount
   - Show total bonus available

#### B. Profile Page (`client/src/pages/profile.tsx`)
1. **Enhance referral tab**:
   - Show actual referral statistics
   - Show list of referred users
   - Show referral bonus earnings

2. **Update overview tab**:
   - Show bonus amounts separately from main balance
   - Show total bonus earned

#### C. User Profile Context (`client/src/contexts/UserProfileContext.tsx`)
1. **Add bonus data**:
   - Fetch and store bonus information
   - Update bonus-related API calls

### Phase 5: Admin Panel Integration

#### A. Admin Dashboard Updates
1. **Add bonus management**:
   - View all bonuses applied
   - Manually apply bonuses if needed
   - Configure bonus percentages

#### B. Referral Management
1. **Add referral tracking**:
   - View all referral relationships
   - Track referral bonus distribution
   - Manage referral bonus settings

## Technical Implementation Details

### Backend Implementation

#### New functions to add to `server/payment.ts`:

```typescript
export const applyDepositBonus = async (userId: string, depositAmount: number): Promise<boolean> => {
  try {
    // Get deposit bonus percentage from settings
    const depositBonusPercent = await storage.getGameSetting('default_deposit_bonus_percent') || '5';
    const bonusPercentage = parseFloat(depositBonusPercent);
    
    // Calculate bonus amount
    const bonusAmount = (depositAmount * bonusPercentage) / 100;
    
    // Add bonus to user's bonus field (not main balance yet)
    await storage.addUserBonus(userId, bonusAmount, 'deposit_bonus', depositAmount);
    
    // Add to user transactions
    await storage.addTransaction({
      userId,
      transactionType: 'bonus',
      amount: bonusAmount,
      balanceBefore: 0, // will be calculated
      balanceAfter: 0,  // will be calculated
      referenceId: `bonus_deposit_${Date.now()}`,
      description: `Deposit bonus (${bonusPercentage}% of ₹${depositAmount})`
    });
    
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
    
    // Add referral bonus to referrer's bonus field
    await storage.addUserBonus(referrerId, bonusAmount, 'referral_bonus', depositAmount);
    
    // Track referral relationship
    await storage.trackUserReferral(referrerId, depositAmount, bonusAmount);
    
    // Add to user transactions
    await storage.addTransaction({
      userId: referrerId,
      transactionType: 'bonus',
      amount: bonusAmount,
      balanceBefore: 0,
      balanceAfter: 0,
      referenceId: `referral_bonus_${Date.now()}`,
      description: `Referral bonus for user deposit of ₹${depositAmount}`
    });
    
    console.log(`Referral bonus of ₹${bonusAmount} added for referrer ${referrerId}`);
    return true;
  } catch (error) {
    console.error('Error applying referral bonus:', error);
    return false;
  }
};

export const checkConditionalBonus = async (userId: string): Promise<boolean> => {
  try {
    const user = await storage.getUserById(userId);
    if (!user) return false;
    
    // Get threshold from settings (default 30 means 70/130)
    const threshold = parseFloat(await storage.getGameSetting('conditional_bonus_threshold') || '30');
    
    // Check if user has original deposit to compare against
    if (!user.original_deposit_amount) return false;
    
    const originalDeposit = parseFloat(user.original_deposit_amount);
    const currentBalance = parseFloat(user.balance);
    
    // Check if balance is more than 130% of original deposit OR less than 70% of original deposit
    const upperThreshold = originalDeposit * (1 + (threshold / 100));
    const lowerThreshold = originalDeposit * (1 - (threshold / 100));
    
    if (currentBalance >= upperThreshold || currentBalance <= lowerThreshold) {
      // Apply any available bonus to main balance
      await applyAvailableBonus(userId);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking conditional bonus:', error);
    return false;
  }
};

export const applyAvailableBonus = async (userId: string): Promise<boolean> => {
  try {
    // This function will move available bonus to main balance
    const bonusInfo = await storage.getUserBonusInfo(userId);
    
    if (bonusInfo.depositBonus > 0 || bonusInfo.referralBonus > 0) {
      const totalBonus = bonusInfo.depositBonus + bonusInfo.referralBonus;
      
      // Add to main balance
      await storage.updateUserBalance(userId, totalBonus);
      
      // Reset bonus amounts
      await storage.resetUserBonus(userId);
      
      // Log the application
      await storage.addTransaction({
        userId,
        transactionType: 'bonus_applied',
        amount: totalBonus,
        balanceBefore: parseFloat((await storage.getUserById(userId)).balance) - totalBonus,
        balanceAfter: parseFloat((await storage.getUserById(userId)).balance),
        referenceId: `bonus_applied_${Date.now()}`,
        description: `Bonus applied to main balance (₹${bonusInfo.depositBonus} deposit + ₹${bonusInfo.referralBonus} referral)`
      });
      
      console.log(`Bonus of ₹${totalBonus} applied to main balance for user ${userId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error applying available bonus:', error);
    return false;
  }
};
```

#### Update `processDeposit` function:

```typescript
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
        console.log(`Processing UPI deposit of ${amount} to ${method.details.upiId}`);
        
        // Add amount to user balance
        await storage.updateUserBalance(userId, amount);
        
        // Store original deposit amount for conditional bonus check
        await storage.updateUserOriginalDeposit(userId, amount);
        
        // Apply deposit bonus
        await applyDepositBonus(userId, amount);
        
        // Check if user was referred and apply referral bonus
        await checkAndApplyReferralBonus(userId, amount);
        
        return { success: true };
        
      // Other methods...
    }
  } catch (error) {
    console.error('Deposit processing error:', error);
    return { success: false, error: 'Deposit processing failed' };
  }
};
```

### Frontend Implementation

#### Update Wallet Modal to show bonus information:

```tsx
// Add to WalletModal.tsx
<div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg">
  <div className="text-center">
    <div className="text-xs text-white/60 mb-1">Deposit Bonus</div>
    <div className="text-lg font-bold text-green-400">₹{userDepositBonus?.toLocaleString('en-IN') || '0'}</div>
  </div>
  <div className="text-center">
    <div className="text-xs text-white/60 mb-1">Referral Bonus</div>
    <div className="text-lg font-bold text-blue-400">₹{userReferralBonus?.toLocaleString('en-IN') || '0'}</div>
  </div>
</div>
```

## API Endpoints to Add

### New Backend Endpoints:

1. `GET /api/user/bonus-info` - Get user's bonus information
2. `POST /api/user/claim-bonus` - Manually claim available bonus 
3. `GET /api/admin/bonus-analytics` - Admin bonus analytics
4. `GET /api/admin/referral-analytics` - Admin referral analytics

### Updated Frontend API calls:

```tsx
// In UserProfileContext.tsx
const fetchBonusInfo = async () => {
  try {
    const response = await apiClient.get('/api/user/bonus-info') as any;
    if (response.success) {
      dispatch({ type: 'SET_BONUS_INFO', payload: response.data });
    }
  } catch (error) {
    console.error('Failed to fetch bonus info:', error);
  }
};

const claimBonus = async () => {
  try {
    const response = await apiClient.post('/api/user/claim-bonus') as any;
    if (response.success) {
      // Refresh analytics to show updated balance
      await fetchAnalytics();
      return response;
    }
  } catch (error) {
    console.error('Failed to claim bonus:', error);
    throw error;
  }
};
```

## Configuration Settings

The system will support configuration of these bonus parameters via admin panel:

- `default_deposit_bonus_percent`: Default deposit bonus percentage (default: 5)
- `referral_bonus_percent`: Referral bonus percentage (default: 1) 
- `conditional_bonus_threshold`: Threshold for conditional bonus (default: 30, meaning 70/130%)

## Testing Plan

1. **Deposit Bonus Test**: Make a deposit and verify 5% bonus is added to available bonus
2. **Referral Bonus Test**: Register user with referral code, make deposit, verify referrer gets bonus
3. **Conditional Bonus Test**: Play game until balance is <70% or >130%, verify bonus is applied
4. **Bonus Display Test**: Verify bonus amounts show correctly on wallet and profile pages
5. **Bonus Claim Test**: Verify claiming bonus moves it to main balance

## Security Considerations

1. Ensure bonus application is secure and can't be exploited
2. Validate referral codes properly
3. Prevent duplicate bonus application
4. Add audit logging for all bonus transactions
5. Rate limit bonus claiming to prevent abuse

## Rollout Strategy

1. **Phase 1**: Implement deposit bonus only
2. **Phase 2**: Add referral bonus system
3. **Phase 3**: Implement conditional bonus logic
4. **Phase 4**: Add admin controls and analytics

This implementation will provide a robust bonus and referral system that enhances user engagement while maintaining system security and preventing abuse.