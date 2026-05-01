import api from './api';
import { AuditLogEntry } from './types';

export async function listAuditLogs(accountId?: string | null) {
  const { data } = await api.get<{ entries: AuditLogEntry[] }>('/audit', {
    params: accountId ? { accountId } : {},
  });
  return data.entries;
}
