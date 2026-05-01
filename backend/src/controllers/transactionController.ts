import { AccountRepository, TransactionRepository } from '../dal';
import { asAppError } from '../lib/appError';
import { MoneyMovementService } from '../services/MoneyMovementService';

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

  const result = await moneyMovement.moveMoney({
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
  };
}
