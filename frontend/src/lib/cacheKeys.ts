export const cacheKeys = {
  health: () => 'api:health',
  accountsList: () => 'api:accounts:list',
  accountBalance: (accountId: string) => `api:accounts:${accountId}:balance`,
  accountTransactions: (accountId: string) => `api:accounts:${accountId}:transactions`,
  transferStatus: (transferId: string) => `api:transfers:status:${transferId}`,
  deadLetter: () => 'api:transfers:dead-letter',
  metrics: () => 'api:metrics',
  /** Scope key: account id or `all` when listing every audit row for the user */
  auditEntries: (accountScope: string) => `api:audit:${accountScope}`,
};
