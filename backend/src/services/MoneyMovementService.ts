import {
  AccountRepository,
  AuditLogRepository,
  LedgerRepository,
  TransactionRepository,
  withTransaction,
} from '../dal';
import { SerializedLedgerEntry } from '../models/LedgerEntry';
import { SerializedTransaction } from '../models/Transaction';

export interface MoneyMovementInput {
  requesterUserId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  idempotencyKey: string;
}

export interface MoneyMovementResult {
  transaction: SerializedTransaction;
  ledgerEntries: {
    debit: SerializedLedgerEntry;
    credit: SerializedLedgerEntry;
  };
  replayed: boolean;
}

export class MoneyMovementService {
  async moveMoney(input: MoneyMovementInput): Promise<MoneyMovementResult> {
    if (input.fromAccountId === input.toAccountId) {
      throw new Error('Source and destination accounts must differ');
    }
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw new Error('Amount must be a positive integer');
    }

    return withTransaction(async (client) => {
      const accounts = new AccountRepository(client);
      const transactions = new TransactionRepository(client);
      const ledger = new LedgerRepository(client);
      const auditLogs = new AuditLogRepository(client);

      const fromAccount = await accounts.findById(input.fromAccountId);
      const toAccount = await accounts.findById(input.toAccountId);
      if (!fromAccount || !toAccount) {
        throw new Error('One or both accounts do not exist');
      }
      if (fromAccount.userId !== input.requesterUserId) {
        throw new Error('Cannot move money from an account you do not own');
      }

      const existing = await transactions.findByIdempotencyKey(input.idempotencyKey);
      if (existing) {
        if (existing.status === 'pending' || existing.status === 'processing') {
          throw new Error('Idempotent transaction is still in progress');
        }
        if (existing.status === 'failed') {
          throw new Error('Idempotent transaction already failed');
        }

        const existingLedgerEntries = await ledger.findTransferEntriesByTransactionId(existing.id);
        if (!existingLedgerEntries) {
          throw new Error('Existing transaction is missing ledger entries');
        }
        await auditLogs.recordTransfer({
          actorUserId: input.requesterUserId,
          transferId: existing.id,
          fromAccountId: input.fromAccountId,
          toAccountId: input.toAccountId,
          amount: input.amount,
          replayed: true,
        });
        return {
          transaction: existing,
          ledgerEntries: existingLedgerEntries,
          replayed: true,
        };
      }

      const created = await transactions.create({
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        amount: input.amount,
        idempotencyKey: input.idempotencyKey,
      });

      await accounts.transferBalance(input.fromAccountId, input.toAccountId, input.amount);

      const { debit, credit } = await ledger.createTransferEntries({
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        transactionId: created.id,
        amount: input.amount,
      });

      const completed = await transactions.updateStatus(created.id, 'completed');
      if (!completed) {
        throw new Error('Unable to update transaction status');
      }

      await auditLogs.recordTransfer({
        actorUserId: input.requesterUserId,
        transferId: completed.id,
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        amount: input.amount,
        replayed: false,
      });

      return {
        transaction: completed,
        ledgerEntries: {
          debit,
          credit,
        },
        replayed: false,
      };
    });
  }
}
