import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createTransferHandler, getTransferStatusHandler, moveMoneyHandler } from '../handlers/transactionHandlers';

const router = Router();

router.post('/move', authenticate, moveMoneyHandler);
router.post('/', authenticate, createTransferHandler);
router.get('/:id', authenticate, getTransferStatusHandler);

export default router;
