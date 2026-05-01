import { withTransaction, TransactionRepository, AuditLogRepository } from '../dal';
import { AppError, asAppError } from '../lib/appError';
import { logger } from '../lib/logger';
import { incrementMetric, observeTransferProcessingDuration } from '../lib/metrics';
import { MoneyMovementService } from '../services/MoneyMovementService';

const DEFAULT_POLL_MS = Number(process.env.TRANSFER_WORKER_POLL_MS ?? 1000);
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1000;

function readStuckThresholdMs(): number {
  return Number(process.env.PROCESSING_STUCK_THRESHOLD_MS ?? 60_000);
}

function readSimulateFailures(): boolean {
  return process.env.SIMULATE_FAILURES === 'true';
}

function readSimulateFailureRate(): number {
  return Number(process.env.SIMULATE_FAILURE_RATE ?? 0.2);
}

function readSimulateFailureTerminalRate(): number {
  return Number(process.env.SIMULATE_FAILURE_TERMINAL_RATE ?? 0.2);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeBackoffMs(retryCount: number): number {
  const exponent = Math.max(0, retryCount - 1);
  return BASE_BACKOFF_MS * Math.pow(2, exponent);
}

function isRetryable(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.statusCode >= 500;
  }
  return true;
}

function getSimulatedFailureType(): 'none' | 'retryable' | 'terminal' {
  if (!readSimulateFailures()) {
    return 'none';
  }
  if (Math.random() >= readSimulateFailureRate()) {
    return 'none';
  }
  if (Math.random() < readSimulateFailureTerminalRate()) {
    return 'terminal';
  }
  return 'retryable';
}

export class TransferWorker {
  private readonly moneyMovement = new MoneyMovementService();
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private activeTick: Promise<void> | null = null;

  constructor(private readonly pollMs = DEFAULT_POLL_MS) {}

  start() {
    if (this.running) {
      return;
    }
    this.running = true;
    this.timer = setInterval(() => {
      void this.runTick();
    }, this.pollMs);
    void this.runTick();
    logger.info('Transfer worker started', { pollMs: this.pollMs });
  }

  async stop() {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.activeTick) {
      await this.activeTick;
    }
    logger.info('Transfer worker stopped');
  }

  private async runTick() {
    if (this.activeTick) {
      return;
    }

    this.activeTick = this.processAvailableWork();
    try {
      await this.activeTick;
    } finally {
      this.activeTick = null;
    }
  }

  private async processAvailableWork() {
    if (!this.running) {
      return;
    }

    while (this.running) {
      const claim = await withTransaction(async (client) => {
        const transfers = new TransactionRepository(client);
        const now = new Date();
        const staleBefore = new Date(now.getTime() - readStuckThresholdMs());
        return transfers.claimNextPendingForProcessing(now, staleBefore);
      });

      if (!claim) {
        break;
      }

      try {
        const startedAt = Date.now();
        await withTransaction(async (client) => {
          const auditLogs = new AuditLogRepository(client);
          await auditLogs.recordTransferEvent({
            transferId: claim.id,
            fromAccountId: claim.fromAccountId,
            toAccountId: claim.toAccountId,
            amount: claim.amount,
            action: 'TransferProcessing',
            status: 'processing',
            retryCount: claim.retryCount,
          });
        });
        incrementMetric('transferProcessingTotal');
        logger.info('TransferProcessing', {
          transferId: claim.id,
          fromAccountId: claim.fromAccountId,
          toAccountId: claim.toAccountId,
          amount: claim.amount,
          retryCount: claim.retryCount,
          status: 'processing',
        });

        const simulatedFailure = getSimulatedFailureType();
        if (simulatedFailure === 'retryable') {
          throw asAppError(503, 'Simulated transient worker failure');
        }
        if (simulatedFailure === 'terminal') {
          throw asAppError(400, 'Simulated terminal worker failure');
        }

        await this.moneyMovement.processTransfer(claim.id);
        observeTransferProcessingDuration(Date.now() - startedAt);
      } catch (error) {
        await this.handleProcessError(claim.id, claim.retryCount, error);
      }
    }
  }

  private async handleProcessError(transferId: string, currentRetryCount: number, error: unknown) {
    const nextRetryCount = currentRetryCount + 1;
    const retryable = isRetryable(error);

    await withTransaction(async (client) => {
      const transfers = new TransactionRepository(client);

      if (!retryable || nextRetryCount >= MAX_RETRIES) {
        const reason = error instanceof Error ? error.message : 'Unknown processing error';
        const failed = await transfers.markFailed(transferId, reason);
        if (failed) {
          const auditLogs = new AuditLogRepository(client);
          await auditLogs.recordTransferEvent({
            transferId: failed.id,
            fromAccountId: failed.fromAccountId,
            toAccountId: failed.toAccountId,
            amount: failed.amount,
            action: 'TransferFailed',
            status: 'failed',
            reason,
            retryCount: nextRetryCount,
          });
        }
        incrementMetric('transferFailedTotal');
        return;
      }

      const backoffMs = computeBackoffMs(nextRetryCount);
      const nextRetryAt = new Date(Date.now() + backoffMs);
      await transfers.requeueWithBackoff(
        transferId,
        nextRetryCount,
        nextRetryAt,
        error instanceof Error ? error.message : 'Unknown processing error'
      );
      incrementMetric('transferRetriedTotal');
    });

    logger.warn('Transfer processing failed', {
      transferId,
      retryCount: nextRetryCount,
      retryable,
      error: error instanceof Error ? error.message : String(error),
    });

    if (retryable) {
      await sleep(0);
    }
  }
}
