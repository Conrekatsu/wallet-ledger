import { Router } from 'express';
import {
  createTransferHandler,
  getTransferStatusHandler,
  listDeadLetterTransfersHandler,
  retryDeadLetterTransferHandler,
} from '../handlers/transactionHandlers';

const router = Router();

router.post('/', createTransferHandler);
router.get('/dead-letter', listDeadLetterTransfersHandler);
router.post('/:id/retry', retryDeadLetterTransferHandler);
router.get('/:id', getTransferStatusHandler);

export default router;
