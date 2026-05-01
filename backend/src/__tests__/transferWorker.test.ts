const claimNextPendingForProcessingMock = jest.fn();
const markFailedMock = jest.fn();
const requeueWithBackoffMock = jest.fn();
const processTransferMock = jest.fn();
const recordTransferEventMock = jest.fn();

jest.mock('../dal', () => ({
  withTransaction: jest.fn(async (work: any) =>
    work({
      query: jest.fn(),
    })
  ),
  TransactionRepository: jest.fn(() => ({
    claimNextPendingForProcessing: claimNextPendingForProcessingMock,
    markFailed: markFailedMock,
    requeueWithBackoff: requeueWithBackoffMock,
  })),
  AuditLogRepository: jest.fn(() => ({
    recordTransferEvent: recordTransferEventMock,
  })),
}));

jest.mock('../services/MoneyMovementService', () => ({
  MoneyMovementService: jest.fn(() => ({
    processTransfer: processTransferMock,
  })),
}));

describe('TransferWorker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SIMULATE_FAILURES;
    delete process.env.SIMULATE_FAILURE_RATE;
    delete process.env.SIMULATE_FAILURE_TERMINAL_RATE;
    delete process.env.PROCESSING_STUCK_THRESHOLD_MS;
  });

  it('marks transfer failed after retry limit is reached', async () => {
    const { TransferWorker } = await import('../workers/TransferWorker');

    claimNextPendingForProcessingMock
      .mockResolvedValueOnce({
        id: 'tx_1',
        fromAccountId: 'a1',
        toAccountId: 'a2',
        amount: 20,
        retryCount: 4,
      })
      .mockResolvedValueOnce(null);
    processTransferMock.mockRejectedValue(new Error('temporary db issue'));

    const worker = new TransferWorker(5);
    worker.start();
    await new Promise((resolve) => setTimeout(resolve, 30));
    await worker.stop();

    expect(markFailedMock).toHaveBeenCalledWith('tx_1', 'temporary db issue');
    expect(requeueWithBackoffMock).not.toHaveBeenCalled();
    expect(recordTransferEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TransferProcessing', transferId: 'tx_1' })
    );
  });

  it('requeues retryable simulated failures', async () => {
    process.env.SIMULATE_FAILURES = 'true';
    process.env.SIMULATE_FAILURE_RATE = '1';
    process.env.SIMULATE_FAILURE_TERMINAL_RATE = '0';
    const { TransferWorker } = await import('../workers/TransferWorker');

    claimNextPendingForProcessingMock
      .mockResolvedValueOnce({
        id: 'tx_2',
        fromAccountId: 'a1',
        toAccountId: 'a2',
        amount: 20,
        retryCount: 0,
      })
      .mockResolvedValueOnce(null);

    const worker = new TransferWorker(5);
    worker.start();
    await new Promise((resolve) => setTimeout(resolve, 30));
    await worker.stop();

    expect(requeueWithBackoffMock).toHaveBeenCalled();
    expect(markFailedMock).not.toHaveBeenCalled();
    expect(processTransferMock).not.toHaveBeenCalled();
  });

  it('marks failed on terminal simulated failures', async () => {
    process.env.SIMULATE_FAILURES = 'true';
    process.env.SIMULATE_FAILURE_RATE = '1';
    process.env.SIMULATE_FAILURE_TERMINAL_RATE = '1';
    const { TransferWorker } = await import('../workers/TransferWorker');

    claimNextPendingForProcessingMock
      .mockResolvedValueOnce({
        id: 'tx_3',
        fromAccountId: 'a1',
        toAccountId: 'a2',
        amount: 20,
        retryCount: 0,
      })
      .mockResolvedValueOnce(null);

    const worker = new TransferWorker(5);
    worker.start();
    await new Promise((resolve) => setTimeout(resolve, 30));
    await worker.stop();

    expect(markFailedMock).toHaveBeenCalledWith('tx_3', 'Simulated terminal worker failure');
    expect(requeueWithBackoffMock).not.toHaveBeenCalled();
    expect(processTransferMock).not.toHaveBeenCalled();
  });
});
