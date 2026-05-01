import { Router } from 'express';
import {
  addFundsHandler,
  createAccountHandler,
  getAccountBalanceHandler,
  getAccountTransactionsHandler,
  listAccountsHandler,
} from '../handlers/accountHandlers';

const router = Router();

router.post('/', createAccountHandler);
router.get('/', listAccountsHandler);
router.get('/:id/balance', getAccountBalanceHandler);
router.get('/:id/transactions', getAccountTransactionsHandler);
router.post('/:id/funds', addFundsHandler);

export default router;
