import { useEffect, useState } from 'react';
import { listAccounts } from '../lib/accountsApi';
import { listAuditLogs } from '../lib/auditApi';
import { cacheKeys } from '../lib/cacheKeys';
import { CACHE_TTL_MS } from '../lib/cacheTtl';
import { getOrFetch } from '../lib/queryCache';
import { Account, AuditLogEntry } from '../lib/types';
import { formatDateTime } from '../lib/dateUtils';
import { useAuthStore } from '../store/auth';
import { getApiErrorMessage } from '../lib/errors';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

function formatAuditDetail(entry: AuditLogEntry): string {
  const m = entry.metadata;
  const bits: string[] = [];
  if (entry.transferId) bits.push(`Transfer ${entry.transferId}`);
  if (typeof m.amount === 'number') bits.push(`amount ${m.amount}`);
  if (typeof m.status === 'string') bits.push(`status ${m.status}`);
  if (typeof m.reason === 'string') bits.push(m.reason);
  return bits.join(' · ') || '—';
}

function categoryClass(action: string): string {
  if (action === 'TransferFailed') {
    return 'border-red-800 bg-red-950/80 capitalize text-red-200';
  }
  return 'border-slate-700 bg-slate-800/80 text-slate-200';
}

export default function AuditTrailPage() {
  const { apiKey, activeAccountId, setActiveAccountId } = useAuthStore();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const canUseApi = Boolean(apiKey);

  /** Returns the account id to use for scope (after syncing active selection). */
  async function loadAccountsData(force = false): Promise<string | null> {
    const list = await getOrFetch(cacheKeys.accountsList(), listAccounts, CACHE_TTL_MS.accountsList, { force });
    setAccounts(list);
    if (list.length === 0) return null;
    const exists = activeAccountId && list.some((a) => a.id === activeAccountId);
    const nextId = exists ? activeAccountId! : list[0].id;
    if (!exists) setActiveAccountId(nextId);
    return nextId;
  }

  async function loadAuditData(accountId: string | null, force = false) {
    const scope = accountId ?? 'all';
    const entries = await getOrFetch(
      cacheKeys.auditEntries(scope),
      () => listAuditLogs(accountId),
      CACHE_TTL_MS.auditEntries,
      { force }
    );
    setAuditEntries(entries);
  }

  useEffect(() => {
    if (!canUseApi) {
      setAccounts([]);
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        await loadAccountsData(false);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to load accounts'));
      } finally {
        setLoading(false);
      }
    })();
  }, [canUseApi]);

  useEffect(() => {
    if (!canUseApi) {
      setAuditEntries([]);
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        await loadAuditData(activeAccountId, false);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to load audit log'));
      } finally {
        setLoading(false);
      }
    })();
  }, [activeAccountId, canUseApi]);

  async function refreshAll() {
    if (!canUseApi) return;
    setLoading(true);
    try {
      const scopeId = await loadAccountsData(true);
      await loadAuditData(scopeId, true);
      toast.success('Audit data refreshed');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Refresh failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Audit trail</h1>
          <p className="mt-1 text-sm text-slate-400">
            Server audit log (GET /api/audit): transfer lifecycle actions such as TransferProcessing, TransferCompleted,
            TransferFailed.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refreshAll()} disabled={loading || !canUseApi}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {!canUseApi && (
        <p className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          Set your API key on the Profile page to load accounts and audit data.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account scope</CardTitle>
          <CardDescription>
            Optional filter: only audit rows linked to the selected account (or its transfers). Leave as selected account
            from the list.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="audit-account">Account</Label>
          <Select
            id="audit-account"
            value={activeAccountId ?? ''}
            onChange={(e) => setActiveAccountId(e.target.value || null)}
            disabled={!canUseApi || accounts.length === 0}
          >
            {accounts.length === 0 ? (
              <option value="">No accounts</option>
            ) : (
              accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.id}
                </option>
              ))
            )}
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
          <CardDescription>
            {loading ? 'Loading…' : `${auditEntries.length} events`}
            {' · '}
            <span className="text-slate-500">Action column shows the stored audit action (e.g. TransferProcessing).</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="min-w-[11rem]">Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-xs text-slate-400">
                    {formatDateTime(entry.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge className={categoryClass(entry.action)}>
                      {entry.action === 'TransferFailed' ? 'failure' : 'transfer'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-slate-100">{entry.action}</TableCell>
                  <TableCell className="max-w-md text-sm text-slate-300">{formatAuditDetail(entry)}</TableCell>
                </TableRow>
              ))}
              {auditEntries.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-slate-500">
                    No audit events for this selection.
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
