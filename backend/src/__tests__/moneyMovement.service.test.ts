import { MoneyMovementService } from '../services/MoneyMovementService';
import {
  AccountRepository,
  AuditLogRepository,
  LedgerRepository,
  TransactionRepository,
  withTransaction,
} from '../dal';
import { asAppError } from '../lib/appError';

jest.mock('../dal', () => ({
  withTransaction: jest.fn(),
  AccountRepository: jest.fn(),
  TransactionRepository: jest.fn(),
  LedgerRepository: jest.fn(),
  AuditLogRepository: jest.fn(),
}));

const mockWithTransaction = withTransaction as jest.Mock;
const MockedAccountRepository = AccountRepository as jest.MockedClass<typeof AccountRepository>;
const MockedTransactionRepository = TransactionRepository as jest.MockedClass<typeof TransactionRepository>;
const MockedLedgerRepository = LedgerRepository as jest.MockedClass<typeof LedgerRepository>;
const MockedAuditLogRepository = AuditLogRepository as jest.MockedClass<typeof AuditLogRepository>;

describe('MoneyMovementService', () => {
  const service = new MoneyMovementService();
  const findByIdMock = jest.fn();
  const validateAndLockForTransferMock = jest.fn();
  const findByIdempotencyKeyMock = jest.fn();
  const findTransferEntriesByTransactionIdMock = jest.fn();
  const createTransferEntriesMock = jest.fn();
  const markFailedMock = jest.fn();
  const markCompletedMock = jest.fn();
  const recordTransferMock = jest.fn();
  const recordTransferEventMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    MockedAccountRepository.mockImplementation(
      () =>
        ({
          findById: findByIdMock,
          validateAndLockForTransfer: validateAndLockForTransferMock,
        }) as any
    );
    MockedTransactionRepository.mockImplementation(
      () =>
        ({
          findByIdempotencyKey: findByIdempotencyKeyMock,
          findById: findByIdMock,
          findByIdForUpdate: findByIdMock,
          markFailed: markFailedMock,
          markCompleted: markCompletedMock,
        }) as any
    );
    MockedLedgerRepository.mockImplementation(
      () =>
        ({
          findTransferEntriesByTransactionId: findTransferEntriesByTransactionIdMock,
          createTransferEntries: createTransferEntriesMock,
        }) as any
    );
    MockedAuditLogRepository.mockImplementation(
      () =>
        ({
          recordTransfer: recordTransferMock,
          recordTransferEvent: recordTransferEventMock,
        }) as any
    );
    mockWithTransaction.mockImplementation(async (work: any) => work({}));
  });

  it('validates account ids and amount early', async () => {
    await expect(
      service.enqueueTransfer({
        requesterUserId: 'u1',
        fromAccountId: 'a1',
        toAccountId: 'a1',
        amount: 10,
        idempotencyKey: 'idem-1',
      })
    ).rejects.toThrow('Source and destination accounts must differ');

    await expect(
      service.enqueueTransfer({
        requesterUserId: 'u1',
        fromAccountId: 'a1',
        toAccountId: 'a2',
        amount: 0,
        idempotencyKey: 'idem-1',
      })
    ).rejects.toThrow('Amount must be a positive integer');
  });

  it('replays existing successful transfer', async () => {
    findByIdMock.mockImplementation((id: string) => Promise.resolve({ id, userId: 'u1' }));
    findByIdempotencyKeyMock.mockResolvedValue({ id: 't1', status: 'completed' });
    findTransferEntriesByTransactionIdMock.mockResolvedValue({
      debit: { id: 'l1' },
      credit: { id: 'l2' },
    });
    recordTransferEventMock.mockResolvedValue(undefined);

    const result = await service.enqueueTransfer({
      requesterUserId: 'u1',
      fromAccountId: 'a1',
      toAccountId: 'a2',
      amount: 10,
      idempotencyKey: 'idem-1',
    });

    expect(result.replayed).toBe(true);
    expect(result.transaction.id).toBe('t1');
    expect(recordTransferEventMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'TransferRequested' }));
  });

  it('returns existing in-progress transfer for duplicate idempotency key', async () => {
    findByIdMock.mockImplementation((id: string) => Promise.resolve({ id, userId: 'u1' }));
    findByIdempotencyKeyMock.mockResolvedValue({
      id: 't-pending',
      status: 'pending',
      fromAccountId: 'a1',
      toAccountId: 'a2',
      amount: 10,
    });

    const result = await service.enqueueTransfer({
      requesterUserId: 'u1',
      fromAccountId: 'a1',
      toAccountId: 'a2',
      amount: 10,
      idempotencyKey: 'idem-pending',
    });

    expect(result).toEqual({
      transaction: expect.objectContaining({ id: 't-pending', status: 'pending' }),
      replayed: true,
    });
  });

  it('processTransfer marks failed when insufficient funds', async () => {
    findByIdMock.mockResolvedValue({
      id: 't1',
      fromAccountId: 'a1',
      toAccountId: 'a2',
      amount: 50,
      status: 'processing',
    });
    validateAndLockForTransferMock.mockRejectedValue(asAppError(400, 'Insufficient funds'));
    markFailedMock.mockResolvedValue({ id: 't1', status: 'failed' });

    const result = await service.processTransfer('t1');

    expect(result.status).toBe('failed');
    expect(markFailedMock).toHaveBeenCalledWith('t1', 'Insufficient funds');
    expect(createTransferEntriesMock).not.toHaveBeenCalled();
  });

  it('processTransfer does not complete on unexpected error', async () => {
    findByIdMock.mockResolvedValue({
      id: 't3',
      fromAccountId: 'a1',
      toAccountId: 'a2',
      amount: 20,
      status: 'processing',
    });
    validateAndLockForTransferMock.mockResolvedValue(undefined);
    createTransferEntriesMock.mockRejectedValue(new Error('crash while writing ledger'));

    await expect(service.processTransfer('t3')).rejects.toThrow('crash while writing ledger');
    expect(markCompletedMock).not.toHaveBeenCalled();
    expect(markFailedMock).not.toHaveBeenCalled();
  });

  it('processTransfer writes ledger and completes on success', async () => {
    findByIdMock.mockResolvedValue({
      id: 't2',
      fromAccountId: 'a1',
      toAccountId: 'a2',
      amount: 20,
      status: 'processing',
    });
    validateAndLockForTransferMock.mockResolvedValue(undefined);
    createTransferEntriesMock.mockResolvedValue({
      debit: { id: 'd1' },
      credit: { id: 'c1' },
    });
    markCompletedMock.mockResolvedValue({ id: 't2', status: 'completed' });

    const result = await service.processTransfer('t2');

    expect(result.status).toBe('completed');
    expect(createTransferEntriesMock).toHaveBeenCalledWith({
      fromAccountId: 'a1',
      toAccountId: 'a2',
      transactionId: 't2',
      amount: 20,
    });
    expect(markCompletedMock).toHaveBeenCalledWith('t2');
    expect(recordTransferEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TransferCompleted',
        status: 'completed',
      })
    );
  });
});
