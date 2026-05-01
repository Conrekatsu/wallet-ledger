/** Default TTLs (ms) to reduce repeated GETs and avoid rate limits */
export const CACHE_TTL_MS = {
  health: 30_000,
  accountsList: 60_000,
  accountBalance: 45_000,
  accountTransactions: 45_000,
  transferStatus: 90_000,
  deadLetter: 60_000,
  metrics: 45_000,
  auditEntries: 45_000,
} as const;
