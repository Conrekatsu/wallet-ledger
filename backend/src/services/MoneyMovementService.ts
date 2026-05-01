import {
  AccountRepository,
  AuditLogRepository,
  LedgerRepository,
  TransactionRepository,
  withTransaction,
} from '../dal';
import { AppError, asAppError } from '../lib/appError';
import { incrementMetric } from '../lib/metrics';
import { logger } from '../lib/logger';
import { SerializedTransaction } from '../models/Transaction';

export interface MoneyMovementInput {
  requesterUserId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  idempotencyKey: string;
}

export interface EnqueueTransferResult {
  transaction: SerializedTransaction;
  replayed: boolean;
}

export class MoneyMovementService {
  async enqueueTransfer(input: MoneyMovementInput): Promise<EnqueueTransferResult> {
    if (input.fromAccountId === input.toAccountId) {
      throw asAppError(400, 'Source and destination accounts must differ');
    }
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw asAppError(400, 'Amount must be a positive integer');
    }

    return withTransaction(async (client) => {
      const accounts = new AccountRepository(client);
      const transactions = new TransactionRepository(client);
      const ledger = new LedgerRepository(client);
      const auditLogs = new AuditLogRepository(client);

      const fromAccount = await accounts.findById(input.fromAccountId);
      const toAccount = await accounts.findById(input.toAccountId);
      if (!fromAccount || !toAccount) {
        throw asAppError(400, 'One or both accounts do not exist');
      }
      if (fromAccount.userId !== input.requesterUserId) {
        throw asAppError(400, 'Cannot move money from an account you do not own');
      }

      const existing = await transactions.findByIdempotencyKey(input.idempotencyKey);
      if (existing) {
        if (existing.status === 'completed') {
          const existingLedgerEntries = await ledger.findTransferEntriesByTransactionId(existing.id);
          if (!existingLedgerEntries) {
            throw asAppError(500, 'Existing transaction is missing ledger entries');
          }
        }

        await auditLogs.recordTransferEvent({
          actorUserId: input.requesterUserId,
          transferId: existing.id,
          fromAccountId: input.fromAccountId,
          toAccountId: input.toAccountId,
          amount: input.amount,
          action: 'TransferRequested',
          status: existing.status,
        });

        return {
          transaction: existing,
          replayed: true,
        };
      }

      const created = await transactions.create({
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        amount: input.amount,
        idempotencyKey: input.idempotencyKey,
      });

      await auditLogs.recordTransferEvent({
        actorUserId: input.requesterUserId,
        transferId: created.id,
        fromAccountId: created.fromAccountId,
        toAccountId: created.toAccountId,
        amount: created.amount,
        action: 'TransferRequested',
        status: 'pending',
      });
      incrementMetric('transferRequestedTotal');
      logger.info('TransferRequested', {
        transferId: created.id,
        fromAccountId: created.fromAccountId,
        toAccountId: created.toAccountId,
        amount: created.amount,
        status: 'pending',
      });

      return {
        transaction: created,
        replayed: false,
      };
    });
  }

  async processTransfer(transferId: string): Promise<SerializedTransaction> {
    return withTransaction(async (client) => {
      const transactions = new TransactionRepository(client);
      const accounts = new AccountRepository(client);
      const ledger = new LedgerRepository(client);
      const auditLogs = new AuditLogRepository(client);

      const transfer = await transactions.findByIdForUpdate(transferId);
      if (!transfer) {
        throw asAppError(404, 'Transfer not found');
      }
      if (transfer.status !== 'processing') {
        throw asAppError(409, 'Transfer is not in processing state');
      }

      try {
        await accounts.validateAndLockForTransfer(transfer.fromAccountId, transfer.toAccountId, transfer.amount);
      } catch (error) {
        if (error instanceof AppError && error.statusCode === 400 && error.message === 'Insufficient funds') {
          const failed = await transactions.markFailed(transfer.id, 'Insufficient funds');
          if (!failed) {
            throw asAppError(500, 'Unable to mark transfer as failed');
          }

          await auditLogs.recordTransferEvent({
            transferId: transfer.id,
            fromAccountId: transfer.fromAccountId,
            toAccountId: transfer.toAccountId,
            amount: transfer.amount,
            action: 'TransferFailed',
            status: 'failed',
            reason: 'Insufficient funds',
          });
          incrementMetric('transferFailedTotal');
          logger.warn('TransferFailed', {
            transferId: transfer.id,
            fromAccountId: transfer.fromAccountId,
            toAccountId: transfer.toAccountId,
            amount: transfer.amount,
            status: 'failed',
            reason: 'Insufficient funds',
          });

          return failed;
        }
        throw error;
      }

      await ledger.createTransferEntries({
        fromAccountId: transfer.fromAccountId,
        toAccountId: transfer.toAccountId,
        transactionId: transfer.id,
        amount: transfer.amount,
      });

      const completed = await transactions.markCompleted(transfer.id);
      if (!completed) {
        throw asAppError(500, 'Unable to mark transfer as completed');
      }

      const fromAccount = await accounts.findById(transfer.fromAccountId);
      if (fromAccount) {
        await auditLogs.recordTransferEvent({
          actorUserId: fromAccount.userId,
          transferId: transfer.id,
          fromAccountId: transfer.fromAccountId,
          toAccountId: transfer.toAccountId,
          amount: transfer.amount,
          action: 'TransferCompleted',
          status: 'completed',
        });
      }
      incrementMetric('transferCompletedTotal');
      logger.info('TransferCompleted', {
        transferId: transfer.id,
        fromAccountId: transfer.fromAccountId,
        toAccountId: transfer.toAccountId,
        amount: transfer.amount,
        status: 'completed',
      });

      return completed;
    });
  }
}
