import { AccountRepository, AuditLogRepository } from '../dal';
import { asAppError } from '../lib/appError';

export interface ListAuditLogsRequestInput {
  requesterUserId?: string;
  accountId?: string | null;
}

const accounts = new AccountRepository();
const auditLogs = new AuditLogRepository();

export async function listAuditLogs(input: ListAuditLogsRequestInput) {
  if (!input.requesterUserId) {
    throw asAppError(401, 'Unauthorized');
  }

  let accountId: string | null = null;
  if (input.accountId?.trim()) {
    const account = await accounts.findById(input.accountId.trim());
    if (!account) {
      throw asAppError(404, 'Account not found');
    }
    if (account.userId !== input.requesterUserId) {
      throw asAppError(403, 'Forbidden');
    }
    accountId = account.id;
  }

  const entries = await auditLogs.listForUser(input.requesterUserId, accountId);
  return { entries };
}
