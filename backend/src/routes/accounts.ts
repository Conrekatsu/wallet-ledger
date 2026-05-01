import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createAccountHandler, getAccountBalanceHandler } from '../handlers/accountHandlers';

const router = Router();

router.post('/', authenticate, createAccountHandler);
router.get('/:id/balance', authenticate, getAccountBalanceHandler);

export default router;
