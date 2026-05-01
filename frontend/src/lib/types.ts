export interface User {
  id: string | number;
  email: string;
  name: string | null;
  created_at?: string;
  apiKey?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Account {
  id: string;
  userId: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  status: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  lastError: string | null;
}

/** Rows from GET /api/audit */
export interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  accountId: string | null;
  transferId: string | null;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** Rows from GET /api/accounts/:id/transactions (ledger_entries) */
export interface AccountLedgerEntry {
  id: string;
  transferId: string;
  type: 'credit' | 'debit';
  amount: number;
  /** ISO timestamp from the ledger row */
  timestamp: string;
}

export interface MetricsSnapshot {
  transferRequestedTotal: number;
  transferProcessingTotal: number;
  transferCompletedTotal: number;
  transferFailedTotal: number;
  transferRetriedTotal: number;
  transferProcessingDurationMsCount: number;
  transferProcessingDurationMsTotal: number;
  transferProcessingDurationMsAvg: number;
}
