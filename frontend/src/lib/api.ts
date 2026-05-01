import axios from 'axios';
import { useAuthStore } from '../store/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
