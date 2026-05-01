import api from './api';
import { Transfer } from './types';

export async function createTransfer(payload: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  idempotencyKey: string;
}) {
  const { idempotencyKey, ...body } = payload;
  const { data } = await api.post<{ transfer: Transfer; replayed: boolean }>('/transfers', body, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return data;
}

export async function getTransferStatus(transferId: string) {
  const { data } = await api.get<{ id: string; status: string; failureReason: string | null }>(`/transfers/${transferId}`);
  return data;
}

export async function listDeadLetterTransfers() {
  const { data } = await api.get<{ transfers: Transfer[] }>('/transfers/dead-letter');
  return data.transfers;
}

export async function retryDeadLetterTransfer(transferId: string) {
  const { data } = await api.post<{ transfer: Transfer }>(`/transfers/${transferId}/retry`);
  return data.transfer;
}
