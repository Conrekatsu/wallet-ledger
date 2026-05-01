import api from './api';
import { Account, AccountLedgerEntry, Transfer } from './types';

export async function listAccounts() {
  const { data } = await api.get<{ accounts: Account[] }>('/accounts');
  return data.accounts;
}

export async function createAccount() {
  const { data } = await api.post<{ account: Account }>('/accounts');
  return data;
}

export async function getAccountBalance(accountId: string) {
  const { data } = await api.get<{ accountId: string; balance: number }>(`/accounts/${accountId}/balance`);
  return data;
}

export async function getAccountTransactions(accountId: string) {
  const { data } = await api.get<{ accountId: string; transactions: AccountLedgerEntry[] }>(
    `/accounts/${accountId}/transactions`
  );
  return data;
}

export async function addFunds(accountId: string, amount: number, idempotencyKey: string) {
  const { data } = await api.post<{ transfer: Transfer; accountId: string; balance: number; replayed: boolean }>(
    `/accounts/${accountId}/funds`,
    { amount },
    { headers: { 'Idempotency-Key': idempotencyKey } }
  );
  return data;
}
