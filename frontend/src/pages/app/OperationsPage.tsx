import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { listDeadLetterTransfers, retryDeadLetterTransfer } from '../../lib/transfersApi';
import { cacheKeys } from '../../lib/cacheKeys';
import { CACHE_TTL_MS } from '../../lib/cacheTtl';
import { getOrFetch } from '../../lib/queryCache';
import { Transfer } from '../../lib/types';
import { useAuthStore } from '../../store/auth';
import { getApiErrorMessage } from '../../lib/errors';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';

export default function OperationsPage() {
  const { apiKey } = useAuthStore();
  const [items, setItems] = useState<Transfer[]>([]);
  const [busy, setBusy] = useState(false);
  const canUseApi = Boolean(apiKey);

  async function load(force = false) {
    if (!canUseApi) return;
    setBusy(true);
    try {
      const list = await getOrFetch(cacheKeys.deadLetter(), listDeadLetterTransfers, CACHE_TTL_MS.deadLetter, {
        force,
      });
      setItems(list);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load dead-letter queue'));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, [canUseApi]);

  async function retry(id: string) {
    setBusy(true);
    try {
      await retryDeadLetterTransfer(id);
      toast.success('Transfer requeued');
      await load(true);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Retry failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Operations</h1>
          <p className="mt-1 text-sm text-slate-400">GET /api/transfers/dead-letter · POST /api/transfers/:id/retry</p>
        </div>
        <Button variant="outline" onClick={() => void load(true)} disabled={busy || !canUseApi}>
          Refresh
        </Button>
      </div>

      {!canUseApi && (
        <p className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          Add your API key under Profile to access dead-letter operations.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dead-letter transfers</CardTitle>
          <CardDescription>Failed transfers you can retry manually.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="max-w-[120px] truncate font-mono text-xs">{t.id}</TableCell>
                  <TableCell className="max-w-[100px] truncate font-mono text-xs">{t.fromAccountId}</TableCell>
                  <TableCell className="max-w-[100px] truncate font-mono text-xs">{t.toAccountId}</TableCell>
                  <TableCell>{t.amount}</TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" disabled={busy}>
                          Retry
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Retry this transfer?</DialogTitle>
                          <DialogDescription>
                            This calls POST /api/transfers/{t.id}/retry and requeues the failed transfer.
                          </DialogDescription>
                        </DialogHeader>
                        <Button onClick={() => void retry(t.id)}>Confirm retry</Button>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-slate-500">
                    No dead-letter items.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
