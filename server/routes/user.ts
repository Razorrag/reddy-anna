
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

// NOTE: Manual bonus claiming has been removed - bonuses are now auto-credited

export default router;
