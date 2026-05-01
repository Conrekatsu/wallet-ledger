import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { useAuthStore } from '../store/auth';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe('PrivateRoute', () => {
  it('redirects unauthenticated user from / to /login', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders overview for authenticated user at /', () => {
    useAuthStore.setState({ token: 'tok', user: { id: 1, email: 'a@b.com', name: 'Alice' } });
    renderAt('/');
    expect(screen.getByRole('heading', { name: /overview/i })).toBeInTheDocument();
  });

  it('unknown routes redirect to / which then redirects to /login when unauthenticated', () => {
    renderAt('/does-not-exist');
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });
});

describe('public routes', () => {
  it('/login renders LoginPage', () => {
    renderAt('/login');
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });

  it('/register renders RegisterPage', () => {
    renderAt('/register');
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
  });
});
