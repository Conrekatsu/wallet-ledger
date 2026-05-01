import { MoneyMovementService } from '../services/MoneyMovementService';
import {
  AccountRepository,
  AuditLogRepository,
  LedgerRepository,
  TransactionRepository,
  withTransaction,
} from '../dal';

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
  const findByIdempotencyKeyMock = jest.fn();
  const findTransferEntriesByTransactionIdMock = jest.fn();
  const recordTransferMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    MockedAccountRepository.mockImplementation(() => ({ findById: findByIdMock }) as any);
    MockedTransactionRepository.mockImplementation(
      () =>
        ({
          findByIdempotencyKey: findByIdempotencyKeyMock,
        }) as any
    );
    MockedLedgerRepository.mockImplementation(
      () =>
        ({
          findTransferEntriesByTransactionId: findTransferEntriesByTransactionIdMock,
        }) as any
    );
    MockedAuditLogRepository.mockImplementation(() => ({ recordTransfer: recordTransferMock }) as any);
    mockWithTransaction.mockImplementation(async (work: any) => work({}));
  });

  it('validates account ids and amount early', async () => {
    await expect(
      service.moveMoney({
        requesterUserId: 'u1',
        fromAccountId: 'a1',
        toAccountId: 'a1',
        amount: 10,
        idempotencyKey: 'idem-1',
      })
    ).rejects.toThrow('Source and destination accounts must differ');

    await expect(
      service.moveMoney({
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
    recordTransferMock.mockResolvedValue(undefined);

    const result = await service.moveMoney({
      requesterUserId: 'u1',
      fromAccountId: 'a1',
      toAccountId: 'a2',
      amount: 10,
      idempotencyKey: 'idem-1',
    });

    expect(result.replayed).toBe(true);
    expect(result.transaction.id).toBe('t1');
    expect(recordTransferMock).toHaveBeenCalledWith(expect.objectContaining({ replayed: true }));
  });
});
