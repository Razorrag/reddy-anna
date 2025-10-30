
import { Router } from 'express';
import { getUserBalance } from '../controllers/userController';
import { requireAuth } from '../auth';

const router = Router();

router.use(requireAuth);

router.get('/balance', getUserBalance);

export default router;
