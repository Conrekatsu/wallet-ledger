import '@testing-library/jest-dom';
import { server } from './mocks/server';
import { useAuthStore } from './store/auth';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

afterEach(() => {
  server.resetHandlers();
  useAuthStore.setState({ token: null, user: null });
  localStorage.clear();
});

afterAll(() => server.close());
