import { AccountRepository } from '../dal';

export interface CreateAccountRequestInput {
  requesterUserId?: string;
}

export interface GetAccountBalanceRequestInput {
  requesterUserId?: string;
  accountId?: string;
}

const accounts = new AccountRepository();

export async function createAccount(input: CreateAccountRequestInput) {
  if (!input.requesterUserId) {
    throw new Error('Unauthorized');
  }

  const account = await accounts.create({ userId: input.requesterUserId });
  return { account };
}

export async function getAccountBalance(input: GetAccountBalanceRequestInput) {
  const { requesterUserId, accountId } = input;
  if (!requesterUserId) {
    throw new Error('Unauthorized');
  }
  if (!accountId) {
    throw new Error('accountId required');
  }

  const account = await accounts.findById(accountId);
  if (!account) {
    throw new Error('Account not found');
  }
  if (account.userId !== requesterUserId) {
    throw new Error('Forbidden');
  }

  return {
    accountId: account.id,
    balance: account.balance,
  };
}
