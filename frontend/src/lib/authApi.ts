import api from './api';
import { AuthResponse, User } from './types';

export async function register(payload: { email: string; password: string; name?: string }) {
  const { data } = await api.post<AuthResponse>('/auth/register', payload);
  return data;
}

export async function login(payload: { email: string; password: string }) {
  const { data } = await api.post<AuthResponse>('/auth/login', payload);
  return data;
}

export async function fetchCurrentUser() {
  const { data } = await api.get<{ user: User }>('/auth/user');
  return data.user;
}
