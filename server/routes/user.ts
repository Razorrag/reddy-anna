
import { Router } from 'express';
import { getUserBalance, undoLastBet, getLastGameBets } from '../controllers/userController';
import {
  getUserGameHistory,
  getUserAnalytics,
  getUserBonusSummary,
  getUserDepositBonuses,
  getUserReferralBonuses,
  getUserBonusTransactions,
  claimUserBonus
} from '../controllers/userDataController';
import { requireAuth } from '../auth';

const router = Router();

router.use(requireAuth);

// Existing routes
router.get('/balance', getUserBalance);
router.delete('/undo-last-bet', undoLastBet);
router.get('/last-game-bets', getLastGameBets);

// Game history
router.get('/game-history', getUserGameHistory);

// Analytics
router.get('/analytics', getUserAnalytics);

// Bonus routes
router.get('/bonus-summary', getUserBonusSummary);
router.get('/deposit-bonuses', getUserDepositBonuses);
router.get('/referral-bonuses', getUserReferralBonuses);
router.get('/bonus-transactions', getUserBonusTransactions);
router.post('/claim-bonus', claimUserBonus);

export default router;
