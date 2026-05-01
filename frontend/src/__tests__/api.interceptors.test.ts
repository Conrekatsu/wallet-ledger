import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import api from '../lib/api';
import { useAuthStore } from '../store/auth';

const mockUser = { id: 1, email: 'a@b.com', name: null };

describe('request interceptor', () => {
  it('attaches Bearer token when store has a token', async () => {
    useAuthStore.setState({ token: 'my-token', user: mockUser });

    let received: string | null = null;
    server.use(
      http.get('http://localhost/api/auth/me', ({ request }) => {
        received = request.headers.get('Authorization');
        return HttpResponse.json({ user: mockUser });
      })
    );

    await api.get('/auth/me');
    expect(received).toBe('Bearer my-token');
  });

  it('omits Authorization header when store has no token', async () => {
    let received: string | null = 'sentinel';
    server.use(
      http.get('http://localhost/api/auth/me', ({ request }) => {
        received = request.headers.get('Authorization');
        return HttpResponse.json({ user: mockUser });
      })
    );

    await api.get('/auth/me');
    expect(received).toBeNull();
  });
});

describe('response interceptor', () => {
  it('calls logout when the server returns 401', async () => {
    useAuthStore.setState({ token: 'my-token', user: mockUser });
    server.use(
      http.get('http://localhost/api/auth/me', () => new HttpResponse(null, { status: 401 }))
    );

    await expect(api.get('/auth/me')).rejects.toThrow();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('does NOT logout for non-401 errors', async () => {
    useAuthStore.setState({ token: 'my-token', user: mockUser });
    server.use(
      http.get('http://localhost/api/auth/me', () => new HttpResponse(null, { status: 500 }))
    );

    await expect(api.get('/auth/me')).rejects.toThrow();
    expect(useAuthStore.getState().token).toBe('my-token');
  });
});
