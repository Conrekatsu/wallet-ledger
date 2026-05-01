import { Router } from 'express';
import { addFundsHandler, createAccountHandler, getAccountBalanceHandler } from '../handlers/accountHandlers';

const router = Router();

router.post('/', createAccountHandler);
router.get('/:id/balance', getAccountBalanceHandler);
router.post('/:id/funds', addFundsHandler);

export default router;
