import { AccountRepository, AuditLogRepository, TransactionRepository, withTransaction } from '../dal';
import { asAppError } from '../lib/appError';
import { incrementMetric } from '../lib/metrics';
import { MoneyMovementService } from '../services/MoneyMovementService';
import { logger } from '../lib/logger';

const moneyMovement = new MoneyMovementService();
const accounts = new AccountRepository();
const transfers = new TransactionRepository();

export interface CreateTransferInput {
  requesterUserId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  amount?: number;
  idempotencyKey?: string;
}

export interface GetTransferStatusInput {
  requesterUserId?: string;
  transferId?: string;
}

export interface RetryDeadLetterTransferInput {
  requesterUserId?: string;
  transferId?: string;
}

export async function createTransfer(input: CreateTransferInput) {
  const { requesterUserId, fromAccountId, toAccountId, amount, idempotencyKey } = input;
  if (!requesterUserId) {
    throw asAppError(401, 'Unauthorized');
  }
  if (!idempotencyKey) {
    throw asAppError(400, 'Idempotency-Key header required');
  }
  if (!fromAccountId || !toAccountId || amount === undefined || amount === null) {
    throw asAppError(400, 'fromAccountId, toAccountId, and amount are required');
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    throw asAppError(400, 'Amount must be a positive integer');
  }

  const result = await moneyMovement.enqueueTransfer({
    requesterUserId,
    fromAccountId,
    toAccountId,
    amount,
    idempotencyKey,
  });

  return {
    transfer: {
      ...result.transaction,
      status: result.transaction.status.toUpperCase(),
    },
    replayed: result.replayed,
  };
}

export async function getTransferStatus(input: GetTransferStatusInput) {
  const { requesterUserId, transferId } = input;
  if (!requesterUserId) {
    throw asAppError(401, 'Unauthorized');
  }
  if (!transferId) {
    throw asAppError(400, 'transferId required');
  }

  const transfer = await transfers.findById(transferId);
  if (!transfer) {
    throw asAppError(404, 'Transfer not found');
  }

  const fromAccount = await accounts.findById(transfer.fromAccountId);
  if (!fromAccount || fromAccount.userId !== requesterUserId) {
    throw asAppError(403, 'Forbidden');
  }

  return {
    id: transfer.id,
    status: transfer.status.toUpperCase(),
    failureReason: transfer.status === 'failed' ? transfer.lastError : null,
  };
}

export async function listDeadLetterTransfers(input: { requesterUserId?: string }) {
  const { requesterUserId } = input;
  if (!requesterUserId) {
    throw asAppError(401, 'Unauthorized');
  }

  const failedTransfers = await transfers.findFailedByUserId(requesterUserId);
  return {
    transfers: failedTransfers.map((transfer) => ({
      ...transfer,
      status: transfer.status.toUpperCase(),
    })),
  };
}

export async function retryDeadLetterTransfer(input: RetryDeadLetterTransferInput) {
  const { requesterUserId, transferId } = input;
  if (!requesterUserId) {
    throw asAppError(401, 'Unauthorized');
  }
  if (!transferId) {
    throw asAppError(400, 'transferId required');
  }

  return withTransaction(async (client) => {
    const transactionRepo = new TransactionRepository(client);
    const accountRepo = new AccountRepository(client);
    const auditLogs = new AuditLogRepository(client);

    const transfer = await transactionRepo.findByIdForUpdate(transferId);
    if (!transfer) {
      throw asAppError(404, 'Transfer not found');
    }
    if (transfer.status !== 'failed') {
      throw asAppError(409, 'Only failed transfers can be retried');
    }

    const fromAccount = await accountRepo.findById(transfer.fromAccountId);
    if (!fromAccount || fromAccount.userId !== requesterUserId) {
      throw asAppError(403, 'Forbidden');
    }

    const retried = await transactionRepo.requeueFailedTransfer(transferId);
    if (!retried) {
      throw asAppError(500, 'Unable to retry transfer');
    }

    await auditLogs.recordTransferEvent({
      actorUserId: requesterUserId,
      transferId: retried.id,
      fromAccountId: retried.fromAccountId,
      toAccountId: retried.toAccountId,
      amount: retried.amount,
      action: 'TransferRequested',
      status: 'pending',
      reason: 'Manual DLQ retry',
    });
    incrementMetric('transferRetriedTotal');
    logger.info('TransferRetryQueued', {
      transferId: retried.id,
      fromAccountId: retried.fromAccountId,
      toAccountId: retried.toAccountId,
      amount: retried.amount,
      status: 'pending',
      reason: 'Manual DLQ retry',
    });

    return {
      transfer: {
        ...retried,
        status: retried.status.toUpperCase(),
      },
    };
  });
}
