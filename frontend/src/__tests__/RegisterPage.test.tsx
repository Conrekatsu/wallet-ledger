import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import RegisterPage from '../pages/RegisterPage';
import { useAuthStore } from '../store/auth';

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  );
}

describe('RegisterPage', () => {
  it('renders name, email, password fields and submit button', () => {
    renderPage();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  it('stores token and user in auth store on successful registration', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'new@test.com');
    await user.type(screen.getByLabelText(/password/i), 'pass123');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().token).toBe('mock-token');
      expect(useAuthStore.getState().user?.email).toBe('user@test.com');
    });
  });

  it('shows error message when email is already registered', async () => {
    server.use(
      http.post('http://localhost/api/auth/register', () =>
        HttpResponse.json({ error: 'Email already registered' }, { status: 409 })
      )
    );

    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'taken@test.com');
    await user.type(screen.getByLabelText(/password/i), 'pass123');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument();
    });
  });

  it('shows fallback error on unexpected failure', async () => {
    server.use(
      http.post('http://localhost/api/auth/register', () =>
        new HttpResponse(null, { status: 500 })
      )
    );

    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'pass123');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
    });
  });

  it('has a link to the login page', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /login/i })).toHaveAttribute('href', '/login');
  });
});
