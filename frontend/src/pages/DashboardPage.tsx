import { useAuthStore } from '../store/auth';

export default function DashboardPage() {
  const { user, logout } = useAuthStore();

  return (
    <div style={{ maxWidth: 600, margin: '80px auto', padding: 24 }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.name ?? user?.email}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
