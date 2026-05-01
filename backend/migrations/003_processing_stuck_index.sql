CREATE INDEX IF NOT EXISTS idx_transfers_processing_updated_at
  ON transfers(updated_at)
  WHERE status = 'processing';
