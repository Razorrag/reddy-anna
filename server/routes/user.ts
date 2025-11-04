
import { Router } from 'express';
import { getUserBalance, undoLastBet, getLastGameBets } from '../controllers/userController';
import { requireAuth } from '../auth';

const router = Router();

router.use(requireAuth);

router.get('/balance', getUserBalance);
router.delete('/undo-last-bet', undoLastBet);
router.get('/last-game-bets', getLastGameBets);

export default router;
