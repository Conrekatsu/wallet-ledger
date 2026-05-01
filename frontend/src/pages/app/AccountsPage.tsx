import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  addFunds,
  createAccount,
  getAccountBalance,
  getAccountTransactions,
  listAccounts,
} from '../../lib/accountsApi';
import { getTransferStatus } from '../../lib/transfersApi';
import { cacheKeys } from '../../lib/cacheKeys';
import { CACHE_TTL_MS } from '../../lib/cacheTtl';
import { getOrFetch, cacheInvalidatePrefix } from '../../lib/queryCache';
import { Account, AccountLedgerEntry } from '../../lib/types';
import { useAuthStore } from '../../store/auth';
import { formatDateTime } from '../../lib/dateUtils';
import { CopyableId } from '../../components/CopyableId';
import { createIdempotencyKey } from '../../lib/utils';
import { getApiErrorMessage } from '../../lib/errors';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';

export default function AccountsPage() {
  const { apiKey, activeAccountId, setActiveAccountId } = useAuthStore();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<AccountLedgerEntry[]>([]);
  const [transferStatusById, setTransferStatusById] = useState<Record<string, string>>({});
  const [amountToAdd, setAmountToAdd] = useState('100');
  const [busy, setBusy] = useState(false);

  const canUseApi = Boolean(apiKey);

  const ledgerTotals = useMemo(() => {
    let credits = 0;
    let debits = 0;
    for (const tx of transactions) {
      const n = Number(tx.amount);
      if (tx.type === 'credit') {
        credits += n;
      } else {
        debits += Math.abs(n);
      }
    }
    return { credits, debits };
  }, [transactions]);

  async function loadAccounts(force = false) {
    if (!canUseApi) return;
    setBusy(true);
    try {
      const list = await getOrFetch(cacheKeys.accountsList(), listAccounts, CACHE_TTL_MS.accountsList, {
        force,
      });
      setAccounts(list);
      if (!activeAccountId && list.length > 0) {
        setActiveAccountId(list[0].id);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to list accounts'));
    } finally {
      setBusy(false);
    }
  }

  async function refreshAccountDetails(accountId: string, force = false) {
    const [bal, txs] = await Promise.all([
      getOrFetch(
        cacheKeys.accountBalance(accountId),
        () => getAccountBalance(accountId),
        CACHE_TTL_MS.accountBalance,
        { force }
      ),
      getOrFetch(
        cacheKeys.accountTransactions(accountId),
        async () => {
          const body = await getAccountTransactions(accountId);
          return body.transactions;
        },
        CACHE_TTL_MS.accountTransactions,
        { force }
      ),
    ]);
    setBalance(bal.balance);
    setTransactions(txs);
  }

  useEffect(() => {
    void loadAccounts();
  }, [canUseApi]);

  useEffect(() => {
    if (!canUseApi || !activeAccountId) {
      setBalance(null);
      setTransactions([]);
      return;
    }
    void (async () => {
      try {
        await refreshAccountDetails(activeAccountId);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to load account'));
      }
    })();
  }, [activeAccountId, canUseApi]);

  useEffect(() => {
    if (!canUseApi || transactions.length === 0) {
      setTransferStatusById({});
      return;
    }
    const ids = [...new Set(transactions.map((t) => t.transferId))].slice(0, 40);
    let cancelled = false;
    void (async () => {
      const pairs = await Promise.all(
        ids.map(async (tid) => {
          try {
            const s = await getOrFetch(
              cacheKeys.transferStatus(tid),
              () => getTransferStatus(tid),
              CACHE_TTL_MS.transferStatus,
              { force: false }
            );
            return [tid, s.status] as const;
          } catch {
            return [tid, '—'] as const;
          }
        })
      );
      if (!cancelled) {
        setTransferStatusById(Object.fromEntries(pairs));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [transactions, canUseApi]);

  async function onCreateAccount() {
    if (!canUseApi) {
      toast.error('Set your API key in Profile first.');
      return;
    }
    setBusy(true);
    try {
      const { account } = await createAccount();
      cacheInvalidatePrefix('api:accounts:');
      cacheInvalidatePrefix('api:transfers:status:');
      setAccounts((prev) => [...prev, account]);
      setActiveAccountId(account.id);
      await refreshAccountDetails(account.id, true);
      toast.success('Account created');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to create account'));
    } finally {
      setBusy(false);
    }
  }

  async function onAddFunds() {
    if (!activeAccountId || !canUseApi) return;
    const amount = Number(amountToAdd);
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error('Amount must be a positive integer');
      return;
    }
    setBusy(true);
    try {
      await addFunds(activeAccountId, amount, createIdempotencyKey('funds'));
      cacheInvalidatePrefix('api:accounts:');
      cacheInvalidatePrefix('api:transfers:status:');
      await refreshAccountDetails(activeAccountId, true);
      await loadAccounts(true);
      toast.success('Funds added');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to add funds'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Accounts</h1>
        <p className="mt-1 text-sm text-slate-400">
          Uses GET/POST /api/accounts, balance, transactions, and add funds (Idempotency-Key).
        </p>
      </div>

      {!canUseApi && (
        <p className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          Add your API key under Profile to use account endpoints.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account actions</CardTitle>
            <CardDescription>Create an account and select the active one.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void onCreateAccount()} disabled={busy}>
                Create account
              </Button>
              <Button variant="outline" onClick={() => void loadAccounts(true)} disabled={busy || !canUseApi}>
                Refresh list
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (!activeAccountId || !canUseApi) return;
                  cacheInvalidatePrefix('api:transfers:status:');
                  void (async () => {
                    setBusy(true);
                    try {
                      await refreshAccountDetails(activeAccountId, true);
                    } catch (err) {
                      toast.error(getApiErrorMessage(err, 'Failed to refresh ledger'));
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
                disabled={busy || !canUseApi || !activeAccountId}
              >
                Refresh ledger
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="active-account">Active account</Label>
              <Select
                id="active-account"
                value={activeAccountId ?? ''}
                onChange={(e) => setActiveAccountId(e.target.value || null)}
                disabled={!canUseApi || accounts.length === 0}
              >
                {accounts.length === 0 ? (
                  <option value="">No accounts</option>
                ) : (
                  accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id}
                    </option>
                  ))
                )}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="funds-amount">Add funds (integer)</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <Input
                  id="funds-amount"
                  type="number"
                  min={1}
                  step={1}
                  value={amountToAdd}
                  onChange={(e) => setAmountToAdd(e.target.value)}
                  className="sm:max-w-xs"
                />
                <Button onClick={() => void onAddFunds()} disabled={busy || !activeAccountId || !canUseApi}>
                  Add funds
                </Button>
              </div>
            </div>
            {balance !== null && (
              <p className="text-sm text-slate-300">
                Current balance: <span className="font-mono font-medium text-slate-100">{balance}</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All accounts</CardTitle>
            <CardDescription>GET /api/accounts</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead className="hidden sm:table-cell">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="max-w-[min(100vw,28rem)]">
                      <CopyableId id={a.id} />
                    </TableCell>
                    <TableCell>{a.balance}</TableCell>
                    <TableCell className="hidden text-slate-400 sm:table-cell">
                      {new Date(a.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {accounts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-slate-500">
                      No accounts yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ledger for selected account</CardTitle>
          <CardDescription>
            Ledger rows use <code className="text-xs">timestamp</code>; transfer status is loaded separately via GET
            /api/transfers/:id.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current balance</p>
              <p className="mt-1 font-mono text-lg tabular-nums text-slate-100">
                {balance !== null ? balance : '—'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">From GET /accounts/:id/balance</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total credits (ledger)</p>
              <p className="mt-1 font-mono text-lg tabular-nums text-emerald-400">
                {transactions.length === 0 ? '—' : ledgerTotals.credits}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">Sum of credit entry amounts</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total debits (ledger)</p>
              <p className="mt-1 font-mono text-lg tabular-nums text-rose-400">
                {transactions.length === 0 ? '—' : ledgerTotals.debits}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">Sum of debit amounts (absolute)</p>
            </div>
          </div>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Transfer</TableHead>
                <TableHead>Transfer status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="whitespace-nowrap text-xs text-slate-400">
                    {formatDateTime(tx.timestamp)}
                  </TableCell>
                  <TableCell>{tx.type}</TableCell>
                  <TableCell>{tx.amount}</TableCell>
                  <TableCell className="max-w-[min(100vw,16rem)]">
                    <CopyableId id={tx.transferId} truncateClassName="max-w-[120px] sm:max-w-[200px]" />
                  </TableCell>
                  <TableCell>
                    <Badge>{transferStatusById[tx.transferId] ?? '…'}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-slate-500">
                    No ledger entries for this account.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
