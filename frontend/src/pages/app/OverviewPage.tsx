import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { getHealth } from '../../lib/healthApi';
import { cacheKeys } from '../../lib/cacheKeys';
import { CACHE_TTL_MS } from '../../lib/cacheTtl';
import { getOrFetch } from '../../lib/queryCache';
import { getApiErrorMessage } from '../../lib/errors';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Wallet, ArrowLeftRight, TriangleAlert, BarChart3, ScrollText, User } from 'lucide-react';

export default function OverviewPage() {
  const { user } = useAuthStore();
  const [health, setHealth] = useState<{ status: string; timestamp: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await getOrFetch(cacheKeys.health(), getHealth, CACHE_TTL_MS.health, { force: false });
        setHealth(data);
      } catch {
        /* optional */
      }
    })();
  }, []);

  async function pingHealth() {
    setLoading(true);
    try {
      const data = await getOrFetch(cacheKeys.health(), getHealth, CACHE_TTL_MS.health, { force: true });
      setHealth(data);
      toast.success('Backend is reachable');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Health check failed'));
    } finally {
      setLoading(false);
    }
  }

  const tiles = [
    { to: '/accounts', title: 'Accounts', desc: 'List, create, fund, ledger', icon: Wallet },
    { to: '/transfers', title: 'Transfers', desc: 'Create transfer, check status', icon: ArrowLeftRight },
    { to: '/operations', title: 'Operations', desc: 'Dead-letter queue & retry', icon: TriangleAlert },
    { to: '/metrics', title: 'Metrics', desc: 'Worker / transfer counters', icon: BarChart3 },
    { to: '/audit', title: 'Audit trail', desc: 'Ledger + failures timeline', icon: ScrollText },
    { to: '/profile', title: 'Profile', desc: 'Session & API key', icon: User },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Overview</h1>
        <p className="mt-1 text-sm text-slate-400">
          Welcome back{user?.name ? `, ${user.name}` : user?.email ? `, ${user.email}` : ''}. Use the
          sidebar to reach every backend capability.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">System health</CardTitle>
          <CardDescription>Calls GET /api/health (no API key required).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            {health ? (
              <p className="text-slate-300">
                Status: <span className="font-mono text-emerald-400">{health.status}</span>
                <span className="text-slate-500"> · </span>
                <span className="text-slate-500">{new Date(health.timestamp).toLocaleString()}</span>
              </p>
            ) : (
              <p className="text-slate-500">Run a check to verify the API is up.</p>
            )}
          </div>
          <Button onClick={() => void pingHealth()} disabled={loading}>
            {loading ? 'Checking…' : 'Check health'}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium text-slate-400">Quick links</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map(({ to, title, desc, icon: Icon }) => (
            <Link key={to} to={to} className="group block rounded-xl outline-none ring-offset-slate-950 focus-visible:ring-2 focus-visible:ring-blue-500">
              <Card className="h-full transition-colors group-hover:border-slate-600">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <div className="rounded-md bg-slate-800 p-2 text-slate-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription className="mt-1">{desc}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
