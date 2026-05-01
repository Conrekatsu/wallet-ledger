import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { fetchCurrentUser } from '../../lib/authApi';
import { useAuthStore } from '../../store/auth';
import { getApiErrorMessage } from '../../lib/errors';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

export default function ProfilePage() {
  const { user, token, apiKey, setApiKey, setUser } = useAuthStore();
  const [localKey, setLocalKey] = useState(apiKey ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLocalKey(apiKey ?? '');
  }, [apiKey]);

  async function refreshMe() {
    if (!token) return;
    setBusy(true);
    try {
      const u = await fetchCurrentUser();
      setUser(u);
      toast.success('Profile refreshed from GET /api/auth/user');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load profile'));
    } finally {
      setBusy(false);
    }
  }

  function saveKey() {
    setApiKey(localKey.trim());
    toast.success('API key saved locally for x-api-key requests');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Profile</h1>
        <p className="mt-1 text-sm text-slate-400">
          JWT session and API key used for account, transfer, and metrics endpoints.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session</CardTitle>
          <CardDescription>GET /api/auth/user</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-slate-300">
            <p>
              <span className="text-slate-500">Email:</span> {user?.email ?? '—'}
            </p>
            <p>
              <span className="text-slate-500">Name:</span> {user?.name ?? '—'}
            </p>
            <p className="font-mono text-xs text-slate-500">
              User id: {user?.id != null ? String(user.id) : '—'}
            </p>
          </div>
          <Button variant="outline" onClick={() => void refreshMe()} disabled={busy}>
            Refresh from server
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API key</CardTitle>
          <CardDescription>
            Paste the key shown once at registration, or keep using the key you already stored. Sent as{' '}
            <code className="rounded bg-slate-800 px-1">x-api-key</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API key</Label>
            <Input
              id="api-key"
              type="password"
              autoComplete="off"
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              placeholder="wk_..."
            />
          </div>
          <Button onClick={saveKey}>Save API key</Button>
        </CardContent>
      </Card>
    </div>
  );
}
