import axios from 'axios';
import { useAuthStore } from '../store/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

// Attach JWT and API key to every request (backend requires x-api-key for non-public /api routes)
api.interceptors.request.use((config) => {
  const { token, apiKey } = useAuthStore.getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (apiKey) config.headers['x-api-key'] = apiKey;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  }
);

export default api;
