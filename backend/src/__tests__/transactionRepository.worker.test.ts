import { TransactionRepository } from '../dal/repositories/TransactionRepository';

describe('TransactionRepository worker operations', () => {
  it('uses FOR UPDATE SKIP LOCKED and stale processing reclaim filter', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [
        {
          id: 'tx_1',
          from_account_id: 'acc_1',
          to_account_id: 'acc_2',
          amount: 25,
          retry_count: 0,
        },
      ],
    });
    const repo = new TransactionRepository({ query } as any);

    const claimed = await repo.claimNextPendingForProcessing(new Date('2026-01-01T00:00:00.000Z'));

    expect(claimed).toEqual({
      id: 'tx_1',
      fromAccountId: 'acc_1',
      toAccountId: 'acc_2',
      amount: 25,
      retryCount: 0,
    });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE SKIP LOCKED');
    expect(query.mock.calls[0][0]).toContain("status = 'processing'");
    expect(query.mock.calls[0][0]).toContain('updated_at < $2');
  });
});
