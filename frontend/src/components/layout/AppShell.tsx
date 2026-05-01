import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  LayoutDashboard,
  Menu,
  ScrollText,
  TriangleAlert,
  User,
  Wallet,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

const navItems: {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/transfers', label: 'Transfers', icon: ArrowLeftRight },
  { to: '/operations', label: 'Operations', icon: TriangleAlert },
  { to: '/metrics', label: 'Metrics', icon: BarChart3 },
  { to: '/audit', label: 'Audit trail', icon: ScrollText },
  { to: '/profile', label: 'Profile', icon: User },
];

export function AppShell() {
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur transition-transform md:static md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
          <Link to="/" className="font-semibold tracking-tight text-slate-100">
            WalletLedger
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-3 text-xs text-slate-500">
          Signed in as{' '}
          <span className="text-slate-400">{user?.name ?? user?.email ?? '—'}</span>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col md:pl-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/90 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="hidden text-sm text-slate-500 sm:inline">Console</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/profile">
                <Activity className="mr-1 h-3.5 w-3.5" />
                API key
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              Log out
            </Button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-6">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
