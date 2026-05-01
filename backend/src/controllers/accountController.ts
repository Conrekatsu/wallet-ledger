import { AccountRepository, LedgerRepository, TransactionRepository, withTransaction } from '../dal';
import { asAppError } from '../lib/appError';

export interface CreateAccountRequestInput {
  requesterUserId?: string;
}

export interface GetAccountBalanceRequestInput {
  requesterUserId?: string;
  accountId?: string;
}

export interface AddFundsRequestInput {
  requesterUserId?: string;
  accountId?: string;
  amount?: number;
  idempotencyKey?: string;
}

export interface GetAccountTransactionsRequestInput {
  requesterUserId?: string;
  accountId?: string;
}

const accounts = new AccountRepository();

export async function createAccount(input: CreateAccountRequestInput) {
  if (!input.requesterUserId) {
    throw asAppError(401, 'Unauthorized');
  }

  const account = await accounts.create({ userId: input.requesterUserId });
  return { account };
}

export async function getAccountBalance(input: GetAccountBalanceRequestInput) {
  const { requesterUserId, accountId } = input;
  if (!requesterUserId) {
    throw asAppError(401, 'Unauthorized');
  }
  if (!accountId) {
    throw asAppError(400, 'accountId required');
  }

  const account = await accounts.findById(accountId);
  if (!account) {
    throw asAppError(404, 'Account not found');
  }
  if (account.userId !== requesterUserId) {
    throw asAppError(403, 'Forbidden');
  }

  return {
    accountId: account.id,
    balance: account.balance,
  };
}

export async function addFunds(input: AddFundsRequestInput) {
  const { requesterUserId, accountId, amount, idempotencyKey } = input;
  if (!requesterUserId) {
    throw asAppError(401, 'Unauthorized');
  }
  if (!accountId) {
    throw asAppError(400, 'accountId required');
  }
  if (!idempotencyKey) {
    throw asAppError(400, 'Idempotency-Key header required');
  }
  if (amount === undefined || amount === null || !Number.isInteger(amount) || amount <= 0) {
    throw asAppError(400, 'Amount must be a positive integer');
  }

  return withTransaction(async (client) => {
    const accountRepo = new AccountRepository(client);
    const transferRepo = new TransactionRepository(client);
    const ledgerRepo = new LedgerRepository(client);

    const account = await accountRepo.findById(accountId);
    if (!account) {
      throw asAppError(404, 'Account not found');
    }
    if (account.userId !== requesterUserId) {
      throw asAppError(403, 'Forbidden');
    }

    const existing = await transferRepo.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      if (existing.status === 'pending' || existing.status === 'processing') {
        throw asAppError(409, 'Idempotent transaction is still in progress');
      }
      if (existing.status === 'failed') {
        throw asAppError(409, 'Idempotent transaction already failed');
      }
      if (existing.toAccountId !== accountId || existing.fromAccountId !== accountId) {
        throw asAppError(409, 'Idempotency key already used for a different transfer');
      }

      const refreshedAccount = await accountRepo.findById(accountId);
      if (!refreshedAccount) {
        throw asAppError(404, 'Account not found');
      }

      return {
        transfer: { ...existing, status: existing.status.toUpperCase() },
        accountId: refreshedAccount.id,
        balance: refreshedAccount.balance,
        replayed: true,
      };
    }

    const created = await transferRepo.create({
      fromAccountId: accountId,
      toAccountId: accountId,
      amount,
      idempotencyKey,
    });

    await ledgerRepo.create({
      accountId,
      transactionId: created.id,
      amount,
      type: 'credit',
    });

    const completed = await transferRepo.markCompleted(created.id);
    if (!completed) {
      throw asAppError(500, 'Unable to update transaction status');
    }

    const refreshedAccount = await accountRepo.findById(accountId);
    if (!refreshedAccount) {
      throw asAppError(404, 'Account not found');
    }

    return {
      transfer: { ...completed, status: completed.status.toUpperCase() },
      accountId: refreshedAccount.id,
      balance: refreshedAccount.balance,
      replayed: false,
    };
  });
}

export async function getAccountTransactions(input: GetAccountTransactionsRequestInput) {
  const { requesterUserId, accountId } = input;
  if (!requesterUserId) {
    throw asAppError(401, 'Unauthorized');
  }
  if (!accountId) {
    throw asAppError(400, 'accountId required');
  }

  const account = await accounts.findById(accountId);
  if (!account) {
    throw asAppError(404, 'Account not found');
  }
  if (account.userId !== requesterUserId) {
    throw asAppError(403, 'Forbidden');
  }

  const ledgerRepo = new LedgerRepository();
  const transactions = await ledgerRepo.findAccountTransactions(accountId);
  return {
    accountId,
    transactions,
  };
}
