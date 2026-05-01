import { AccountRepository, TransactionRepository } from '../dal';
import { MoneyMovementService } from '../services/MoneyMovementService';

export interface MoveMoneyInput {
  requesterUserId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  amount?: number;
  idempotencyKey?: string;
}

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

export async function moveMoney(input: MoveMoneyInput) {
  const { requesterUserId, fromAccountId, toAccountId, amount, idempotencyKey } = input;

  if (!requesterUserId) {
    throw new Error('Unauthorized');
  }

  if (!fromAccountId || !toAccountId || amount === undefined || amount === null || !idempotencyKey) {
    throw new Error('fromAccountId, toAccountId, amount, and idempotencyKey are required');
  }

  return moneyMovement.moveMoney({
    requesterUserId,
    fromAccountId,
    toAccountId,
    amount,
    idempotencyKey,
  });
}

export async function createTransfer(input: CreateTransferInput) {
  const { requesterUserId, fromAccountId, toAccountId, amount, idempotencyKey } = input;
  if (!requesterUserId) {
    throw new Error('Unauthorized');
  }
  if (!idempotencyKey) {
    throw new Error('Idempotency-Key header required');
  }
  if (!fromAccountId || !toAccountId || amount === undefined || amount === null) {
    throw new Error('fromAccountId, toAccountId, and amount are required');
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
    throw new Error('Unauthorized');
  }
  if (!transferId) {
    throw new Error('transferId required');
  }

  const transfer = await transfers.findById(transferId);
  if (!transfer) {
    throw new Error('Transfer not found');
  }

  const fromAccount = await accounts.findById(transfer.fromAccountId);
  if (!fromAccount || fromAccount.userId !== requesterUserId) {
    throw new Error('Forbidden');
  }

  return {
    id: transfer.id,
    status: transfer.status.toUpperCase(),
  };
}
