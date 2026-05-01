ALTER TABLE transfers
  ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS last_error TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_transfers_pending_created_at
  ON transfers(created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_transfers_pending_next_retry_at
  ON transfers(next_retry_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_transfers_processing_started_at
  ON transfers(processing_started_at)
  WHERE status = 'processing';

CREATE INDEX IF NOT EXISTS idx_ledger_entries_transfer_id
  ON ledger_entries(transfer_id);
