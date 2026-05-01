import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../store/auth';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/register', { email, password, name });
      setAuth(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Registration failed');
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 24 }}>
      <h1>Register</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="reg-name">Name</label>
          <input id="reg-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="reg-email">Email</label>
          <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Register</button>
      </form>
      <p>
        Have account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
