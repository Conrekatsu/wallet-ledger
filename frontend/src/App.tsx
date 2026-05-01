import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { AppShell } from './components/layout/AppShell';
import OverviewPage from './pages/app/OverviewPage';
import AccountsPage from './pages/app/AccountsPage';
import TransfersPage from './pages/app/TransfersPage';
import OperationsPage from './pages/app/OperationsPage';
import MetricsPage from './pages/app/MetricsPage';
import AuditTrailPage from './pages/AuditTrailPage';
import ProfilePage from './pages/app/ProfilePage';
import { useAuthStore } from './store/auth';
import { AppToaster } from './components/ui/toaster';

function RequireAuth() {
  const token = useAuthStore((s) => s.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="transfers" element={<TransfersPage />} />
            <Route path="operations" element={<OperationsPage />} />
            <Route path="metrics" element={<MetricsPage />} />
            <Route path="audit" element={<AuditTrailPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AppToaster />
    </>
  );
}
