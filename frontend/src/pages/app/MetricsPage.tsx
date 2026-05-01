import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getMetrics } from '../../lib/metricsApi';
import { cacheKeys } from '../../lib/cacheKeys';
import { CACHE_TTL_MS } from '../../lib/cacheTtl';
import { getOrFetch } from '../../lib/queryCache';
import { MetricsSnapshot } from '../../lib/types';
import { useAuthStore } from '../../store/auth';
import { getApiErrorMessage } from '../../lib/errors';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export default function MetricsPage() {
  const { apiKey } = useAuthStore();
  const [snap, setSnap] = useState<MetricsSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const canUseApi = Boolean(apiKey);

  const load = useCallback(
    async (force = false) => {
      if (!canUseApi) {
        if (force) toast.error('Set your API key in Profile first.');
        return;
      }
      setBusy(true);
      try {
        const data = await getOrFetch(cacheKeys.metrics(), getMetrics, CACHE_TTL_MS.metrics, { force });
        setSnap(data);
        if (force) toast.success('Metrics loaded');
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to load metrics'));
      } finally {
        setBusy(false);
      }
    },
    [canUseApi]
  );

  useEffect(() => {
    if (!canUseApi) return;
    void load(false);
  }, [canUseApi, load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Metrics</h1>
          <p className="mt-1 text-sm text-slate-400">GET /api/metrics (in-memory counters).</p>
        </div>
        <Button onClick={() => void load(true)} disabled={busy}>
          {busy ? 'Loading…' : 'Refresh metrics'}
        </Button>
      </div>

      {!canUseApi && (
        <p className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          Add your API key under Profile to read metrics.
        </p>
      )}

      {!snap ? (
        <p className="text-sm text-slate-500">{busy ? 'Loading…' : 'Waiting for metrics…'}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.entries(snap) as [keyof MetricsSnapshot, number][]).map(([key, value]) => (
            <Card key={key} className="border-slate-800 bg-slate-900/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-normal capitalize text-slate-500">{String(key)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums text-slate-100">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
