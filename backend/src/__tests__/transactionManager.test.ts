import { withTransaction } from '../dal/TransactionManager';

describe('withTransaction', () => {
  it('begins and commits on success', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const release = jest.fn();
    const connect = jest.fn().mockResolvedValue({ query, release });
    const db = { connect } as any;

    const result = await withTransaction(async () => 'ok', db);

    expect(result).toBe('ok');
    expect(query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(query).toHaveBeenNthCalledWith(2, 'COMMIT');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('rolls back and rethrows on failure', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const release = jest.fn();
    const connect = jest.fn().mockResolvedValue({ query, release });
    const db = { connect } as any;

    await expect(
      withTransaction(async () => {
        throw new Error('fail');
      }, db)
    ).rejects.toThrow('fail');

    expect(query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(query).toHaveBeenNthCalledWith(2, 'ROLLBACK');
    expect(release).toHaveBeenCalledTimes(1);
  });
});
