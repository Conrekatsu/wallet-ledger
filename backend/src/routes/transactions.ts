import { Router } from 'express';
import { createTransferHandler, getTransferStatusHandler } from '../handlers/transactionHandlers';

const router = Router();

router.post('/', createTransferHandler);
router.get('/:id', getTransferStatusHandler);

export default router;
