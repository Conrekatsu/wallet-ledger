import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createTransfer, getTransferStatus } from '../../lib/transfersApi';
import { cacheKeys } from '../../lib/cacheKeys';
import { CACHE_TTL_MS } from '../../lib/cacheTtl';
import { getOrFetch, cacheInvalidate } from '../../lib/queryCache';
import { useAuthStore } from '../../store/auth';
import { createIdempotencyKey } from '../../lib/utils';
import { getApiErrorMessage } from '../../lib/errors';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';

export default function TransfersPage() {
  const { apiKey, activeAccountId } = useAuthStore();
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('50');
  const [transferIdLookup, setTransferIdLookup] = useState('');
  const [lastStatus, setLastStatus] = useState<{ id: string; status: string; failureReason: string | null } | null>(
    null
  );
  const [busy, setBusy] = useState(false);

  const canUseApi = Boolean(apiKey);

  useEffect(() => {
    if (activeAccountId) {
      setFromId(activeAccountId);
    }
  }, [activeAccountId]);

  async function submitTransfer() {
    if (!canUseApi) {
      toast.error('Set your API key in Profile first.');
      return;
    }
    const n = Number(amount);
    if (!Number.isInteger(n) || n <= 0) {
      toast.error('Amount must be a positive integer');
      return;
    }
    if (!fromId.trim() || !toId.trim()) {
      toast.error('From and to account IDs are required');
      return;
    }
    setBusy(true);
    try {
      const res = await createTransfer({
        fromAccountId: fromId.trim(),
        toAccountId: toId.trim(),
        amount: n,
        idempotencyKey: createIdempotencyKey('transfer'),
      });
      cacheInvalidate(cacheKeys.transferStatus(res.transfer.id));
      setLastStatus({
        id: res.transfer.id,
        status: res.transfer.status,
        failureReason: res.transfer.lastError,
      });
      setTransferIdLookup(res.transfer.id);
      toast.success(`Transfer queued (${res.transfer.id})`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Transfer failed'));
    } finally {
      setBusy(false);
    }
  }

  async function refreshStatus() {
    if (!canUseApi || !transferIdLookup.trim()) return;
    setBusy(true);
    try {
      const id = transferIdLookup.trim();
      const s = await getOrFetch(cacheKeys.transferStatus(id), () => getTransferStatus(id), CACHE_TTL_MS.transferStatus, {
        force: true,
      });
      setLastStatus(s);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Status lookup failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Transfers</h1>
        <p className="mt-1 text-sm text-slate-400">
          POST /api/transfers (Idempotency-Key) and GET /api/transfers/:id.
        </p>
      </div>

      {!canUseApi && (
        <p className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          Add your API key under Profile to create transfers.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create transfer</CardTitle>
          <CardDescription>From account defaults to your active account when set on the Accounts page.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="from">From account</Label>
            <Input id="from" value={fromId} onChange={(e) => setFromId(e.target.value)} placeholder="uuid" />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="to">To account</Label>
            <Input id="to" value={toId} onChange={(e) => setToId(e.target.value)} placeholder="uuid" />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="amt">Amount</Label>
            <Input id="amt" type="number" min={1} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <Button onClick={() => void submitTransfer()} disabled={busy}>
              Submit transfer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transfer status</CardTitle>
          <CardDescription>GET /api/transfers/:id</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="grow space-y-2">
              <Label htmlFor="tid">Transfer ID</Label>
              <Input
                id="tid"
                value={transferIdLookup}
                onChange={(e) => setTransferIdLookup(e.target.value)}
                placeholder="paste transfer id"
              />
            </div>
            <Button variant="outline" onClick={() => void refreshStatus()} disabled={busy || !transferIdLookup.trim()}>
              Refresh status
            </Button>
          </div>
          {lastStatus && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm">
              <p className="font-mono text-xs text-slate-500">{lastStatus.id}</p>
              <p className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-slate-400">Status</span>
                <Badge>{lastStatus.status}</Badge>
              </p>
              {lastStatus.failureReason && (
                <p className="mt-2 text-red-300">{lastStatus.failureReason}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
