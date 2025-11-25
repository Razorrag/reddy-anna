
import { Router } from 'express';
// import { getUserBalance } from '../payment';
// import { undoLastBet, getLastGameBets } from '../game';
import {
  getUserGameHistory,
  getUserAnalytics,
  getUserBonusSummary,
  getUserDepositBonuses,
  getUserReferralBonuses,
  getUserBonusTransactions,
  getUserReferralData
} from '../controllers/userDataController';
import { requireAuth } from '../auth';

const router = Router();

router.use(requireAuth);

// Existing routes (commented out - functions need to be exported or moved)
// router.get('/balance', getUserBalance);
// router.delete('/undo-last-bet', undoLastBet);
// router.get('/last-game-bets', getLastGameBets);

// Game history
router.get('/game-history', getUserGameHistory);

// Analytics
router.get('/analytics', getUserAnalytics);

// Bonus routes
router.get('/bonus-summary', getUserBonusSummary);
router.get('/deposit-bonuses', getUserDepositBonuses);
router.get('/referral-bonuses', getUserReferralBonuses);
router.get('/bonus-transactions', getUserBonusTransactions);

// Referral routes
router.get('/referral-data', getUserReferralData);

// ✅ Generate referral code if missing (uses single source of truth)
router.post('/generate-referral-code', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const { storage } = await import('../storage-supabase');
    const user = await storage.getUser(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Check if user already has a referral code
    if (user.referral_code_generated) {
      return res.json({
        success: true,
        message: 'Referral code already exists',
        data: { referralCode: user.referral_code_generated }
      });
    }
    
    // Use the single source of truth - generateMissingReferralCodes for this user
    const result = await storage.generateMissingReferralCodes();
    
    // Fetch updated user to get the new code
    const updatedUser = await storage.getUser(req.user.id);
    
    if (updatedUser?.referral_code_generated) {
      res.json({
        success: true,
        message: 'Referral code generated successfully',
        data: { referralCode: updatedUser.referral_code_generated }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate referral code'
      });
    }
  } catch (error: any) {
    console.error('Error generating referral code:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate referral code'
    });
  }
});

// NOTE: Manual bonus claiming has been removed - bonuses are now auto-credited

export default router;
